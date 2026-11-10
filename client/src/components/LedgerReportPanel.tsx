import { useState } from "react";
import { Loader2, Printer, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/DateInput";
import { LedgerSelect, type LedgerOption } from "@/components/LedgerSelect";
import { escapeHtml as e, fmtDate, printReport } from "@/lib/printReport";

const money = (value: string | number) => {
  const n = Number(value);
  return !Number.isFinite(n) || n === 0 ? "" : n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const yearStart = () => `${new Date().getFullYear()}-01-01`;
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Zewar "Ledger View": account From–To and Date From–To, then a printable Ledger Report with Balance B/F. */
export function LedgerReportPanel({ accounts }: { accounts: LedgerOption[] }) {
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [from, setFrom] = useState(yearStart());
  const [to, setTo] = useState(today());
  const [params, setParams] = useState<{ fromAccountId: number; toAccountId?: number; from: string; to: string } | null>(null);

  const report = trpc.finance.reports.ledgerReport.useQuery(params ?? { fromAccountId: 0 }, { enabled: !!params });
  const view = () => fromAccount && setParams({ fromAccountId: Number(fromAccount), toAccountId: toAccount ? Number(toAccount) : undefined, from, to });

  const print = () => {
    const data = (report.data ?? []) as any[];
    const body = data
      .map(
        r => `<p class="head">${e(r.account.code)} ${e(r.account.title)}</p>
<table><thead><tr><th>DATE</th><th>VOUCHER #</th><th>PARTICULARS</th><th>NARRATION</th><th>DEBIT</th><th>CREDIT</th><th>BALANCE</th></tr></thead><tbody>
<tr class="bf"><td></td><td></td><td>BALANCE B/F</td><td></td><td></td><td></td><td class="r">${money(r.broughtForward) || "0.00"} ${r.broughtForwardSide}</td></tr>
${r.rows
  .map(
    (row: any) =>
      `<tr><td>${fmtDate(row.date)}</td><td>${e(row.voucher)}</td><td>${e(row.particulars)}</td><td>${e(row.narration)}</td><td class="r">${money(row.debit)}</td><td class="r">${money(row.credit)}</td><td class="r">${money(row.balance) || "0.00"} ${row.balanceSide}</td></tr>`
  )
  .join("")}
<tr class="total"><td></td><td></td><td>TOTAL</td><td></td><td class="r">${money(r.debitTotal) || "0.00"}</td><td class="r">${money(r.creditTotal) || "0.00"}</td><td class="r">${money(r.closing) || "0.00"} ${r.closingSide}</td></tr></tbody></table>`
      )
      .join("");
    printReport("Ledger Report", `<h1>Ledger Report</h1><p class="sub">Date From ${from} To ${to}</p>${body || "<p>No entries.</p>"}`, { landscape: true });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px_160px_auto] lg:items-end">
          <Field label="Ledger account — From"><LedgerSelect accounts={accounts} value={fromAccount} onChange={setFromAccount} placeholder="Choose account" /></Field>
          <Field label="To (optional, for a range)"><LedgerSelect accounts={accounts} value={toAccount} onChange={setToAccount} placeholder="Same account" /></Field>
          <Field label="Date From"><DateInput value={from} onChange={setFrom} clearable={false} /></Field>
          <Field label="Date To"><DateInput value={to} onChange={setTo} clearable={false} /></Field>
          <div className="flex gap-2">
            <Button onClick={view} disabled={!fromAccount} className="gold-gradient text-primary-foreground border-0"><Search className="mr-1.5 h-4 w-4" />View</Button>
            <Button variant="outline" onClick={print} disabled={!report.data?.length}><Printer className="mr-1.5 h-4 w-4" />Print</Button>
          </div>
        </div>
      </div>

      {report.isFetching && <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
      {!report.isFetching && params && !(report.data ?? []).length && <p className="py-10 text-center text-sm text-muted-foreground">No entries for these accounts and dates.</p>}

      {!report.isFetching &&
        ((report.data ?? []) as any[]).map(r => (
          <div key={r.account.id} className="rounded-xl border border-border bg-card p-4">
            <p className="mb-2 text-sm font-semibold text-foreground"><span className="font-mono text-primary">{r.account.code}</span> {r.account.title}</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Date</th>
                    <th className="px-3 py-2 text-left font-medium">Voucher #</th>
                    <th className="px-3 py-2 text-left font-medium">Particulars</th>
                    <th className="px-3 py-2 text-left font-medium">Narration</th>
                    <th className="px-3 py-2 text-right font-medium">Debit</th>
                    <th className="px-3 py-2 text-right font-medium">Credit</th>
                    <th className="px-3 py-2 text-right font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border/60 italic text-muted-foreground">
                    <td className="px-3 py-2" colSpan={2} /><td className="px-3 py-2">Balance B/F</td><td colSpan={3} />
                    <td className="px-3 py-2 text-right tabular-nums">{money(r.broughtForward) || "0.00"} {r.broughtForwardSide}</td>
                  </tr>
                  {r.rows.map((row: any, i: number) => (
                    <tr key={i} className="border-t border-border/60">
                      <td className="whitespace-nowrap px-3 py-2">{fmtDate(row.date)}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-primary">{row.voucher}</td>
                      <td className="px-3 py-2">{row.particulars}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.narration}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{money(row.debit)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{money(row.credit)}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums">{money(row.balance) || "0.00"} {row.balanceSide}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border font-semibold">
                    <td colSpan={2} /><td className="px-3 py-2">Total</td><td />
                    <td className="px-3 py-2 text-right tabular-nums">{money(r.debitTotal) || "0.00"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(r.creditTotal) || "0.00"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(r.closing) || "0.00"} {r.closingSide}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}
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

export default LedgerReportPanel;
