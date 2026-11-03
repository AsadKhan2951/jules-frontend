import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUploader } from "@/components/ImageUploader";
import { cn } from "@/lib/utils";
import { calculateProductPrice, karatLabel, rateForKarat, type GoldRates } from "@shared/pricing";
import { formatPKR, productImages } from "./productUtils";

type Karat = "22k" | "24k" | "white";

type FormState = {
  name: string;
  sku: string;
  description: string;
  categoryId: number | null;
  goldKarat: Karat | null;
  goldWeight: string;
  goldWastage: string;
  makingCharges: string;
  makingChargesType: "fixed" | "per_gram";
  diamondWeight: string;
  diamondRate: string;
  stoneType: string;
  stoneWeight: string;
  stoneRate: string;
  images: string[];
};

const EMPTY: FormState = {
  name: "",
  sku: "",
  description: "",
  categoryId: null,
  goldKarat: null,
  goldWeight: "",
  goldWastage: "",
  makingCharges: "",
  makingChargesType: "fixed",
  diamondWeight: "",
  diamondRate: "",
  stoneType: "",
  stoneWeight: "",
  stoneRate: "",
  images: [],
};

/** Numbers come back from MongoDB as numbers; the form works with strings. */
const str = (value: unknown) => (value === null || value === undefined ? "" : String(value));
const numOnly = (value: string) => value.replace(/[^\d.]/g, "");

