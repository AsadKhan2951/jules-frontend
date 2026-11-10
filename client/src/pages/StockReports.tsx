import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Loader2, Printer, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateInput } from "@/components/DateInput";
import { LedgerSelect } from "@/components/LedgerSelect";
import { METAL_NAMES } from "@shared/metals";
import { escapeHtml as e, fmtDate, fmtMoney, fmtWeight, printReport } from "@/lib/printReport";

type Tab = "statement" | "balances" | "issue" | "return" | "received" | "ready" | "position";
const TABS: Array<{ value: Tab; label: string }> = [
  { value: "statement", label: "Karigar Statement" },
  { value: "balances", label: "Gold with Karigars" },
  { value: "issue", label: "Stock Issue To Karigar" },
  { value: "return", label: "Stock Return From Karigar" },
  { value: "received", label: "Stock Received From Karigar" },
  { value: "ready", label: "Stock Ready Item" },
  { value: "position", label: "Stock Position" },
];

const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const monthStart = () => {
  const d = new Date();
  return localDate(new Date(d.getFullYear(), d.getMonth(), 1));
};
const today = () => localDate(new Date());
const signed = (value: number, digits: "w" | "m") => {
  if (!value) return digits === "w" ? "0.000" : "0";
  return digits === "w" ? value.toFixed(3) : value.toLocaleString("en-PK", { maximumFractionDigits: 2 });
};

