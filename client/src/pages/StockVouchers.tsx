import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { FilePlus2, FolderOpen, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateInput } from "@/components/DateInput";
import { LedgerSelect } from "@/components/LedgerSelect";
import { GEM_SUGGESTIONS, karatOf, METAL_NAMES, netWithAlloy, raatiForKarat, STOCK_VOUCHER_TYPES, type StockVoucherType } from "@shared/metals";
import { fmtDate, fmtMoney, fmtWeight } from "@/lib/printReport";
import { enterToNext } from "@/lib/enterToNext";

const JEWELLERY_TYPES = ["Necklace", "Set", "Earrings", "Tops", "Jhumka", "Baalis", "Ring", "Bangles", "Kara", "Bracelet", "Pendant", "Chain", "Tikka", "Anklet"];
const GROUPS: Array<{ label: string; types: StockVoucherType[] }> = [
  { label: "Karigar", types: ["VI", "VR"] },
  { label: "Purchase", types: ["PM", "PG", "PJ"] },
  { label: "Sale", types: ["SM", "SG", "SJ"] },
];

type MetalRow = { item: string; weight: string; rate: string; value: string; wastage: string; alloyRaati: string; itemIn: string; comments: string };
type GemRow = { item: string; calculateBy: "quantity" | "weight"; qty: string; weight: string; unit: string; rate: string; value: string };
const emptyMetal = (): MetalRow => ({ item: "Gold 24k", weight: "", rate: "", value: "", wastage: "", alloyRaati: "", itemIn: "", comments: "" });
const emptyGem = (): GemRow => ({ item: "", calculateBy: "quantity", qty: "", weight: "", unit: "ct", rate: "", value: "" });
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
// A stored value equal to weight/qty × rate was auto-calculated: load it empty so it recalculates.
const autoValue = (value: unknown, base: number, rate: number) =>
  value === null || value === undefined || Math.abs(Number(value) - Math.round(base * rate * 100) / 100) < 0.005 ? "" : String(value);
const n = (value: string) => (value === "" || !Number.isFinite(Number(value)) ? 0 : Number(value));
const str = (value: unknown) => (value === null || value === undefined || value === 0 ? "" : String(value));

type Form = {
  id?: number;
  number?: number;
  entryDate: string;
  vendorId: string;
  customerId: string;
  comments: string;
  metals: MetalRow[];
  gems: GemRow[];
  jewellery: { type: string; weight: string; value: string; making: string };
};
const emptyForm = (type: StockVoucherType): Form => ({
  entryDate: today(),
  vendorId: "",
  customerId: "",
  comments: "",
  metals: STOCK_VOUCHER_TYPES[type].kind === "gem" ? [] : [emptyMetal()],
  gems: STOCK_VOUCHER_TYPES[type].kind === "gem" ? [emptyGem()] : [],
  jewellery: { type: "", weight: "", value: "", making: "" },
});

