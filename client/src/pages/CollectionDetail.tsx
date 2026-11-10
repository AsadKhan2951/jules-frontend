import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  ArrowLeft,
  ArrowLeftRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  ImageIcon,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  Search,
  SquareCheck,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { calculateProductPrice, toNumber, type GoldRates } from "@shared/pricing";
import { ProductDetailDialog } from "@/components/products/ProductDetailDialog";
import { ProductFormDialog } from "@/components/products/ProductFormDialog";
import { formatPKR } from "@/components/products/productUtils";
import { AddToCatalogDialog } from "@/components/AddToCatalogDialog";

type SortKey = "manual" | "newest" | "oldest" | "name_asc" | "name_desc";
const SORTS: Array<{ value: SortKey; label: string }> = [
  { value: "manual", label: "Manual order" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
];
const SORT_STORE = "jules.collectionSort";
const readSort = (): SortKey => {
  try {
    const value = localStorage.getItem(SORT_STORE) as SortKey | null;
    return value && SORTS.some(sort => sort.value === value) ? value : "manual";
  } catch {
    return "manual";
  }
};
const time = (value: unknown) => (value ? new Date(value as string).getTime() || 0 : 0);

export default function CollectionDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const collectionId = parseInt(params.id || "0");
  const utils = trpc.useUtils();

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<SortKey>(readSort);
  const [mode, setMode] = useState<"view" | "select" | "arrange">("view");
  const [selected, setSelected] = useState<number[]>([]);
  const [order, setOrder] = useState<number[]>([]); // product ids while arranging
  const [dragging, setDragging] = useState<number | null>(null);
  const [viewing, setViewing] = useState<{ product: any; category: any } | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [showAddProducts, setShowAddProducts] = useState(false);

  const { data: collection, isLoading } = trpc.collections.getById.useQuery({ id: collectionId }, { enabled: !!collectionId });
  const { data: goldPrice } = trpc.goldPrice.getLatest.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();
  const goldRates: GoldRates | null = goldPrice ?? null;

  useEffect(() => {
    try {
      localStorage.setItem(SORT_STORE, sort);
    } catch {
      // storage unavailable
    }
  }, [sort]);

  const refresh = () => Promise.all([utils.collections.getById.invalidate({ id: collectionId }), utils.collections.list.invalidate()]);

  const reorder = trpc.collections.reorder.useMutation({
    onSuccess: async () => {
      toast.success("Order saved");
      setMode("view");
      await refresh();
    },
    onError: error => toast.error(error.message),
  });
  const removeProducts = trpc.collections.removeProducts.useMutation({
    onSuccess: async (_, input) => {
      toast.success(`${input.productIds.length} removed from the collection`);
      setSelected([]);
      setMode("view");
      await refresh();
    },
    onError: error => toast.error(error.message),
  });
  const deleteProduct = trpc.products.delete.useMutation({
    onSuccess: async () => {
      toast.success("Product deleted");
      setViewing(null);
      await Promise.all([refresh(), utils.products.list.invalidate()]);
    },
    onError: error => toast.error(error.message),
  });

  const items = useMemo(() => ((collection?.products ?? []) as any[]).filter(item => item.product), [collection]);
  const byId = useMemo(() => new Map(items.map(item => [item.product.id as number, item])), [items]);

  const shown = useMemo(() => {
    if (mode === "arrange") return order.map(id => byId.get(id)).filter(Boolean) as any[];
    const needle = search.trim().toLowerCase();
    const list = items.filter(
      item => !needle || item.product.name?.toLowerCase().includes(needle) || item.product.sku?.toLowerCase().includes(needle)
    );
    const name = (item: any) => String(item.product.name ?? "");
    const sorted = [...list];
    if (sort === "newest") sorted.sort((a, b) => time(b.product.createdAt) - time(a.product.createdAt) || b.product.id - a.product.id);
    if (sort === "oldest") sorted.sort((a, b) => time(a.product.createdAt) - time(b.product.createdAt) || a.product.id - b.product.id);
    if (sort === "name_asc") sorted.sort((a, b) => name(a).localeCompare(name(b), undefined, { numeric: true }));
    if (sort === "name_desc") sorted.sort((a, b) => name(b).localeCompare(name(a), undefined, { numeric: true }));
    return sorted; // "manual" keeps the saved order from the server
  }, [items, byId, search, sort, mode, order]);

  const priceOf = (product: any) => calculateProductPrice(product, goldRates).total ?? toNumber(product.totalPrice);

  const startArrange = () => {
    setSort("manual");
    setSearch("");
    setOrder(items.map(item => item.product.id));
    setMode("arrange");
  };
  const move = (from: number, to: number) =>
    setOrder(current => {
      if (to < 0 || to >= current.length || from === to) return current;
      const next = [...current];
      const [id] = next.splice(from, 1);
      next.splice(to, 0, id!);
      return next;
    });

  const toggle = (id: number) => setSelected(current => (current.includes(id) ? current.filter(item => item !== id) : [...current, id]));
  const allShownSelected = shown.length > 0 && shown.every(item => selected.includes(item.product.id));

  const onCardClick = (item: any) => {
    if (mode === "select") toggle(item.product.id);
    else if (mode === "view") setViewing({ product: item.product, category: item.category });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="h-10 w-64 rounded shimmer" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {[...Array(10)].map((_, i) => <div key={i} className="aspect-square rounded-xl shimmer" />)}
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h3 className="mb-2 text-lg font-medium text-foreground">Collection not found</h3>
        <Button onClick={() => setLocation("/collections")} variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back to Collections</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fadeIn pb-24">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/collections")} className="h-10 w-10 rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{collection.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{items.length} items</p>
          </div>
        </div>
        {mode === "view" && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setMode("select")}><SquareCheck className="mr-2 h-4 w-4" />Select</Button>
            <Button variant="outline" onClick={startArrange} disabled={items.length < 2}><ArrowLeftRight className="mr-2 h-4 w-4" />Arrange</Button>
            <Button onClick={() => setShowAddProducts(true)} className="gold-gradient text-primary-foreground border-0"><Plus className="mr-2 h-4 w-4" />Add Products</Button>
          </div>
        )}
      </div>

      {collection.description && <p className="text-muted-foreground">{collection.description}</p>}

      {/* Toolbar */}
      {mode === "arrange" ? (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground">
            <GripVertical className="mr-1 inline h-4 w-4 text-primary" />
            Drag photos to arrange them (or use the arrows). This order is used when “Manual order” is chosen.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setMode("view")}>Cancel</Button>
            <Button onClick={() => reorder.mutate({ collectionId, productIds: order })} disabled={reorder.isPending} className="gold-gradient text-primary-foreground border-0">
              {reorder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save order
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="border-border bg-card pl-9" />
          </div>
          <Select value={sort} onValueChange={value => setSort(value as SortKey)}>
            <SelectTrigger className="bg-card sm:w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>{SORTS.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            <Button variant="ghost" size="icon" className={cn("h-8 w-8", viewMode === "grid" && "bg-muted")} onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className={cn("h-8 w-8", viewMode === "list" && "bg-muted")} onClick={() => setViewMode("list")}><List className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Products */}
      {shown.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ImageIcon className="mb-4 h-10 w-10 text-muted-foreground" />
          <h3 className="mb-1 text-lg font-medium text-foreground">{items.length ? "No products match your search" : "No products in this collection"}</h3>
          {!items.length && (
            <Button onClick={() => setShowAddProducts(true)} className="mt-3 gold-gradient text-primary-foreground border-0"><Plus className="mr-2 h-4 w-4" />Add Products</Button>
          )}
        </div>
      ) : viewMode === "grid" || mode === "arrange" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {shown.map((item: any, index: number) => {
            const id = item.product.id as number;
            const isSelected = selected.includes(id);
            const price = priceOf(item.product);
            return (
              <div
                key={id}
                role="button"
                tabIndex={0}
                onClick={() => onCardClick(item)}
                onKeyDown={event => event.key === "Enter" && onCardClick(item)}
                draggable={mode === "arrange"}
                onDragStart={() => setDragging(index)}
                onDragOver={event => {
                  if (mode !== "arrange" || dragging === null) return;
                  event.preventDefault();
                  if (dragging !== index) {
                    move(dragging, index);
                    setDragging(index);
                  }
                }}
                onDragEnd={() => setDragging(null)}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-xl bg-card outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary",
                  mode === "arrange" ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                  dragging === index && "opacity-40",
                  isSelected && "ring-2 ring-primary"
                )}
              >
                {item.product.primaryImage || item.product.thumbnail ? (
                  <img src={item.product.thumbnail || item.product.primaryImage} loading="lazy" alt={item.product.name} draggable={false} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted"><ImageIcon className="h-12 w-12 text-muted-foreground/50" /></div>
                )}

                {/* Name + price */}
                <div className={cn(
                  "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 pt-8 transition-opacity",
                  mode === "view" ? "opacity-0 group-hover:opacity-100" : "opacity-100"
                )}>
                  <p className="truncate text-sm font-medium text-white">{item.product.name}</p>
                  <p className="mt-0.5 text-xs text-white/75">{price ? formatPKR(price) : item.product.sku || ""}</p>
                </div>

                {mode === "select" && (
                  <span className={cn(
                    "absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-md border-2",
                    isSelected ? "border-primary bg-primary" : "border-white/80 bg-black/30"
                  )}>
                    {isSelected && <Check className="h-4 w-4 text-primary-foreground" />}
                  </span>
                )}
                {mode === "arrange" && (
                  <>
                    <span className="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-xs font-medium text-white">{index + 1}</span>
                    <div className="absolute right-2 top-2 flex gap-1">
                      <ArrowButton label="Move earlier" onClick={() => move(index, index - 1)} disabled={index === 0}><ChevronLeft className="h-4 w-4" /></ArrowButton>
                      <ArrowButton label="Move later" onClick={() => move(index, index + 1)} disabled={index === shown.length - 1}><ChevronRight className="h-4 w-4" /></ArrowButton>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {mode === "select" && <th className="w-10 p-4" />}
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Product</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">SKU</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Category</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Added</th>
                  <th className="p-4 text-right text-sm font-medium text-muted-foreground">Price today</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((item: any) => {
                  const id = item.product.id as number;
                  const price = priceOf(item.product);
                  return (
                    <tr key={id} onClick={() => onCardClick(item)} className={cn("cursor-pointer border-b border-border last:border-0 hover:bg-muted/30", selected.includes(id) && mode === "select" && "bg-primary/5")}>
                      {mode === "select" && (
                        <td className="p-4">
                          <span className={cn("flex h-5 w-5 items-center justify-center rounded border-2", selected.includes(id) ? "border-primary bg-primary" : "border-muted-foreground/40")}>
                            {selected.includes(id) && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                          </span>
                        </td>
                      )}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {item.product.primaryImage || item.product.thumbnail ? (
                            <img src={item.product.thumbnail || item.product.primaryImage} loading="lazy" alt={item.product.name} className="h-12 w-12 rounded-lg object-cover" />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted"><ImageIcon className="h-5 w-5 text-muted-foreground" /></div>
                          )}
                          <p className="font-medium text-foreground">{item.product.name}</p>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">{item.product.sku || "-"}</td>
                      <td className="p-4">{item.category ? <span className="rounded bg-muted px-2 py-1 text-xs text-foreground">{item.category.name}</span> : "-"}</td>
                      <td className="p-4 text-sm text-muted-foreground">{item.product.createdAt ? new Date(item.product.createdAt).toLocaleDateString("en-GB") : "-"}</td>
                      <td className="p-4 text-right font-medium text-foreground">{price ? formatPKR(price) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selection bar */}
      {mode === "select" && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <div className="flex w-full max-w-3xl flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur">
            <Button variant="ghost" size="icon" onClick={() => { setMode("view"); setSelected([]); }} aria-label="Done"><X className="h-4 w-4" /></Button>
            <span className="text-sm font-medium text-foreground">{selected.length} selected</span>
            <Button variant="ghost" size="sm" onClick={() => setSelected(allShownSelected ? [] : shown.map(item => item.product.id))}>
              {allShownSelected ? "Clear" : `Select all ${shown.length}`}
            </Button>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={!selected.length || removeProducts.isPending}
                onClick={() => {
                  if (window.confirm(`Remove ${selected.length} product(s) from "${collection.name}"? The products themselves are not deleted.`)) {
                    removeProducts.mutate({ collectionId, productIds: selected });
                  }
                }}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />Remove from collection
              </Button>
              <Button size="sm" disabled={!selected.length} onClick={() => setCatalogOpen(true)} className="gold-gradient text-primary-foreground border-0">
                <BookOpen className="mr-1.5 h-4 w-4" />Add to customer catalog
              </Button>
            </div>
          </div>
        </div>
      )}

      <ProductDetailDialog
        item={viewing}
        goldRates={goldRates}
        open={!!viewing}
        onOpenChange={open => !open && setViewing(null)}
        onEdit={item => {
          setViewing(null);
          setEditing(item.product);
          setFormOpen(true);
        }}
        onDelete={id => {
          if (window.confirm("Delete this product everywhere (all collections and catalogs)?")) deleteProduct.mutate({ id });
        }}
      />
      <ProductFormDialog
        open={formOpen}
        onOpenChange={open => {
          setFormOpen(open);
          if (!open) refresh();
        }}
        product={editing}
        categories={categories}
        goldRates={goldRates}
      />
      <AddToCatalogDialog
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
        productIds={selected}
        suggestedName={collection.name}
        onDone={() => {
          setSelected([]);
          setMode("view");
        }}
      />
      <AddProductsDialog
        open={showAddProducts}
        onOpenChange={setShowAddProducts}
        collectionId={collectionId}
        collectionName={collection.name}
        existing={new Set(items.map(item => item.product.id))}
        onAdded={refresh}
      />
    </div>
  );
}

function ArrowButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={event => {
        event.stopPropagation();
        onClick();
      }}
      className="flex h-7 w-7 items-center justify-center rounded-md bg-black/60 text-white transition hover:bg-black/80 disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/** Pick catalogue products to add (searchable; adding never removes what is already there). */
function AddProductsDialog({
  open,
  onOpenChange,
  collectionId,
  collectionName,
  existing,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: number;
  collectionName: string;
  existing: Set<number>;
  onAdded: () => void;
}) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<number[]>([]);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (!open) {
      setSearch("");
      setPicked([]);
    }
  }, [open]);

  const products = trpc.products.pick.useQuery({ search: query || undefined, limit: 100 }, { enabled: open });
  const list = ((products.data ?? []) as any[]).filter(product => !existing.has(product.id));
  const add = trpc.collections.addProducts.useMutation({
    onSuccess: () => {
      toast.success(`${picked.length} product(s) added to ${collectionName}`);
      onAdded();
      onOpenChange(false);
    },
    onError: error => toast.error(error.message || "Could not add products"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-3 border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add products to {collectionName}</DialogTitle>
          <DialogDescription>Search the catalogue and click products to select them. Products already here are hidden.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or SKU" className="pl-9" />
        </div>
        <div className="min-h-[280px]">
          {products.isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : list.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No products to add.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {list.map(product => {
                const on = picked.includes(product.id);
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => setPicked(current => (on ? current.filter(id => id !== product.id) : [...current, product.id]))}
                    className={cn("overflow-hidden rounded-lg border-2 text-left transition", on ? "border-primary" : "border-transparent hover:border-muted-foreground/30")}
                  >
                    <div className="relative aspect-square bg-muted">
                      {product.thumbnail ? <img src={product.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" /> : <ImageIcon className="m-auto h-6 w-6 text-muted-foreground" />}
                      {on && <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary"><Check className="h-3.5 w-3.5 text-primary-foreground" /></span>}
                    </div>
                    <p className="truncate px-1.5 py-1 text-xs text-foreground">{product.name}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-sm text-muted-foreground">{picked.length} selected</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => add.mutate({ collectionId, productIds: picked })} disabled={!picked.length || add.isPending} className="gold-gradient text-primary-foreground border-0">
              {add.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add {picked.length || ""} products
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