/** Zewar Reports → Inventory: karigar statement, stock issued / returned / received, stock position. */
export default function StockReports() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [tab, setTab] = useState<Tab>("statement");
  // Menu links open a report directly: /stock-reports?tab=ready
  useEffect(() => {
    const wanted = new URLSearchParams(search).get("tab") as Tab | null;
    if (wanted && TABS.some(item => item.value === wanted)) setTab(wanted);
  }, [search]);
  const [vendorId, setVendorId] = useState("");
  const [metal, setMetal] = useState("all");
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [run, setRun] = useState(0);

  const vendors = trpc.vendors.list.useQuery();
  const vendorOptions = useMemo(() => ((vendors.data ?? []) as any[]).map(v => ({ id: v.id, code: v.code ?? `VN${v.id}`, title: v.name })), [vendors.data]);
  const vendorLabel = vendorOptions.find(v => String(v.id) === vendorId);

  const statement = trpc.stock.reports.karigarStatement.useQuery(
    { vendorId: Number(vendorId), metal, from, to },
    { enabled: tab === "statement" && !!vendorId && run > 0 }
  );
  const balances = trpc.stock.reports.karigarBalances.useQuery(undefined, { enabled: tab === "balances" });
  const movements = trpc.stock.reports.movements.useQuery(
    { kind: (tab === "issue" || tab === "return" || tab === "received" ? tab : "issue") as any, vendorId: vendorId ? Number(vendorId) : undefined, from, to },
    { enabled: tab === "issue" || tab === "return" || tab === "received" }
  );
  const position = trpc.stock.reports.position.useQuery({ asOf: to }, { enabled: tab === "position" });
  const ready = trpc.stock.reports.readyItems.useQuery(undefined, { enabled: tab === "ready" });

  const needsVendor = tab === "statement";
  const usesDates = tab !== "balances" && tab !== "ready";
  const loading = statement.isFetching || balances.isFetching || movements.isFetching || position.isFetching || ready.isFetching;

  // ---- printable HTML for each report ----
  const printCurrent = () => {
    const range = `Date From ${from} To ${to}`;
    if (tab === "statement" && statement.data) {
      const s = statement.data as any;
      const rows = s.rows
        .map(
          (r: any) => `<tr><td>${fmtDate(r.date)}</td><td>${e(r.particulars)}</td><td>${e(r.ref)}</td>
<td class="r">${fmtWeight(r.issuedWeight)}</td><td class="r">${fmtWeight(r.issuedAlloy)}</td><td class="r">${fmtWeight(r.issuedTotal)}</td>
<td class="r">${fmtWeight(r.receivedWeight)}</td><td class="r">${fmtWeight(r.receivedWastage)}</td><td class="r">${fmtWeight(r.receivedTotal)}</td>
<td class="r">${signed(r.balanceWeight, "w")}</td><td class="r">${fmtMoney(r.labour)}</td><td class="r">${fmtMoney(r.payment)}</td><td class="r">${signed(r.balanceAmount, "m")}</td></tr>`
        )
        .join("");
      const t = s.totals;
      printReport(
        "Karigar Statement",
        `<h1>KARIGAR STATEMENT</h1><p class="sub">${range}</p><p class="head">${e(s.vendor.label)} - ${e(s.metal)}</p>
<table><thead><tr><th rowspan="2">DATE</th><th rowspan="2">PARTICULARS</th><th rowspan="2">REF #</th><th colspan="3">ISSUED</th><th colspan="3">RECEIVED</th><th rowspan="2">BALANCE WEIGHT</th><th rowspan="2">LABOUR</th><th rowspan="2">PAYMENT</th><th rowspan="2">BALANCE AMOUNT</th></tr>
<tr><th>WEIGHT</th><th>ALLOY</th><th>TOTAL</th><th>WEIGHT</th><th>WASTAGE</th><th>TOTAL</th></tr></thead>
<tbody><tr class="bf"><td></td><td>BALANCE B / F</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td class="r">${signed(s.broughtForward.weight, "w")}</td><td></td><td></td><td class="r">${signed(s.broughtForward.amount, "m")}</td></tr>${rows}
<tr class="total"><td></td><td>TOTAL</td><td></td><td class="r">${fmtWeight(t.issuedWeight)}</td><td class="r">${fmtWeight(t.issuedAlloy)}</td><td class="r">${fmtWeight(t.issuedTotal)}</td><td class="r">${fmtWeight(t.receivedWeight)}</td><td class="r">${fmtWeight(t.receivedWastage)}</td><td class="r">${fmtWeight(t.receivedTotal)}</td><td class="r">${signed(s.closing.weight, "w")}</td><td class="r">${fmtMoney(t.labour)}</td><td class="r">${fmtMoney(t.payment)}</td><td class="r">${signed(s.closing.amount, "m")}</td></tr></tbody></table>`,
        { landscape: true }
      );
    }
    if (tab === "balances" && balances.data) {
      const rows = (balances.data as any[])
        .map(b => `<tr><td>${e(b.vendor.label)}</td><td>${b.metals.map((m: any) => `${e(m.metal)}: ${m.weight.toFixed(3)}`).join("<br>") || "-"}</td><td class="r">${signed(b.balanceAmount, "m")}</td></tr>`)
        .join("");
      printReport("Gold with Karigars", `<h1>METAL &amp; BALANCE WITH KARIGARS</h1><p class="sub">As on ${today()}</p><table><thead><tr><th>KARIGAR</th><th>METAL BALANCE (gm)</th><th>BALANCE AMOUNT</th></tr></thead><tbody>${rows}</tbody></table>`);
    }
    if ((tab === "issue" || tab === "return" || tab === "received") && movements.data) {
      const title = TABS.find(t => t.value === tab)!.label;
      const list = movements.data as any[];
      const body =
        tab === "received"
          ? `<thead><tr><th>DATE</th><th>REF #</th><th>KARIGAR</th><th>PARTICULARS</th><th>METAL</th><th>WEIGHT</th><th>WASTAGE</th><th>TOTAL</th></tr></thead><tbody>${list
              .map(r => `<tr><td>${fmtDate(r.date)}</td><td>${e(r.ref)}</td><td>${e(r.vendor)}</td><td>${e([r.customer, r.itemName, r.processType].filter(Boolean).join(", "))}</td><td>${e(r.metal)}</td><td class="r">${fmtWeight(r.weight)}</td><td class="r">${fmtWeight(r.wastage)}</td><td class="r">${fmtWeight(r.total)}</td></tr>`)
              .join("")}</tbody>`
          : `<thead><tr><th>DATE</th><th>REF #</th><th>KARIGAR</th><th>ITEM</th><th>WEIGHT</th>${tab === "issue" ? "<th>ALLOY (raati)</th><th>NET</th><th>ITEM IN</th>" : ""}<th>COMMENTS</th></tr></thead><tbody>${list
              .map(r => `<tr><td>${fmtDate(r.date)}</td><td>${e(r.ref)}</td><td>${e(r.vendor)}</td><td>${e(r.metal)}</td><td class="r">${fmtWeight(r.weight)}</td>${tab === "issue" ? `<td class="r">${r.alloyRaati || ""}</td><td class="r">${fmtWeight(r.total)}</td><td>${e(r.itemIn)}</td>` : ""}<td>${e(r.comments)}</td></tr>`)
              .join("")}</tbody>`;
      printReport(title, `<h1>${e(title.toUpperCase())}</h1><p class="sub">${range}</p><table>${body}</table>`, { landscape: true });
    }
    if (tab === "ready" && ready.data) {
      const rows = (ready.data as any[])
        .map(r => `<tr><td>${e(r.orderNumber)}</td><td>${e(r.customer)}</td><td>${e(r.itemName)}</td><td>${e(r.metal)}</td><td class="r">${fmtWeight(r.receivedWeight)}</td><td>${e(r.karigar)}</td><td>${fmtDate(r.readySince)}</td><td>${fmtDate(r.expectedDelivery)}</td><td>${e(r.invoice ?? "")}</td></tr>`)
        .join("");
      printReport("Stock Ready Item", `<h1>STOCK READY ITEM</h1><p class="sub">As on ${today()}</p><table><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>ITEM</th><th>METAL</th><th>WEIGHT</th><th>KARIGAR</th><th>READY SINCE</th><th>DELIVERY DATE</th><th>INVOICE</th></tr></thead><tbody>${rows}</tbody></table>`, { landscape: true });
    }
    if (tab === "position" && position.data) {
      const p = position.data as any;
      printReport(
        "Stock Position",
        `<h1>STOCK POSITION</h1><p class="sub">As on ${to}</p>
<p class="head">Metals (grams)</p><table><thead><tr><th>METAL</th><th>PURCHASED</th><th>SOLD</th><th>ISSUED TO KARIGAR</th><th>RETURNED</th><th>IN SHOP</th><th>WITH KARIGARS</th></tr></thead><tbody>${p.metals
          .map((m: any) => `<tr><td>${e(m.metal)}</td><td class="r">${fmtWeight(m.purchased)}</td><td class="r">${fmtWeight(m.sold)}</td><td class="r">${fmtWeight(m.issued)}</td><td class="r">${fmtWeight(m.returned)}</td><td class="r">${signed(m.inShop, "w")}</td><td class="r">${signed(m.withKarigars, "w")}</td></tr>`)
          .join("")}</tbody></table>
<p class="head">Gems</p><table><thead><tr><th>GEM</th><th>UNIT</th><th>PURCHASED QTY</th><th>PURCHASED WGT</th><th>SOLD QTY</th><th>SOLD WGT</th><th>IN STOCK QTY</th><th>IN STOCK WGT</th></tr></thead><tbody>${p.gems
          .map((g: any) => `<tr><td>${e(g.gem)}</td><td>${e(g.unit)}</td><td class="r">${g.purchasedQty}</td><td class="r">${fmtWeight(g.purchasedWeight)}</td><td class="r">${g.soldQty}</td><td class="r">${fmtWeight(g.soldWeight)}</td><td class="r">${g.inStockQty}</td><td class="r">${signed(g.inStockWeight, "w")}</td></tr>`)
          .join("")}</tbody></table>
<p class="head">Jewellery</p><table><thead><tr><th>ITEM</th><th>BOUGHT</th><th>SOLD</th><th>IN STOCK</th><th>IN STOCK WGT</th></tr></thead><tbody>${p.jewellery
          .map((j: any) => `<tr><td>${e(j.type)}</td><td class="r">${j.bought}</td><td class="r">${j.sold}</td><td class="r">${j.inStock}</td><td class="r">${signed(j.inStockWeight, "w")}</td></tr>`)
          .join("")}</tbody></table>`
      );
    }
  };

  return (
    <div className="space-y-5 pb-16 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Karigar &amp; Stock Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">The same reports as Zewar → Reports → Inventory. Every report can be printed.</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TABS.map(item => (
          <Button
            key={item.value}
            size="sm"
            variant={tab === item.value ? "default" : "outline"}
            className={cn(tab === item.value && "gold-gradient text-primary-foreground border-0")}
            onClick={() => setTab(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {/* Filters */}
      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
        {tab !== "balances" && tab !== "position" && tab !== "ready" ? (
          <Field label={needsVendor ? "Karigar *" : "Karigar (all if empty)"}>
            <div className="flex gap-1">
              <LedgerSelect accounts={vendorOptions} value={vendorId} onChange={setVendorId} placeholder="Search karigar" />
              {!needsVendor && vendorId && <Button variant="ghost" size="sm" onClick={() => setVendorId("")}>All</Button>}
            </div>
          </Field>
        ) : <div className="hidden md:block" />}
        {tab === "statement" ? (
          <Field label="Metal">
            <Select value={metal} onValueChange={setMetal}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Metal</SelectItem>
                {METAL_NAMES.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        ) : <div className="hidden md:block" />}
        {usesDates && tab !== "position" ? <Field label="Date From"><DateInput value={from} onChange={setFrom} clearable={false} /></Field> : <div className="hidden md:block" />}
        {usesDates ? <Field label={tab === "position" ? "As on" : "Date To"}><DateInput value={to} onChange={setTo} clearable={false} /></Field> : <div className="hidden md:block" />}
        <div className="flex gap-2">
          {tab === "statement" && (
            <Button onClick={() => setRun(r => r + 1)} disabled={!vendorId} className="gold-gradient text-primary-foreground border-0">
              <Search className="mr-1.5 h-4 w-4" />View
            </Button>
          )}
          <Button variant="outline" onClick={printCurrent} disabled={loading}><Printer className="mr-1.5 h-4 w-4" />Print</Button>
        </div>
      </div>

      {loading && <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

      {/* Karigar statement */}
      {tab === "statement" && !loading && (
        statement.data ? (
          <Report>
            <p className="mb-2 text-sm font-medium text-foreground">{(statement.data as any).vendor.label} — {(statement.data as any).metal}</p>
            <table className="w-full min-w-[1100px] text-xs">
              <thead>
                <tr className="bg-muted/50">
                  <Th rowSpan={2}>Date</Th><Th rowSpan={2}>Particulars</Th><Th rowSpan={2}>Ref #</Th>
                  <Th colSpan={3}>Issued</Th><Th colSpan={3}>Received</Th>
                  <Th rowSpan={2}>Balance Weight</Th><Th rowSpan={2}>Labour</Th><Th rowSpan={2}>Payment</Th><Th rowSpan={2}>Balance Amount</Th>
                </tr>
                <tr className="bg-muted/50"><Th>Weight</Th><Th>Alloy</Th><Th>Total</Th><Th>Weight</Th><Th>Wastage</Th><Th>Total</Th></tr>
              </thead>
              <tbody>
                <tr className="italic text-muted-foreground">
                  <Td /><Td>Balance B/F</Td><Td /><Td /><Td /><Td /><Td /><Td /><Td />
                  <Td r>{signed((statement.data as any).broughtForward.weight, "w")}</Td><Td /><Td /><Td r>{signed((statement.data as any).broughtForward.amount, "m")}</Td>
                </tr>
                {(statement.data as any).rows.map((r: any, i: number) => (
                  <tr key={i} className="border-t border-border/60">
                    <Td nowrap>{fmtDate(r.date)}</Td><Td>{r.particulars}</Td><Td nowrap>{r.ref}</Td>
                    <Td r>{fmtWeight(r.issuedWeight)}</Td><Td r>{fmtWeight(r.issuedAlloy)}</Td><Td r>{fmtWeight(r.issuedTotal)}</Td>
                    <Td r>{fmtWeight(r.receivedWeight)}</Td><Td r>{fmtWeight(r.receivedWastage)}</Td><Td r>{fmtWeight(r.receivedTotal)}</Td>
                    <Td r strong>{signed(r.balanceWeight, "w")}</Td><Td r>{fmtMoney(r.labour)}</Td><Td r>{fmtMoney(r.payment)}</Td><Td r strong>{signed(r.balanceAmount, "m")}</Td>
                  </tr>
                ))}
                <tr className="border-t-2 border-border font-semibold">
                  <Td /><Td>Total</Td><Td />
                  <Td r>{fmtWeight((statement.data as any).totals.issuedWeight)}</Td><Td r>{fmtWeight((statement.data as any).totals.issuedAlloy)}</Td><Td r>{fmtWeight((statement.data as any).totals.issuedTotal)}</Td>
                  <Td r>{fmtWeight((statement.data as any).totals.receivedWeight)}</Td><Td r>{fmtWeight((statement.data as any).totals.receivedWastage)}</Td><Td r>{fmtWeight((statement.data as any).totals.receivedTotal)}</Td>
                  <Td r>{signed((statement.data as any).closing.weight, "w")}</Td><Td r>{fmtMoney((statement.data as any).totals.labour)}</Td><Td r>{fmtMoney((statement.data as any).totals.payment)}</Td><Td r>{signed((statement.data as any).closing.amount, "m")}</Td>
                </tr>
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted-foreground">
              Balance weight = metal still with the karigar (issued − received). Balance amount = payments − labour (minus means the shop owes the karigar).
            </p>
          </Report>
        ) : (
          <Empty>{vendorLabel ? "Click View to see the statement." : "Choose a karigar, the metal and dates, then click View."}</Empty>
        )
      )}

      {/* Balances */}
      {tab === "balances" && !loading && balances.data && (
        <Report>
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/50"><Th>Karigar</Th><Th>Metal balance (gm)</Th><Th>Balance amount</Th></tr></thead>
            <tbody>
              {(balances.data as any[]).map(b => (
                <tr key={b.vendor.id} className="border-t border-border/60 cursor-pointer hover:bg-muted/30" onClick={() => { setVendorId(String(b.vendor.id)); setTab("statement"); setRun(r => r + 1); }}>
                  <Td>{b.vendor.label}</Td>
                  <Td>{b.metals.length ? b.metals.map((m: any) => <div key={m.metal}>{m.metal}: <span className="font-mono">{m.weight.toFixed(3)}</span></div>) : "—"}</Td>
                  <Td r strong>{signed(b.balanceAmount, "m")}</Td>
                </tr>
              ))}
            </tbody>
          </table>
          {!(balances.data as any[]).length && <Empty>No karigar activity yet.</Empty>}
          <p className="mt-3 text-xs text-muted-foreground">Click a karigar to open the statement.</p>
        </Report>
      )}

      {/* Movements */}
      {(tab === "issue" || tab === "return" || tab === "received") && !loading && movements.data && (
        <Report>
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              {tab === "received" ? (
                <tr className="bg-muted/50"><Th>Date</Th><Th>Ref #</Th><Th>Karigar</Th><Th>Particulars</Th><Th>Metal</Th><Th>Weight</Th><Th>Wastage</Th><Th>Total</Th></tr>
              ) : (
                <tr className="bg-muted/50"><Th>Date</Th><Th>Ref #</Th><Th>Karigar</Th><Th>Item</Th><Th>Weight</Th>{tab === "issue" && <><Th>Alloy (raati)</Th><Th>Net</Th><Th>Item In</Th></>}<Th>Comments</Th></tr>
              )}
            </thead>
            <tbody>
              {(movements.data as any[]).map((r, i) => (
                <tr key={i} className="border-t border-border/60">
                  <Td nowrap>{fmtDate(r.date)}</Td><Td nowrap>{r.ref}</Td><Td>{r.vendor}</Td>
                  {tab === "received" ? (
                    <>
                      <Td>{[r.customer, r.itemName, r.processType].filter(Boolean).join(", ")}</Td><Td>{r.metal}</Td>
                      <Td r>{fmtWeight(r.weight)}</Td><Td r>{fmtWeight(r.wastage)}</Td><Td r strong>{fmtWeight(r.total)}</Td>
                    </>
                  ) : (
                    <>
                      <Td>{r.metal}</Td><Td r>{fmtWeight(r.weight)}</Td>
                      {tab === "issue" && <><Td r>{r.alloyRaati || ""}</Td><Td r strong>{fmtWeight(r.total)}</Td><Td>{r.itemIn}</Td></>}
                      <Td>{r.comments}</Td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!(movements.data as any[]).length && <Empty>Nothing in these dates.</Empty>}
        </Report>
      )}

      {/* Stock ready items: karigar work finished, not delivered yet */}
      {tab === "ready" && !loading && ready.data && (
        <Report>
          <table className="w-full min-w-[960px] text-sm">
            <thead><tr className="bg-muted/50"><Th>Order</Th><Th>Customer</Th><Th>Item</Th><Th>Metal</Th><Th>Weight</Th><Th>Karigar</Th><Th>Ready since</Th><Th>Delivery date</Th><Th>Invoice</Th></tr></thead>
            <tbody>
              {(ready.data as any[]).map(r => (
                <tr key={r.itemId} className="border-t border-border/60 cursor-pointer hover:bg-muted/30" onClick={() => setLocation(`/orders/${r.orderId}`)}>
                  <Td nowrap>{r.orderNumber}</Td><Td>{r.customer}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      {r.image && <img src={r.image} alt="" className="h-9 w-9 rounded object-cover" loading="lazy" />}
                      {r.itemName}
                    </div>
                  </Td>
                  <Td>{r.metal}</Td><Td r>{fmtWeight(r.receivedWeight)}</Td><Td>{r.karigar}</Td>
                  <Td nowrap>{fmtDate(r.readySince)}</Td><Td nowrap>{fmtDate(r.expectedDelivery)}</Td>
                  <Td>{r.invoice ?? <span className="text-amber-600">Not invoiced</span>}</Td>
                </tr>
              ))}
            </tbody>
          </table>
          {!(ready.data as any[]).length && <Empty>No ready items. An item shows here when all its processes are Complete and the order is not delivered.</Empty>}
        </Report>
      )}

      {/* Stock position */}
      {tab === "position" && !loading && position.data && (
        <div className="space-y-4">
          <Report title="Metals (grams)">
            <table className="w-full min-w-[760px] text-sm">
              <thead><tr className="bg-muted/50"><Th>Metal</Th><Th>Purchased</Th><Th>Sold</Th><Th>Issued to karigar</Th><Th>Returned</Th><Th>In shop</Th><Th>With karigars</Th></tr></thead>
              <tbody>
                {(position.data as any).metals.map((m: any) => (
                  <tr key={m.metal} className="border-t border-border/60">
                    <Td>{m.metal}</Td><Td r>{fmtWeight(m.purchased)}</Td><Td r>{fmtWeight(m.sold)}</Td><Td r>{fmtWeight(m.issued)}</Td><Td r>{fmtWeight(m.returned)}</Td>
                    <Td r strong>{signed(m.inShop, "w")}</Td><Td r strong>{signed(m.withKarigars, "w")}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!(position.data as any).metals.length && <Empty>No metal vouchers yet.</Empty>}
          </Report>
          <Report title="Gems">
            <table className="w-full min-w-[760px] text-sm">
              <thead><tr className="bg-muted/50"><Th>Gem</Th><Th>Unit</Th><Th>Purchased qty</Th><Th>Purchased wgt</Th><Th>Sold qty</Th><Th>Sold wgt</Th><Th>In stock qty</Th><Th>In stock wgt</Th></tr></thead>
              <tbody>
                {(position.data as any).gems.map((g: any) => (
                  <tr key={`${g.gem}${g.unit}`} className="border-t border-border/60">
                    <Td>{g.gem}</Td><Td>{g.unit}</Td><Td r>{g.purchasedQty}</Td><Td r>{fmtWeight(g.purchasedWeight)}</Td><Td r>{g.soldQty}</Td><Td r>{fmtWeight(g.soldWeight)}</Td>
                    <Td r strong>{g.inStockQty}</Td><Td r strong>{signed(g.inStockWeight, "w")}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!(position.data as any).gems.length && <Empty>No gem vouchers yet.</Empty>}
          </Report>
          <Report title="Jewellery">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/50"><Th>Item</Th><Th>Bought</Th><Th>Sold</Th><Th>In stock</Th><Th>In stock wgt</Th></tr></thead>
              <tbody>
                {(position.data as any).jewellery.map((j: any) => (
                  <tr key={j.type} className="border-t border-border/60">
                    <Td>{j.type}</Td><Td r>{j.bought}</Td><Td r>{j.sold}</Td><Td r strong>{j.inStock}</Td><Td r>{signed(j.inStockWeight, "w")}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!(position.data as any).jewellery.length && <Empty>No jewellery vouchers yet.</Empty>}
          </Report>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
function Report({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {title && <h3 className="mb-2 text-sm font-semibold text-foreground">{title}</h3>}
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
function Th({ children, rowSpan, colSpan }: { children?: React.ReactNode; rowSpan?: number; colSpan?: number }) {
  return <th rowSpan={rowSpan} colSpan={colSpan} className="border border-border/70 px-2 py-1.5 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">{children}</th>;
}
function Td({ children, r, strong, nowrap }: { children?: React.ReactNode; r?: boolean; strong?: boolean; nowrap?: boolean }) {
  return <td className={cn("border border-border/50 px-2 py-1.5 align-top text-foreground", r && "text-right tabular-nums", strong && "font-semibold", nowrap && "whitespace-nowrap")}>{children}</td>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{children}</p>;
}
