import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, ExternalLink, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { catalogLink } from "@/components/CatalogBuilderDialog";

type Customer = { id: number; firstName?: string | null; lastName?: string | null; phone?: string | null };
const customerName = (customer: Customer) => `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() || `Customer ${customer.id}`;

/**
 * Put selected products straight into a customer's catalog: pick the customer,
 * then one of their catalogs or a new one. Products already in the catalog are skipped.
 */
export function AddToCatalogDialog({
  open,
  onOpenChange,
  productIds,
  suggestedName,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productIds: number[];
  suggestedName?: string;
  onDone?: () => void;
}) {
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [target, setTarget] = useState<number | "new">("new");
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setCustomer(null);
    setTarget("new");
    setNewName(suggestedName ?? "");
  }, [open, suggestedName]);

  const customers = trpc.customers.list.useQuery(undefined, { enabled: open });
  const catalogs = trpc.catalogs.list.useQuery({ customerId: customer?.id ?? 0 }, { enabled: open && !!customer });

  // Default to the customer's latest catalog when they have one.
  useEffect(() => {
    const list = catalogs.data as any[] | undefined;
    if (customer && list) setTarget(list.length ? list[0].id : "new");
  }, [customer, catalogs.data]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const list = ((customers.data ?? []) as Customer[]).filter(item =>
      !needle || [customerName(item), item.phone, `cs ${item.id}`].some(value => String(value ?? "").toLowerCase().includes(needle))
    );
    return list.slice(0, 60);
  }, [customers.data, search]);

  const finish = async (message: string, catalog: { id: number; publicToken?: string | null }) => {
    await utils.catalogs.invalidate();
    toast.success(message, {
      action: catalog.publicToken ? { label: "Open", onClick: () => window.open(catalogLink(catalog.publicToken!), "_blank") } : undefined,
    });
    onDone?.();
    onOpenChange(false);
  };
  const add = trpc.catalogs.addProducts.useMutation({
    onError: error => toast.error(error.message),
  });
  const create = trpc.catalogs.create.useMutation({
    onError: error => toast.error(error.message),
  });
  const busy = add.isPending || create.isPending;

  const submit = async () => {
    if (!customer) return toast.error("Choose a customer");
    if (target === "new") {
      if (!newName.trim()) return toast.error("Give the new catalog a name");
      const catalog = await create.mutateAsync({
        name: newName.trim(),
        customerId: customer.id,
        productIds,
        coverImage: undefined,
        status: "published",
        isPublic: true,
      });
      return finish(`Catalog "${newName.trim()}" created for ${customerName(customer)} with ${productIds.length} products`, catalog);
    }
    const catalog = ((catalogs.data ?? []) as any[]).find(item => item.id === target);
    const result = await add.mutateAsync({ catalogId: target, productIds });
    const skipped = result.skipped ? ` (${result.skipped} already there)` : "";
    return finish(`${result.added} products added to "${catalog?.name ?? "catalog"}"${skipped}`, catalog ?? { id: target });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" />Add to customer catalog</DialogTitle>
          <DialogDescription>{productIds.length} product{productIds.length === 1 ? "" : "s"} selected. Choose the customer, then their catalog.</DialogDescription>
        </DialogHeader>

        {/* Step 1: customer */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Customer</Label>
          {customer ? (
            <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/5 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-foreground">{customerName(customer)}</p>
                <p className="text-xs text-muted-foreground">CS {String(customer.id).padStart(6, "0")}{customer.phone ? ` · ${customer.phone}` : ""}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCustomer(null)}>Change</Button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, phone or CS number" className="pl-9" />
              </div>
              <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
                {customers.isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : filtered.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No customer found.</p>
                ) : (
                  filtered.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCustomer(item)}
                      className="flex w-full items-center justify-between border-b border-border/60 px-3 py-2 text-left last:border-0 hover:bg-muted/40"
                    >
                      <span className="text-sm text-foreground">{customerName(item)}</span>
                      <span className="text-xs text-muted-foreground">{item.phone || `CS ${String(item.id).padStart(6, "0")}`}</span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Step 2: catalog */}
        {customer && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Catalog</Label>
            {catalogs.isLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="space-y-1.5">
                {((catalogs.data ?? []) as any[]).map(catalog => (
                  <Choice key={catalog.id} active={target === catalog.id} onClick={() => setTarget(catalog.id)}>
                    <span className="truncate">{catalog.name}</span>
                    <span className="ml-auto shrink-0 text-xs capitalize text-muted-foreground">{catalog.status}</span>
                  </Choice>
                ))}
                <Choice active={target === "new"} onClick={() => setTarget("new")}>
                  <Plus className="h-4 w-4 text-primary" /> New catalog
                </Choice>
                {target === "new" && (
                  <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Catalog name, e.g. Bridal sets for Mrs. Khan" className="mt-1" />
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
          {customer ? (
            <Button variant="ghost" size="sm" onClick={() => setLocation(`/customers/${customer.id}`)}>
              <ExternalLink className="mr-1.5 h-4 w-4" /> Customer page
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={submit} disabled={busy || !customer || !productIds.length} className="gold-gradient text-primary-foreground border-0">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {target === "new" ? "Create catalog" : "Add to catalog"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition",
        active ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
      )}
    >
      <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded-full border", active ? "border-primary bg-primary" : "border-muted-foreground/40")}>
        {active && <Check className="h-3 w-3 text-primary-foreground" />}
      </span>
      {children}
    </button>
  );
}

export default AddToCatalogDialog;