function fromProduct(product: any): FormState {
  return {
    name: str(product.name),
    sku: str(product.sku),
    description: str(product.description),
    categoryId: product.categoryId ?? null,
    goldKarat: product.goldKarat ?? null,
    goldWeight: str(product.goldWeight),
    goldWastage: str(product.goldWastage),
    makingCharges: str(product.makingCharges),
    makingChargesType: product.makingChargesType === "per_gram" ? "per_gram" : "fixed",
    diamondWeight: str(product.diamondWeight),
    diamondRate: str(product.diamondRate),
    stoneType: str(product.stoneType),
    stoneWeight: str(product.stoneWeight),
    stoneRate: str(product.stoneRate),
    images: productImages(product),
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Product to edit, or null to add a new one. */
  product: any | null;
  categories: Array<{ id: number; name: string }> | undefined;
  goldRates: GoldRates | null | undefined;
};

export function ProductFormDialog({ open, onOpenChange, product, categories, goldRates }: Props) {
  const utils = trpc.useUtils();
  const editing = !!product;
  const [form, setForm] = useState<FormState>(EMPTY);

  useEffect(() => {
    if (open) setForm(product ? fromProduct(product) : EMPTY);
  }, [open, product]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(current => ({ ...current, [key]: value }));

  const price = useMemo(
    () =>
      calculateProductPrice(
        {
          goldKarat: form.goldKarat,
          goldWeight: form.goldWeight,
          makingCharges: form.makingCharges,
          makingChargesType: form.makingChargesType,
          diamondWeight: form.diamondWeight,
          diamondRate: form.diamondRate,
          // Older products may only have a stored total; the server keeps it until weight × rate is entered.
          diamondPrice: form.diamondWeight && form.diamondRate ? null : product?.diamondPrice,
          stoneWeight: form.stoneWeight,
          stoneRate: form.stoneRate,
          stonePrice: form.stoneWeight && form.stoneRate ? null : product?.stonePrice,
        },
        goldRates
      ),
    [form, goldRates, product]
  );
  const todayRate = rateForKarat(form.goldKarat, goldRates);

  const done = (message: string) => {
    toast.success(message);
    utils.products.invalidate();
    utils.collections.invalidate();
    onOpenChange(false);
  };
  const create = trpc.products.create.useMutation({
    onSuccess: () => done("Product added"),
    onError: error => toast.error(error.message || "Could not add the product"),
  });
  const update = trpc.products.update.useMutation({
    onSuccess: () => done("Product updated"),
    onError: error => toast.error(error.message || "Could not update the product"),
  });
  const busy = create.isPending || update.isPending;

  const submit = () => {
    if (!form.name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (form.goldKarat === "white" && !goldRates?.whiteGoldPrice) {
      toast.warning("Set today's white gold rate on the Dashboard so this product can be priced.");
    }
    const [primaryImage, ...rest] = form.images;
    // Empty strings clear a value on the server; the server calculates the price.
    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      description: form.description.trim(),
      goldKarat: form.goldKarat ?? undefined,
      goldWeight: form.goldWeight,
      goldWastage: form.goldWastage,
      makingCharges: form.makingCharges,
      makingChargesType: form.makingChargesType,
      diamondWeight: form.diamondWeight,
      diamondRate: form.diamondRate,
      // A stored total is replaced by weight × rate once both are entered.
      diamondPrice: form.diamondWeight && form.diamondRate ? "" : undefined,
      stoneType: form.stoneType.trim(),
      stoneWeight: form.stoneWeight,
      stoneRate: form.stoneRate,
      stonePrice: form.stoneWeight && form.stoneRate ? "" : undefined,
      primaryImage: primaryImage ?? "",
      images: rest.join(","),
    };
    if (editing) {
      const thumbnailStillValid = primaryImage && primaryImage === product.primaryImage;
      update.mutate({
        id: product.id,
        ...payload,
        categoryId: form.categoryId,
        goldKarat: form.goldKarat,
        thumbnail: thumbnailStillValid ? undefined : "",
      });
    } else {
      create.mutate({
        ...payload,
        categoryId: form.categoryId ?? undefined,
        goldRateAtOrder: todayRate ?? undefined,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl w-[calc(100%-2rem)] h-[min(90vh,860px)] p-0 gap-0 flex flex-col overflow-hidden bg-card border-border">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border shrink-0">
          <DialogTitle className="text-foreground">{editing ? "Edit product" : "Add product"}</DialogTitle>
          <DialogDescription>The price is calculated from today's gold rate and updates automatically when the rate changes.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            {/* Main fields */}
            <div className="space-y-6">
              <Section title="Basic details">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
                  <Field label="Product name" required>
                    <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Diamond Ring" className="bg-background" autoFocus={!editing} />
                  </Field>
                  <Field label="SKU">
                    <Input value={form.sku} onChange={e => set("sku", e.target.value)} placeholder="e.g. DR-0001" className="bg-background font-mono" />
                  </Field>
                </div>
                <Field label="Category">
                  <Select value={form.categoryId ? String(form.categoryId) : "none"} onValueChange={value => set("categoryId", value === "none" ? null : Number(value))}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No category</SelectItem>
                      {categories?.map(category => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Description">
                  <Textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Design, occasion, finish…" className="min-h-[72px] bg-background" />
                </Field>
              </Section>

              <Section title="Gold">
                <Field label="Gold type">
                  <div className="grid grid-cols-3 gap-2">
                    {(["22k", "24k", "white"] as Karat[]).map(karat => (
                      <button
                        key={karat}
                        type="button"
                        onClick={() => set("goldKarat", form.goldKarat === karat ? null : karat)}
                        className={cn(
                          "rounded-lg border px-3 py-2.5 text-left text-sm transition",
                          form.goldKarat === karat ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <span className="block font-medium">{karatLabel(karat, goldRates?.whiteGoldKarat)}</span>
                        <span className="block text-[11px] tabular-nums opacity-80">
                          {rateForKarat(karat, goldRates) ? `${formatPKR(rateForKarat(karat, goldRates))}/tola` : "rate not set"}
                        </span>
                      </button>
                    ))}
                  </div>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Weight incl. wastage">
                    <UnitInput value={form.goldWeight} onChange={v => set("goldWeight", v)} unit="tola" placeholder="1.250" />
                  </Field>
                  <Field label="Wastage" hint="For records — already included in the weight">
                    <UnitInput value={form.goldWastage} onChange={v => set("goldWastage", v)} unit="%" placeholder="5" />
                  </Field>
                </div>
              </Section>

              <Section title="Making charges">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
                  <Field label="Amount">
                    <UnitInput
                      value={form.makingCharges}
                      onChange={v => set("makingCharges", v)}
                      prefix="PKR"
                      unit={form.makingChargesType === "per_gram" ? "/ gram" : undefined}
                      placeholder="25000"
                    />
                  </Field>
                  <Field label="Charged as">
                    <Select value={form.makingChargesType} onValueChange={value => set("makingChargesType", value as FormState["makingChargesType"])}>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed amount</SelectItem>
                        <SelectItem value="per_gram">Per gram of gold</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </Section>

              <Section title="Diamonds">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Total weight">
                    <UnitInput value={form.diamondWeight} onChange={v => set("diamondWeight", v)} unit="ct" placeholder="0.50" />
                  </Field>
                  <Field label="Rate">
                    <UnitInput value={form.diamondRate} onChange={v => set("diamondRate", v)} prefix="PKR" unit="/ ct" placeholder="150000" />
                  </Field>
                </div>
              </Section>

              <Section title="Coloured stones">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Stone">
                    <Input value={form.stoneType} onChange={e => set("stoneType", e.target.value)} placeholder="Emerald, ruby…" className="bg-background" />
                  </Field>
                  <Field label="Weight">
                    <UnitInput value={form.stoneWeight} onChange={v => set("stoneWeight", v)} unit="ct" placeholder="2.0" />
                  </Field>
                  <Field label="Rate">
                    <UnitInput value={form.stoneRate} onChange={v => set("stoneRate", v)} prefix="PKR" unit="/ ct" placeholder="20000" />
                  </Field>
                </div>
              </Section>
            </div>

            {/* Side: photos + live price */}
            <aside className="space-y-6 lg:sticky lg:top-0 lg:self-start">
              <Section title="Photos">
                <ImageUploader images={form.images} onChange={images => set("images", images)} />
                <p className="text-xs text-muted-foreground">The first photo is the cover.</p>
              </Section>

              <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Price today</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-primary">{price.total ? formatPKR(price.total) : "—"}</p>
                <dl className="mt-3 space-y-1.5 border-t border-primary/15 pt-3 text-sm">
                  <Row label="Gold" value={price.goldValue} />
                  <Row label="Making" value={price.making} />
                  <Row label="Diamonds" value={price.diamonds} />
                  <Row label="Stones" value={price.stones} />
                </dl>
                {form.goldKarat && !todayRate && (
                  <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">Today's {karatLabel(form.goldKarat)} rate is not set yet.</p>
                )}
              </div>
            </aside>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-6 py-3 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy} className="gold-gradient text-primary-foreground border-0 min-w-[130px]">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Save changes" : "Add product"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function UnitInput({
  value,
  onChange,
  unit,
  prefix,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  prefix?: string;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      {prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span>}
      <Input
        inputMode="decimal"
        value={value}
        onChange={e => onChange(numOnly(e.target.value))}
        placeholder={placeholder}
        className={cn("bg-background tabular-nums", prefix && "pl-11", unit && "pr-14")}
      />
      {unit && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{unit}</span>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("tabular-nums", value > 0 ? "text-foreground" : "text-muted-foreground/60")}>{value > 0 ? formatPKR(value) : "—"}</dd>
    </div>
  );
}
