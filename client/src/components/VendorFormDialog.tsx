import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

export const VENDOR_ROLES = [
  { value: "body_making", label: "Body Making" },
  { value: "stringing", label: "Stringing" },
  { value: "stone_making", label: "Stone Making" },
  { value: "stone_setting", label: "Stone Setting" },
  { value: "fitting", label: "Fitting" },
  { value: "designing", label: "Designing" },
  { value: "electroplating", label: "Electroplating" },
  { value: "polishing", label: "Polishing" },
  { value: "repairing", label: "Repairing" },
] as const;
type Role = (typeof VENDOR_ROLES)[number]["value"];

const TITLES = ["Mr.", "Mrs.", "Ms.", "M/s"];
const DEFAULT_METALS = ["Gold 24K", "Gold 22K", "Gold 21K", "Gold 18K"];
const LEVELS = [
  { key: "simple", label: "Simple" },
  { key: "mix", label: "Mix" },
  { key: "difficult", label: "Difficult" },
] as const;
type Rates = { simple: string; mix: string; difficult: string };

const emptyForm = () => ({
  title: "Mr.",
  firstName: "",
  middleName: "",
  lastName: "",
  company: "",
  address: "",
  city: "",
  phone: "",
  mobile: "",
  email: "",
  notes: "",
  roles: [] as Role[],
  bodyMakingRates: { simple: "", mix: "", difficult: "" } as Rates,
  stoneSettingRates: { simple: "", mix: "", difficult: "" } as Rates,
  metalWastage: DEFAULT_METALS.map(metal => ({ metal, wastage: "" })),
});
type Form = ReturnType<typeof emptyForm>;

const text = (value: unknown) => (value === null || value === undefined ? "" : String(value));
const rates = (value: any): Rates => ({ simple: text(value?.simple), mix: text(value?.mix), difficult: text(value?.difficult) });
const toRateNumbers = (value: Rates) => {
  const out: Record<string, number> = {};
  for (const { key } of LEVELS) if (value[key] !== "" && Number.isFinite(Number(value[key]))) out[key] = Number(value[key]);
  return Object.keys(out).length ? out : undefined;
};

