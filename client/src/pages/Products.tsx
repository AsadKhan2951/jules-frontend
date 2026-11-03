import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ImageIcon, LayoutGrid, List, Package, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProductDetailDialog } from "@/components/products/ProductDetailDialog";
import { ProductFormDialog } from "@/components/products/ProductFormDialog";
import { formatPKR, productThumb } from "@/components/products/productUtils";
import { karatLabel, type GoldRates } from "@shared/pricing";

/** Render the grid in pages so thousands of products stay fast. */
const PAGE_SIZE = 60;

type Item = { product: any; category: any };

export default function Products() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const [detail, setDetail] = useState<Item | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const utils = trpc.useUtils();
  const { data: products, isLoading } = trpc.products.list.useQuery({
    search: debounced || undefined,
    categoryId: categoryFilter !== "all" ? Number(categoryFilter) : undefined,
    isActive: true,
  });
  const { data: categories } = trpc.categories.list.useQuery();
  const { data: goldPrice } = trpc.goldPrice.getLatest.useQuery();
  const goldRates: GoldRates | null = goldPrice ?? null;

  useEffect(() => setVisible(PAGE_SIZE), [debounced, categoryFilter]);

  // Load the next page when the sentinel scrolls into view.
  const sentinel = useRef<HTMLDivElement>(null);
  const total = products?.length ?? 0;
  useEffect(() => {
    const node = sentinel.current;
    if (!node || visible >= total) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) setVisible(v => Math.min(v + PAGE_SIZE, total));
      },
      { rootMargin: "600px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible, total, viewMode]);

  const shown = useMemo(() => (products ?? []).slice(0, visible), [products, visible]);

  const remove = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Product deleted");
      setDeleteId(null);
      setDetail(null);
      utils.products.invalidate();
      utils.collections.invalidate();
    },
    onError: error => toast.error(error.message || "Could not delete the product"),
  });

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (item: Item) => {
    setDetail(null);
    setEditing(item.product);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "Manage your jewelry inventory" : `${total.toLocaleString()} products · prices follow today's gold rate`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocation("/products/import")}>
            <Upload className="h-4 w-4 mr-2" />
            Import photos
          </Button>
          <Button onClick={openAdd} className="gold-gradient text-primary-foreground border-0">
            <Plus className="h-4 w-4 mr-2" />
            Add product
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name or SKU" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px] bg-card border-border">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories?.map((cat: any) => (
              <SelectItem key={cat.id} value={cat.id.toString()}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 self-start">
          <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("grid")} aria-label="Grid view">
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("list")} aria-label="List view">
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Products */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : !total ? (
        <div className="text-center py-16">
          <Package className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">{debounced || categoryFilter !== "all" ? "No products match" : "No products yet"}</h3>
          <p className="text-muted-foreground mb-4">Add a product, or import your photo folders in one go.</p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => setLocation("/products/import")}>
              <Upload className="h-4 w-4 mr-2" /> Import photos
            </Button>
            <Button onClick={openAdd} className="gold-gradient text-primary-foreground border-0">
              <Plus className="h-4 w-4 mr-2" /> Add product
            </Button>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {shown.map((item: Item) => {
            const thumb = productThumb(item.product);
            return (
              <button
                type="button"
                key={item.product.id}
                onClick={() => setDetail(item)}
                className="group text-left rounded-xl overflow-hidden bg-card border border-border hover:border-primary/40 hover:shadow-md transition"
              >
                <div className="relative aspect-square bg-muted overflow-hidden">
                  {thumb ? (
                    <img src={thumb} alt={item.product.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                    </div>
                  )}
                  {item.product.goldKarat && (
                    <Badge className="absolute left-2 top-2 bg-black/60 text-white border-0 text-[10px] backdrop-blur">
                      {item.product.goldKarat === "white" ? "White gold" : item.product.goldKarat.toUpperCase()}
                    </Badge>
                  )}
                </div>
                <div className="px-3 py-2.5">
                  <p className="truncate text-sm font-medium text-foreground">{item.product.name}</p>
                  <p className="mt-0.5 flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-muted-foreground">{item.product.sku || item.category?.name || "—"}</span>
                    <span className="shrink-0 tabular-nums font-medium text-primary">{item.product.totalPrice ? formatPKR(item.product.totalPrice) : ""}</span>
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Product</TableHead>
                  <TableHead className="text-muted-foreground">SKU</TableHead>
                  <TableHead className="text-muted-foreground">Category</TableHead>
                  <TableHead className="text-muted-foreground">Gold</TableHead>
                  <TableHead className="text-muted-foreground text-right">Price today</TableHead>
                  <TableHead className="text-muted-foreground text-right w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((item: Item) => {
                  const thumb = productThumb(item.product);
                  return (
                    <TableRow key={item.product.id} className="border-border hover:bg-muted/30 cursor-pointer" onClick={() => setDetail(item)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {thumb ? (
                            <img src={thumb} alt="" loading="lazy" className="w-11 h-11 rounded-lg object-cover" />
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center">
                              <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <p className="font-medium text-foreground">{item.product.name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">{item.product.sku || "—"}</TableCell>
                      <TableCell>{item.category ? <Badge variant="secondary">{item.category.name}</Badge> : "—"}</TableCell>
                      <TableCell className="text-sm">
                        {item.product.goldWeight ? `${item.product.goldWeight} tola · ` : ""}
                        {item.product.goldKarat ? karatLabel(item.product.goldKarat, goldRates?.whiteGoldKarat) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-foreground">{item.product.totalPrice ? formatPKR(item.product.totalPrice) : "—"}</TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)} aria-label="Edit">
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(item.product.id)} aria-label="Delete">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {visible < total && (
        <div ref={sentinel} className="flex justify-center py-4 text-sm text-muted-foreground">
          Showing {visible.toLocaleString()} of {total.toLocaleString()}…
        </div>
      )}

      <ProductDetailDialog
        item={detail}
        goldRates={goldRates}
        open={!!detail}
        onOpenChange={open => !open && setDetail(null)}
        onEdit={openEdit}
        onDelete={id => setDeleteId(id)}
      />

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} product={editing} categories={categories} goldRates={goldRates} />

      <AlertDialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete product?</AlertDialogTitle>
            <AlertDialogDescription>It will also be removed from collections and catalogs. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => deleteId !== null && remove.mutate({ id: deleteId })}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
