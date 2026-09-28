import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Banknote, CircleDollarSign, FileCheck2, ReceiptText, Search } from "lucide-react";
import { useLocation } from "wouter";

const money = (value: string | number | null | undefined) => `PKR ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const statusStyles: Record<string, string> = {
  draft: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
  sent: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  paid: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  cancelled: "bg-rose-500/10 text-rose-500 border-rose-500/20",
};

export default function Invoices() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const invoices = trpc.invoices.list.useQuery();

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return (invoices.data || []).filter(row => {
      const customer = `${row.customerFirstName || ""} ${row.customerLastName || ""}`.trim();
      const matchesSearch = !query || `${row.invoice.invoiceNumber || ""} ${row.orderNumber || ""} ${customer}`.toLowerCase().includes(query);
      const matchesStatus = status === "all" || row.invoice.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [invoices.data, search, status]);

  const totals = useMemo(() => {
    return (invoices.data || []).reduce((summary, row) => {
      const amount = Number(row.invoice.totalAmount || 0);
      summary.billed += row.invoice.status === "cancelled" ? 0 : amount;
      summary.paid += row.invoice.status === "paid" ? amount : 0;
      summary.outstanding += row.invoice.status !== "paid" && row.invoice.status !== "cancelled" ? amount : 0;
      return summary;
    }, { billed: 0, paid: 0, outstanding: 0 });
  }, [invoices.data]);

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary mb-2"><ReceiptText className="h-4 w-4" />Operations & Finance</div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Sales Invoices</h1>
        <p className="text-sm text-muted-foreground mt-1">Review invoices generated from Sales Orders and their posting status.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard icon={CircleDollarSign} label="Total Billed" value={totals.billed} tone="text-cyan-500" bg="bg-cyan-500/10" />
        <SummaryCard icon={FileCheck2} label="Paid" value={totals.paid} tone="text-emerald-500" bg="bg-emerald-500/10" />
        <SummaryCard icon={Banknote} label="Outstanding" value={totals.outstanding} tone="text-amber-500" bg="bg-amber-500/10" />
      </div>

      <Card className="border-border">
        <CardContent className="p-0">
          <div className="p-5 flex flex-col sm:flex-row gap-3 border-b border-border">
            <div className="relative flex-1 max-w-lg"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search invoice, order, or customer" className="pl-9" /></div>
            <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="sent">Sent / Posted</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/30"><th className="px-5 py-3 text-left">Invoice</th><th className="px-5 py-3 text-left">Order</th><th className="px-5 py-3 text-left">Customer</th><th className="px-5 py-3 text-left">Date</th><th className="px-5 py-3 text-left">Status</th><th className="px-5 py-3 text-right">Amount</th><th className="px-5 py-3 text-right">Action</th></tr></thead>
              <tbody>{filtered.map(row => <tr key={row.invoice.id} className="border-b border-border/60 hover:bg-muted/20"><td className="px-5 py-4 font-mono text-xs text-primary">{row.invoice.invoiceNumber || `INV-${row.invoice.id}`}</td><td className="px-5 py-4 font-medium text-foreground">{row.orderNumber || `Order #${row.invoice.orderId}`}</td><td className="px-5 py-4 text-muted-foreground">{`${row.customerFirstName || ""} ${row.customerLastName || ""}`.trim() || "—"}</td><td className="px-5 py-4 text-muted-foreground">{new Date(row.invoice.invoiceDate || row.invoice.createdAt).toLocaleDateString()}</td><td className="px-5 py-4"><Badge variant="outline" className={statusStyles[row.invoice.status || "draft"]}>{row.invoice.status === "sent" ? "Sent / Posted" : (row.invoice.status || "draft")}</Badge></td><td className="px-5 py-4 text-right font-semibold">{money(row.invoice.totalAmount)}</td><td className="px-5 py-4 text-right"><Button variant="ghost" size="sm" onClick={() => setLocation(`/orders/${row.invoice.orderId}`)}>View Order</Button></td></tr>)}</tbody>
            </table>
          </div>
          {!invoices.isLoading && !filtered.length && <div className="py-14 text-center"><ReceiptText className="h-8 w-8 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">No invoices match these filters.</p></div>}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, tone, bg }: { icon: typeof ReceiptText; label: string; value: number; tone: string; bg: string }) {
  return <Card className="border-border bg-card/80"><CardContent className="p-5 flex items-center justify-between"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p><p className="text-xl font-semibold text-foreground mt-2">{money(value)}</p></div><div className={`h-11 w-11 rounded-xl ${bg} flex items-center justify-center`}><Icon className={`h-5 w-5 ${tone}`} /></div></CardContent></Card>;
}
