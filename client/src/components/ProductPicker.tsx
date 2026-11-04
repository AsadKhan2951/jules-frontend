import { useEffect, useState } from "react";
import { ImageIcon, Loader2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

export type PickedProduct = { id: number; name: string; sku: string | null; category: string | null; thumbnail: string | null; image: string | null };

/** Search the catalogue and pick one piece (used to put a product's picture on an order item). */
export function ProductPicker({
  open,
  onOpenChange,
  onPick,
  title = "Pick from catalogue",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (product: PickedProduct) => void;
  title?: string;
}) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const products = trpc.products.pick.useQuery({ search: query || undefined, limit: 60 }, { enabled: open });
  const list = (products.data ?? []) as PickedProduct[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-3">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Search by name or SKU, then click the piece.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="e.g. emerald earrings, SKU…" className="pl-9" />
        </div>
        <div className="min-h-[240px]">
          {products.isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : list.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No products found.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {list.map(product => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => {
                    onPick(product);
                    onOpenChange(false);
                  }}
                  className="group overflow-hidden rounded-lg border border-border text-left transition hover:border-primary/60"
                >
                  <div className="aspect-square bg-muted">
                    {product.thumbnail ? (
                      <img src={product.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
                    ) : (
                      <div className="flex h-full items-center justify-center"><ImageIcon className="h-6 w-6 text-muted-foreground" /></div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="truncate text-sm font-medium text-foreground">{product.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{[product.category, product.sku].filter(Boolean).join(" · ") || " "}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ProductPicker;