/** Zewar-style stock vouchers: one form per voucher type, open an old one by its number to update it. */
export default function StockVouchers() {
  const params = useParams<{ type?: string }>();
  const [, setLocation] = useLocation();
  const type = (params.type && params.type.toUpperCase() in STOCK_VOUCHER_TYPES ? params.type.toUpperCase() : "VI") as StockVoucherType;
  const meta = STOCK_VOUCHER_TYPES[type];
  const utils = trpc.useUtils();

  const [form, setForm] = useState<Form>(() => emptyForm(type));
  const [openNumber, setOpenNumber] = useState("");
  useEffect(() => {
    setForm(emptyForm(type));
    setOpenNumber("");
  }, [type]);

  const vendors = trpc.vendors.list.useQuery();
  const customers = trpc.customers.list.useQuery(undefined, { enabled: meta.group === "sale" });
  const recent = trpc.stock.vouchers.list.useQuery({ types: [type], limit: 50 });

  const vendorOptions = useMemo(
    () => ((vendors.data ?? []) as any[]).filter(v => v.isActive !== false || String(v.id) === form.vendorId).map(v => ({ id: v.id, code: v.code ?? `VN${v.id}`, title: v.name })),
    [vendors.data, form.vendorId]
  );
  const customerOptions = useMemo(
    () => ((customers.data ?? []) as any[]).map(c => ({ id: c.id, code: `CS${String(c.id).padStart(6, "0")}`, title: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() })),
    [customers.data]
  );

  const load = (voucher: any) => {
    setForm({
      id: voucher.id,
      number: voucher.number,
      entryDate: String(voucher.entryDate).slice(0, 10),
      vendorId: voucher.vendorId ? String(voucher.vendorId) : "",
      customerId: voucher.customerId ? String(voucher.customerId) : "",
      comments: voucher.comments ?? "",
      metals: (voucher.metals ?? []).map((line: any) => ({
        item: line.item,
        weight: str(line.weight),
        rate: str(line.rate),
        value: autoValue(line.value, Number(line.weight) || 0, Number(line.rate) || 0),
        wastage: str(line.wastage),
        alloyRaati: str(line.alloyRaati),
        itemIn: line.itemIn ?? "",
        comments: line.comments ?? "",
      })),
      gems: (voucher.gems ?? []).map((line: any) => ({
        item: line.item,
        calculateBy: line.calculateBy ?? "quantity",
        qty: str(line.qty),
        weight: str(line.weight),
        unit: line.unit ?? "ct",
        rate: str(line.rate),
        value: autoValue(line.value, Number(line.calculateBy === "weight" ? line.weight : line.qty) || 0, Number(line.rate) || 0),
      })),
      jewellery: {
        type: voucher.jewellery?.type ?? "",
        weight: str(voucher.jewellery?.weight),
        value: str(voucher.jewellery?.value),
        making: str(voucher.jewellery?.making),
      },
    });
    setOpenNumber(String(voucher.number));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openByNumber = async () => {
    const number = Number(openNumber);
    if (!number) return toast.error("Type the voucher number");
    const voucher = await utils.stock.vouchers.get.fetch({ type, number });
    if (!voucher) return toast.error(`${type} ${number} not found`);
    load(voucher);
  };

  const done = async (voucher: any, message: string) => {
    toast.success(message);
    await Promise.all([utils.stock.vouchers.list.invalidate(), utils.stock.reports.invalidate()]);
    if (voucher) load(voucher);
  };
  const create = trpc.stock.vouchers.create.useMutation({ onSuccess: v => done(v, `${type} ${v?.number} saved`), onError: e => toast.error(e.message) });
  const update = trpc.stock.vouchers.update.useMutation({ onSuccess: v => done(v, `${type} ${v?.number} updated`), onError: e => toast.error(e.message) });
  const remove = trpc.stock.vouchers.delete.useMutation({
    onSuccess: async () => {
      toast.success("Voucher deleted");
      setForm(emptyForm(type));
      setOpenNumber("");
      await Promise.all([utils.stock.vouchers.list.invalidate(), utils.stock.reports.invalidate()]);
    },
    onError: e => toast.error(e.message),
  });
  const saving = create.isPending || update.isPending;

  const save = () => {
    if (meta.group === "karigar" && !form.vendorId) return toast.error("Choose the karigar");
    const payload = {
      entryDate: form.entryDate,
      vendorId: form.vendorId ? Number(form.vendorId) : null,
      customerId: form.customerId ? Number(form.customerId) : null,
      comments: form.comments,
      metals: form.metals.filter(line => line.item && n(line.weight) > 0).map(line => ({
        item: line.item,
        weight: n(line.weight),
        rate: n(line.rate),
        value: line.value === "" ? null : n(line.value),
        wastage: n(line.wastage),
        alloyRaati: n(line.alloyRaati),
        itemIn: line.itemIn || null,
        comments: line.comments || null,
      })),
      gems: form.gems.filter(line => line.item && (n(line.qty) > 0 || n(line.weight) > 0)).map(line => ({
        item: line.item,
        calculateBy: line.calculateBy,
        qty: n(line.qty),
        weight: n(line.weight),
        unit: line.unit,
        rate: n(line.rate),
        value: line.value === "" ? null : n(line.value),
      })),
      jewellery: meta.kind === "jewellery" ? { type: form.jewellery.type, weight: n(form.jewellery.weight), value: n(form.jewellery.value), making: n(form.jewellery.making) } : null,
    };
    if (form.id) update.mutate({ id: form.id, ...payload });
    else create.mutate({ type, ...payload });
  };

  const setMetal = (index: number, patch: Partial<MetalRow>) =>
    setForm(f => ({ ...f, metals: f.metals.map((line, i) => (i === index ? { ...line, ...patch } : line)) }));
  const setGem = (index: number, patch: Partial<GemRow>) =>
    setForm(f => ({ ...f, gems: f.gems.map((line, i) => (i === index ? { ...line, ...patch } : line)) }));

  const metalValue = (line: MetalRow) => (line.value !== "" ? n(line.value) : n(line.weight) * n(line.rate));
  const gemValue = (line: GemRow) => (line.value !== "" ? n(line.value) : (line.calculateBy === "weight" ? n(line.weight) : n(line.qty)) * n(line.rate));
  const total =
    meta.kind === "jewellery"
      ? n(form.jewellery.value) + n(form.jewellery.making)
      : form.metals.reduce((sum, line) => sum + metalValue(line), 0) + form.gems.reduce((sum, line) => sum + gemValue(line), 0);

  return (
    <div className="space-y-5 pb-16 animate-fadeIn">
      {/* Voucher type picker */}
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {GROUPS.map(group => (
          <div key={group.label} className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</span>
            {group.types.map(code => (
              <Button
                key={code}
                size="sm"
                variant={code === type ? "default" : "outline"}
                className={cn(code === type && "gold-gradient text-primary-foreground border-0")}
                onClick={() => setLocation(`/stock/${code}`)}
              >
                {STOCK_VOUCHER_TYPES[code].label}
              </Button>
            ))}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card" onKeyDown={enterToNext}>
        <div className="flex flex-col gap-2 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-semibold text-foreground">
            {form.id ? "Update" : "New"} {meta.label} Voucher
            {form.id && <span className="ml-2 font-mono text-base text-primary">{type} {form.number}</span>}
          </h1>
          <div className="flex items-center gap-2">
            <Input data-enter-submit value={openNumber} onChange={e => setOpenNumber(e.target.value.replace(/\D/g, ""))} onKeyDown={e => e.key === "Enter" && openByNumber()} placeholder={`${type} number`} className="h-9 w-32" inputMode="numeric" />
            <Button variant="outline" size="sm" onClick={openByNumber}><FolderOpen className="mr-1.5 h-4 w-4" />Open</Button>
            {form.id && <Button variant="outline" size="sm" onClick={() => { setForm(emptyForm(type)); setOpenNumber(""); }}><FilePlus2 className="mr-1.5 h-4 w-4" />New</Button>}
          </div>
        </div>

        {/* Header fields, Zewar style: label left, field right */}
        <div className="grid gap-x-8 gap-y-3 px-5 py-4 lg:grid-cols-2">
          <Row label="Voucher">
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-border bg-muted px-3 py-1.5 font-mono text-sm">{type}</span>
              <span className="font-mono text-sm text-muted-foreground">{form.number ?? "new number on save"}</span>
            </div>
          </Row>
          <Row label="Entry Date"><DateInput value={form.entryDate} onChange={value => setForm(f => ({ ...f, entryDate: value }))} clearable={false} /></Row>
          {meta.group === "karigar" && (
            <Row label="Karigar (Vendor)">
              <LedgerSelect accounts={vendorOptions} value={form.vendorId} onChange={value => setForm(f => ({ ...f, vendorId: value }))} placeholder="Search karigar" />
            </Row>
          )}
          {meta.group === "sale" && (
            <Row label="Customer (optional)">
              <LedgerSelect accounts={customerOptions} value={form.customerId} onChange={value => setForm(f => ({ ...f, customerId: value }))} placeholder="Search customer" />
            </Row>
          )}
          <Row label="Comments" wide><Textarea rows={2} value={form.comments} onChange={e => setForm(f => ({ ...f, comments: e.target.value }))} placeholder={type === "PM" ? "e.g. Purchase Gold (G-28.73) Pcs 6" : ""} /></Row>
        </div>

        {/* Jewellery header */}
        {meta.kind === "jewellery" && (
          <div className="grid gap-x-8 gap-y-3 border-t border-border px-5 py-4 lg:grid-cols-2">
            <Row label="Jewellery">
              <Input list="jewellery-types" value={form.jewellery.type} onChange={e => setForm(f => ({ ...f, jewellery: { ...f.jewellery, type: e.target.value } }))} placeholder="Necklace, Baalis…" />
              <datalist id="jewellery-types">{JEWELLERY_TYPES.map(item => <option key={item} value={item} />)}</datalist>
            </Row>
            <Row label="Jewellery Weight (gm)"><Num value={form.jewellery.weight} onChange={value => setForm(f => ({ ...f, jewellery: { ...f.jewellery, weight: value } }))} step="0.001" /></Row>
            <Row label="Jewellery Value"><Num value={form.jewellery.value} onChange={value => setForm(f => ({ ...f, jewellery: { ...f.jewellery, value } }))} /></Row>
            <Row label="Making / Other Charges"><Num value={form.jewellery.making} onChange={value => setForm(f => ({ ...f, jewellery: { ...f.jewellery, making: value } }))} /></Row>
          </div>
        )}

        {/* Metal lines */}
        {meta.kind !== "gem" && (
          <Lines title="Metals" onAdd={() => setForm(f => ({ ...f, metals: [...f.metals, emptyMetal()] }))}>
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="bg-muted/40 text-xs text-muted-foreground">
                  <th className="px-2 py-2 text-left font-medium">{type === "VI" ? "Item Out" : "Item"}</th>
                  <th className="px-2 py-2 text-left font-medium">Weight (gm)</th>
                  {type === "VI" && <th className="px-2 py-2 text-left font-medium">Alloy (raati / tola)</th>}
                  {meta.kind === "jewellery" && <th className="px-2 py-2 text-left font-medium">Wastage %</th>}
                  {(type === "VI" || meta.kind === "jewellery") && <th className="px-2 py-2 text-right font-medium">Net Wgt</th>}
                  {type === "VI" && <th className="px-2 py-2 text-left font-medium">Item In</th>}
                  {meta.kind === "metal" && meta.group !== "karigar" && (
                    <>
                      <th className="px-2 py-2 text-left font-medium">Rate</th>
                      <th className="px-2 py-2 text-left font-medium">Value</th>
                    </>
                  )}
                  {meta.group === "karigar" && <th className="px-2 py-2 text-left font-medium">Comments</th>}
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {form.metals.map((line, index) => {
                  const net =
                    type === "VI" ? netWithAlloy(n(line.weight), n(line.alloyRaati)) : n(line.weight) + (n(line.weight) * n(line.wastage)) / 100;
                  const suggested = type === "VI" ? raatiForKarat(karatOf(line.item) ?? 0, karatOf(line.itemIn) ?? 0) : 0;
                  return (
                    <tr key={index} className="border-t border-border/60 align-top">
                      <td className="px-2 py-1.5"><MetalSelect value={line.item} onChange={value => setMetal(index, { item: value })} /></td>
                      <td className="px-2 py-1.5"><Num value={line.weight} onChange={value => setMetal(index, { weight: value })} step="0.001" /></td>
                      {type === "VI" && (
                        <td className="px-2 py-1.5">
                          <Num value={line.alloyRaati} onChange={value => setMetal(index, { alloyRaati: value })} />
                          {suggested > 0 && <p className="mt-1 text-[11px] text-muted-foreground">{line.item} → {line.itemIn}: about {suggested} raati</p>}
                        </td>
                      )}
                      {meta.kind === "jewellery" && <td className="px-2 py-1.5"><Num value={line.wastage} onChange={value => setMetal(index, { wastage: value })} /></td>}
                      {(type === "VI" || meta.kind === "jewellery") && <td className="px-2 py-1.5 pt-3.5 text-right font-mono tabular-nums">{fmtWeight(net) || "0.000"}</td>}
                      {type === "VI" && <td className="px-2 py-1.5"><MetalSelect value={line.itemIn || line.item} onChange={value => setMetal(index, { itemIn: value })} /></td>}
                      {meta.kind === "metal" && meta.group !== "karigar" && (
                        <>
                          <td className="px-2 py-1.5"><Num value={line.rate} onChange={value => setMetal(index, { rate: value })} /></td>
                          <td className="px-2 py-1.5"><Num value={line.value === "" ? str(Math.round(n(line.weight) * n(line.rate) * 100) / 100) : line.value} onChange={value => setMetal(index, { value })} /></td>
                        </>
                      )}
                      {meta.group === "karigar" && <td className="px-2 py-1.5"><Input value={line.comments} onChange={e => setMetal(index, { comments: e.target.value })} className="h-9" /></td>}
                      <td className="px-1 py-1.5"><RemoveButton onClick={() => setForm(f => ({ ...f, metals: f.metals.filter((_, i) => i !== index) }))} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Lines>
        )}

        {/* Gem lines */}
        {(meta.kind === "gem" || meta.kind === "jewellery") && (
          <Lines title="Gems" onAdd={() => setForm(f => ({ ...f, gems: [...f.gems, emptyGem()] }))}>
            <datalist id="gem-names">{GEM_SUGGESTIONS.map(item => <option key={item} value={item} />)}</datalist>
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="bg-muted/40 text-xs text-muted-foreground">
                  <th className="px-2 py-2 text-left font-medium">Item</th>
                  <th className="px-2 py-2 text-left font-medium">Calculate By</th>
                  <th className="px-2 py-2 text-left font-medium">Qty</th>
                  <th className="px-2 py-2 text-left font-medium">Weight</th>
                  <th className="px-2 py-2 text-left font-medium">Unit</th>
                  <th className="px-2 py-2 text-left font-medium">Rate</th>
                  <th className="px-2 py-2 text-left font-medium">Value</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {form.gems.map((line, index) => (
                  <tr key={index} className="border-t border-border/60">
                    <td className="px-2 py-1.5"><Input list="gem-names" value={line.item} onChange={e => setGem(index, { item: e.target.value })} className="h-9 min-w-[140px]" placeholder="Rubies, Opal…" /></td>
                    <td className="px-2 py-1.5">
                      <Select value={line.calculateBy} onValueChange={value => setGem(index, { calculateBy: value as GemRow["calculateBy"] })}>
                        <SelectTrigger className="h-9 w-[120px]"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="quantity">Quantity</SelectItem><SelectItem value="weight">Weight</SelectItem></SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-1.5"><Num value={line.qty} onChange={value => setGem(index, { qty: value })} /></td>
                    <td className="px-2 py-1.5"><Num value={line.weight} onChange={value => setGem(index, { weight: value })} step="0.001" /></td>
                    <td className="px-2 py-1.5">
                      <Select value={line.unit} onValueChange={value => setGem(index, { unit: value })}>
                        <SelectTrigger className="h-9 w-[90px]"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="ct">Ct</SelectItem><SelectItem value="gm">Grams</SelectItem></SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-1.5"><Num value={line.rate} onChange={value => setGem(index, { rate: value })} /></td>
                    <td className="px-2 py-1.5"><Num value={line.value === "" ? str(Math.round(gemValue(line) * 100) / 100) : line.value} onChange={value => setGem(index, { value })} /></td>
                    <td className="px-1 py-1.5"><RemoveButton onClick={() => setForm(f => ({ ...f, gems: f.gems.filter((_, i) => i !== index) }))} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Lines>
        )}

        <div className="sticky bottom-0 flex flex-col gap-3 rounded-b-xl border-t border-border bg-card px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {meta.group === "karigar" ? "Karigar balance updates in Reports → Karigar Statement." : <>Total value <span className="ml-1 text-lg font-semibold text-foreground tabular-nums">{fmtMoney(total) || "0"}</span></>}
          </p>
          <div className="flex gap-2">
            {form.id && (
              <Button variant="outline" className="text-destructive hover:text-destructive" disabled={remove.isPending} onClick={() => window.confirm(`Delete ${type} ${form.number}?`) && remove.mutate({ id: form.id! })}>
                <Trash2 className="mr-1.5 h-4 w-4" />Delete
              </Button>
            )}
            <Button onClick={save} disabled={saving} className="gold-gradient text-primary-foreground border-0">
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              {form.id ? "Save changes" : "Save voucher"}
            </Button>
          </div>
        </div>
      </div>

      {/* Recent vouchers of this type */}
      <div className="rounded-xl border border-border bg-card">
        <h2 className="border-b border-border px-5 py-3 text-sm font-semibold text-foreground">Recent {meta.label} vouchers</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 text-xs text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Voucher</th>
                <th className="px-4 py-2 text-left font-medium">Date</th>
                <th className="px-4 py-2 text-left font-medium">{meta.group === "karigar" ? "Karigar" : meta.group === "sale" ? "Customer" : "Comments"}</th>
                <th className="px-4 py-2 text-left font-medium">Items</th>
                <th className="px-4 py-2 text-right font-medium">{meta.group === "karigar" ? "Net weight" : "Value"}</th>
              </tr>
            </thead>
            <tbody>
              {((recent.data ?? []) as any[]).map(voucher => (
                <tr key={voucher.id} onClick={() => load(voucher)} className={cn("cursor-pointer border-t border-border/60 hover:bg-muted/30", voucher.id === form.id && "bg-primary/5")}>
                  <td className="px-4 py-2 font-mono text-primary">{voucher.label}</td>
                  <td className="px-4 py-2">{fmtDate(voucher.entryDate)}</td>
                  <td className="max-w-[260px] truncate px-4 py-2">{voucher.vendor?.label || voucher.customer?.label || voucher.comments || "—"}</td>
                  <td className="max-w-[320px] truncate px-4 py-2 text-muted-foreground">
                    {voucher.jewellery?.type ||
                      [...(voucher.metals ?? []).map((l: any) => `${l.item}${l.itemIn && l.itemIn !== l.item ? `→${l.itemIn}` : ""} ${fmtWeight(l.weight)}`), ...(voucher.gems ?? []).map((g: any) => g.item)].join(", ")}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {meta.group === "karigar" ? fmtWeight((voucher.metals ?? []).reduce((s: number, l: any) => s + (l.netWeight || 0), 0)) : fmtMoney(voucher.totalValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!recent.isLoading && !(recent.data ?? []).length && <p className="py-8 text-center text-sm text-muted-foreground">No {meta.label.toLowerCase()} vouchers yet.</p>}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn("grid min-w-0 grid-cols-1 items-start gap-1.5 sm:grid-cols-[170px_minmax(0,1fr)] sm:gap-3", wide && "lg:col-span-2")}>
      <span className="rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-foreground">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Lines({ title, onAdd, children }: { title: string; onAdd: () => void; children: React.ReactNode }) {
  return (
    <div className="border-t border-border px-5 py-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Button variant="ghost" size="sm" onClick={onAdd}><Plus className="mr-1 h-4 w-4" />Add line</Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">{children}</div>
    </div>
  );
}

function Num({ value, onChange, step }: { value: string; onChange: (value: string) => void; step?: string }) {
  return <Input type="number" inputMode="decimal" min="0" step={step ?? "any"} value={value} onChange={e => onChange(e.target.value)} className="h-9 min-w-[90px] tabular-nums" />;
}

function MetalSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const options = METAL_NAMES.includes(value) || !value ? METAL_NAMES : [value, ...METAL_NAMES];
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 min-w-[150px]"><SelectValue placeholder="Metal" /></SelectTrigger>
      <SelectContent>{options.map(metal => <SelectItem key={metal} value={metal}>{metal}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={onClick} aria-label="Remove line">
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
