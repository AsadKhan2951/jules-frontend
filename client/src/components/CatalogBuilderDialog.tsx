import { useEffect, useMemo, useState } from "react";
import { Check, CheckCircle2, Copy, ExternalLink, ImageIcon, Loader2, MessageCircle, Search, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const PAGE = 60;

type Customer = { id: number; firstName: string; lastName?: string | null; phone?: string | null };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
  /** When set, the dialog edits this catalog instead of creating a new one. */
  catalogId?: number | null;
};

const formatPrice = (value: unknown) => {
  const n = Number(value);
  return value != null && value !== "" && Number.isFinite(n) && n > 0 ? `PKR ${Math.round(n).toLocaleString("en-PK")}` : null;
};

/** Pakistani mobile "0300-1234567" -> "923001234567" for wa.me links. */
export function whatsappNumber(phone?: string | null) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("92")) return digits;
  if (digits.startsWith("0")) return `92${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("3")) return `92${digits}`;
  return digits;
}

export function catalogLink(token: string) {
  return `${window.location.origin}/preview/${token}`;
}

export function CatalogBuilderDialog({ open, onOpenChange, customer, catalogId }: Props) {
  const utils = trpc.useUtils();
  const editing = !!catalogId;
  const customerName = [customer.firstName, customer.lastName].filter(Boolean).join(" ");

  const { data: products, isLoading: productsLoading } = trpc.products.list.useQuery({ isActive: true }, { enabled: open });
  const { data: categories } = trpc.categories.list.useQuery(undefined, { enabled: open });
  const { data: existing } = trpc.catalogs.getById.useQuery({ id: catalogId ?? 0 }, { enabled: open && editing });

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [limit, setLimit] = useState(PAGE);
  const [created, setCreated] = useState<{ name: string; token: string } | null>(null);

  // Reset / load whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    setStep(editing ? 2 : 1);
    setCreated(null);
    setSearch("");
    setCategory("all");
    setLimit(PAGE);
    // Always start clean so a previous session's selection can never be saved by mistake.
    setDescription("");
    setSelected([]);
    if (editing) {
      setName("");
    } else {
      const month = new Date().toLocaleDateString("en-PK", { month: "long", year: "numeric" });
      setName(`${customer.firstName} · ${month}`);
    }
  }, [open, editing, catalogId, customer.firstName]);

  useEffect(() => {
    if (!open || !editing || !existing) return;
    setName(existing.catalog.name ?? "");
    setDescription(existing.catalog.description ?? "");
    setSelected(existing.products.map((row: any) => row.product?.id ?? row.catalogProduct?.productId).filter(Boolean));
  }, [open, editing, existing]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (products ?? []).filter((item: any) => {
      if (category !== "all" && String(item.product.categoryId) !== category) return false;
      if (!term) return true;
      return (
        item.product.name?.toLowerCase().includes(term) ||
        item.product.sku?.toLowerCase().includes(term) ||
        item.category?.name?.toLowerCase().includes(term)
      );
    });
  }, [products, search, category]);

  useEffect(() => setLimit(PAGE), [search, category]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const toggle = (id: number) =>
    setSelected(current => (current.includes(id) ? current.filter(x => x !== id) : [...current, id]));
  const allVisibleSelected = filtered.length > 0 && filtered.every((item: any) => selectedSet.has(item.product.id));
  const toggleAllVisible = () => {
    const ids = filtered.map((item: any) => item.product.id as number);
    setSelected(current =>
      allVisibleSelected ? current.filter(id => !ids.includes(id)) : Array.from(new Set([...current, ...ids]))
    );
  };

  const coverImage = useMemo(() => {
    const first = (products ?? []).find((item: any) => item.product.id === selected[0]);
    return first?.product.primaryImage || undefined;
  }, [products, selected]);

  const onDone = (token: string) => {
    utils.catalogs.invalidate();
    setCreated({ name, token });
  };

  const create = trpc.catalogs.create.useMutation({
    onSuccess: catalog => onDone(catalog.publicToken),
    onError: error => toast.error(error.message || "Could not create the catalog"),
  });
  const update = trpc.catalogs.update.useMutation({
    onSuccess: () => {
      toast.success("Catalog updated");
      utils.catalogs.invalidate();
      onOpenChange(false);
    },
    onError: error => toast.error(error.message || "Could not update the catalog"),
  });

  const submit = () => {
    if (!name.trim()) {
      setStep(1);
      toast.error("Give the catalog a name");
      return;
    }
    if (!selected.length) {
      toast.error("Select at least one product");
      return;
    }
    if (editing && catalogId) {
      if (!existing) return;
      update.mutate({ id: catalogId, name: name.trim(), description, productIds: selected, coverImage });
    } else {
      create.mutate({
        name: name.trim(),
        description: description || undefined,
        customerId: customer.id,
        productIds: selected,
        coverImage,
        status: "published",
        isPublic: true,
      });
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl w-[calc(100%-2rem)] h-[min(88vh,820px)] p-0 gap-0 flex flex-col overflow-hidden bg-card border-border">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border shrink-0">
          <DialogTitle className="text-foreground">
            {created ? "Catalog ready to share" : editing ? "Edit catalog" : `New catalog for ${customerName}`}
          </DialogTitle>
          <DialogDescription>
            {created
              ? `Send this link to ${customer.firstName}. They can like and comment on each piece.`
              : step === 1
                ? "Step 1 of 2 · Name the catalog"
                : `Step 2 of 2 · Choose products · ${selected.length} selected`}
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <SharePanel customer={customer} name={created.name} token={created.token} onClose={() => onOpenChange(false)} />
        ) : step === 1 ? (
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="max-w-xl space-y-5">
              <div className="space-y-2">
                <Label htmlFor="catalog-name">Catalog name</Label>
                <Input id="catalog-name" value={name} onChange={e => setName(e.target.value)} className="h-11 bg-background" autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="catalog-note">Note for the customer (optional)</Label>
                <Textarea
                  id="catalog-note"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. Bridal sets in your budget, as discussed"
                  className="min-h-[96px] bg-background"
                />
              </div>
              <p className="text-xs text-muted-foreground">The first product you select becomes the cover photo.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="px-6 py-3 border-b border-border flex flex-wrap items-center gap-2 shrink-0">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or SKU" className="pl-9 bg-background" />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[190px] bg-background">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories?.map((cat: any) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={toggleAllVisible} disabled={!filtered.length}>
                {allVisibleSelected ? "Clear these" : `Select all ${filtered.length}`}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {productsLoading ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
                  ))}
                </div>
              ) : !filtered.length ? (
                <p className="py-16 text-center text-sm text-muted-foreground">No products match.</p>
              ) : (
                <>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    {filtered.slice(0, limit).map((item: any) => {
                      const on = selectedSet.has(item.product.id);
                      const price = formatPrice(item.product.totalPrice);
                      return (
                        <button
                          type="button"
                          key={item.product.id}
                          onClick={() => toggle(item.product.id)}
                          className={cn(
                            "group relative aspect-square overflow-hidden rounded-xl bg-muted text-left outline-none ring-offset-2 ring-offset-card transition",
                            on ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-border"
                          )}
                        >
                          {item.product.thumbnail || item.product.primaryImage ? (
                            <img
                              src={item.product.thumbnail || item.product.primaryImage}
                              alt={item.product.name}
                              loading="lazy"
                              className={cn("h-full w-full object-cover transition", on && "scale-[0.97]")}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                            </div>
                          )}
                          <span
                            className={cn(
                              "absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 transition",
                              on ? "border-primary bg-primary text-primary-foreground" : "border-white/80 bg-black/20"
                            )}
                          >
                            {on && <Check className="h-3.5 w-3.5" />}
                          </span>
                          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 pb-1.5 pt-5">
                            <span className="block truncate text-[11px] font-medium text-white">{item.product.name}</span>
                            {price && <span className="block text-[10px] text-white/75">{price}</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {filtered.length > limit && (
                    <div className="flex justify-center pt-5">
                      <Button variant="outline" onClick={() => setLimit(value => value + PAGE * 2)}>
                        Show more ({filtered.length - limit} left)
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {!created && (
          <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/30 px-6 py-3 shrink-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {selected.length > 0 && (
                <>
                  <span className="font-medium text-foreground">{selected.length} selected</span>
                  <button type="button" className="inline-flex items-center gap-1 text-xs hover:text-foreground" onClick={() => setSelected([])}>
                    <X className="h-3 w-3" /> clear
                  </button>
                </>
              )}
            </div>
            <div className="flex gap-2">
              {step === 2 ? (
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
              ) : (
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
              )}
              {step === 1 ? (
                <Button
                  className="gold-gradient text-primary-foreground border-0"
                  onClick={() => (name.trim() ? setStep(2) : toast.error("Give the catalog a name"))}
                >
                  Next: choose products
                </Button>
              ) : (
                <Button className="gold-gradient text-primary-foreground border-0 min-w-[150px]" onClick={submit} disabled={busy || (editing && !existing)}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Save changes" : `Create catalog (${selected.length})`}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SharePanel({ customer, name, token, onClose }: { customer: Customer; name: string; token: string; onClose: () => void }) {
  const link = catalogLink(token);
  const wa = whatsappNumber(customer.phone);
  const message = `Assalam o Alaikum ${customer.firstName}, here is your JULES catalog "${name}": ${link}`;
  return (
    <div className="flex-1 overflow-y-auto px-6 py-10">
      <div className="mx-auto max-w-lg text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <h3 className="mt-4 text-lg font-semibold text-foreground">{name}</h3>
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-border bg-background p-2 pl-4">
          <span className="flex-1 truncate text-left text-sm text-muted-foreground">{link}</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              navigator.clipboard.writeText(link).then(() => toast.success("Link copied"));
            }}
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {wa && (
            <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
              <a href={`https://wa.me/${wa}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" /> Send on WhatsApp
              </a>
            </Button>
          )}
          <Button asChild variant="outline">
            <a href={link} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> Open preview
            </a>
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