/** Vendor / karigar form, laid out like the shop's old Zewar "New Vendor" screen. */
export function VendorFormDialog({
  open,
  onOpenChange,
  vendor,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor?: any | null;
  onSaved?: (vendor: any) => void;
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState<Form>(emptyForm);

  useEffect(() => {
    if (!open) return;
    if (!vendor) return setForm(emptyForm());
    const parts = String(vendor.name ?? "").split(/\s+/).filter(Boolean);
    const saved = Array.isArray(vendor.metalWastage) ? vendor.metalWastage : [];
    const metals = [...saved.map((row: any) => ({ metal: text(row.metal), wastage: text(row.wastage) }))];
    for (const metal of DEFAULT_METALS) if (!metals.some(row => row.metal === metal)) metals.push({ metal, wastage: "" });
    setForm({
      title: vendor.title || "Mr.",
      // Older vendors only have a single name: put it in First / Last.
      firstName: vendor.firstName ?? (vendor.lastName ? "" : parts.slice(0, 1).join(" ")),
      middleName: vendor.middleName ?? "",
      lastName: vendor.lastName ?? (vendor.firstName ? "" : parts.slice(1).join(" ")),
      company: text(vendor.company),
      address: text(vendor.address),
      city: text(vendor.city),
      phone: text(vendor.phone),
      mobile: text(vendor.mobile),
      email: text(vendor.email),
      notes: text(vendor.notes),
      roles: Array.isArray(vendor.roles) ? vendor.roles : [],
      bodyMakingRates: rates(vendor.bodyMakingRates),
      stoneSettingRates: rates(vendor.stoneSettingRates),
      metalWastage: metals,
    });
  }, [open, vendor]);

  const done = async (saved: any) => {
    toast.success(vendor ? "Vendor updated" : `Vendor ${saved?.code ?? ""} created`);
    await Promise.all([utils.vendors.list.invalidate(), utils.finance.accounts.list.invalidate()]);
    onSaved?.(saved);
    onOpenChange(false);
  };
  const create = trpc.vendors.create.useMutation({ onSuccess: done, onError: error => toast.error(error.message) });
  const update = trpc.vendors.update.useMutation({ onSuccess: done, onError: error => toast.error(error.message) });
  const saving = create.isPending || update.isPending;

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm(current => ({ ...current, [key]: value }));
  const toggleRole = (role: Role) =>
    set("roles", form.roles.includes(role) ? form.roles.filter(item => item !== role) : [...form.roles, role]);

  const submit = () => {
    if (!form.firstName.trim() && !form.company.trim()) return toast.error("First name is required");
    if (form.firstName.trim() && !form.lastName.trim()) return toast.error("Last name is required");
    const payload = {
      title: form.title,
      firstName: form.firstName.trim(),
      middleName: form.middleName.trim(),
      lastName: form.lastName.trim(),
      company: form.company.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      phone: form.phone.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim(),
      notes: form.notes,
      roles: form.roles,
      bodyMakingRates: toRateNumbers(form.bodyMakingRates),
      stoneSettingRates: toRateNumbers(form.stoneSettingRates),
      metalWastage: form.metalWastage
        .filter(row => row.metal.trim() && row.wastage !== "" && Number.isFinite(Number(row.wastage)))
        .map(row => ({ metal: row.metal.trim(), wastage: Number(row.wastage) })),
    };
    if (vendor) update.mutate({ id: vendor.id, ...payload });
    else create.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 bg-card border-border">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="text-foreground">{vendor ? `Edit Vendor · ${vendor.code ?? ""}` : "New Vendor"}</DialogTitle>
          <DialogDescription>Karigar / supplier details, the work they do and the rates agreed with them.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-6 py-5">
          {/* Name */}
          <Section title="Contact">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[110px_1fr_1fr_1fr]">
              <Field label="Title">
                <Select value={form.title} onValueChange={value => set("title", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TITLES.map(title => <SelectItem key={title} value={title}>{title}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="First name *"><Input value={form.firstName} onChange={e => set("firstName", e.target.value)} autoFocus /></Field>
              <Field label="Middle name"><Input value={form.middleName} onChange={e => set("middleName", e.target.value)} /></Field>
              <Field label="Last name *"><Input value={form.lastName} onChange={e => set("lastName", e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Company"><Input value={form.company} onChange={e => set("company", e.target.value)} placeholder="Workshop / firm name" /></Field>
              <Field label="City"><Input value={form.city} onChange={e => set("city", e.target.value)} /></Field>
            </div>
            <Field label="Address"><Textarea rows={2} value={form.address} onChange={e => set("address", e.target.value)} /></Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Phone"><Input value={form.phone} onChange={e => set("phone", e.target.value)} inputMode="tel" /></Field>
              <Field label="Mobile"><Input value={form.mobile} onChange={e => set("mobile", e.target.value)} inputMode="tel" /></Field>
              <Field label="Email"><Input type="email" value={form.email} onChange={e => set("email", e.target.value)} /></Field>
            </div>
          </Section>

          {/* Roles */}
          <Section title="Vendor roles">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
              {VENDOR_ROLES.map(role => (
                <label key={role.value} className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-0.5 text-sm text-foreground hover:bg-muted/40">
                  <Checkbox checked={form.roles.includes(role.value)} onCheckedChange={() => toggleRole(role.value)} />
                  {role.label}
                </label>
              ))}
            </div>
          </Section>

          {/* Rates */}
          <Section title="Agreed rates (PKR per stone)">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Work</th>
                    {LEVELS.map(level => <th key={level.key} className="px-3 py-2 text-left font-medium">{level.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {([["bodyMakingRates", "Body making"], ["stoneSettingRates", "Stone setting"]] as const).map(([key, label]) => (
                    <tr key={key} className="border-t border-border">
                      <td className="px-3 py-2 text-foreground whitespace-nowrap">{label}</td>
                      {LEVELS.map(level => (
                        <td key={level.key} className="px-2 py-1.5">
                          <Input
                            type="number"
                            min="0"
                            className="h-8 min-w-[90px]"
                            placeholder="0"
                            value={form[key][level.key]}
                            onChange={e => set(key, { ...form[key], [level.key]: e.target.value })}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Wastage */}
          <Section title="Metals agreed wastage">
            <div className="space-y-2">
              {form.metalWastage.map((row, index) => (
                <div key={index} className="grid grid-cols-[1fr_140px_36px] items-center gap-2">
                  <Input
                    value={row.metal}
                    placeholder="Metal, e.g. Gold 22K"
                    onChange={e => set("metalWastage", form.metalWastage.map((item, i) => (i === index ? { ...item, metal: e.target.value } : item)))}
                  />
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="pr-7"
                      placeholder="0"
                      value={row.wastage}
                      onChange={e => set("metalWastage", form.metalWastage.map((item, i) => (i === index ? { ...item, wastage: e.target.value } : item)))}
                    />
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => set("metalWastage", form.metalWastage.filter((_, i) => i !== index))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="ghost" size="sm" onClick={() => set("metalWastage", [...form.metalWastage, { metal: "", wastage: "" }])}>
                <Plus className="mr-1 h-4 w-4" /> Add metal
              </Button>
            </div>
          </Section>

          <Field label="Notes"><Textarea rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} /></Field>
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card px-6 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="gold-gradient text-primary-foreground border-0">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {vendor ? "Save changes" : "Create vendor"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export default VendorFormDialog;
