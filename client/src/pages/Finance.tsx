import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { DateInput } from "@/components/DateInput";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  BookOpenCheck,
  Building2,
  CircleDollarSign,
  Landmark,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  Trash2,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";

type VoucherLine = { accountId: string; amount: string; description: string };
type GeneralLine = { accountId: string; side: "debit" | "credit"; amount: string; description: string };

const today = () => new Date().toISOString().split("T")[0];
const money = (value: string | number | null | undefined) => `PKR ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const entryLabels: Record<string, string> = {
  cash_receipt: "Cash Receive",
  cash_payment: "Cash Payment",
  general_journal: "General Journal",
  sales_invoice: "Sales Invoice",
  customer_advance: "Customer Advance",
  reversal: "Reversal",
  opening_balance: "Opening Balance",
};

export default function Finance() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState("overview");
  const [accountSearch, setAccountSearch] = useState("");
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showVoucherDialog, setShowVoucherDialog] = useState(false);
  const [showJournalDialog, setShowJournalDialog] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [reversingEntryId, setReversingEntryId] = useState<number | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [deletingVoucherId, setDeletingVoucherId] = useState<number | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [showCashAccountDialog, setShowCashAccountDialog] = useState(false);
  const [cashAccountForm, setCashAccountForm] = useState({ title: "", description: "", openingBalance: "0" });

  const [accountForm, setAccountForm] = useState({
    code: "",
    title: "",
    description: "",
    accountClass: "asset" as "asset" | "liability" | "equity" | "income" | "expense",
    ledgerType: "detail" as "control" | "detail",
    parentId: "",
    openingBalance: "0",
    openingBalanceSide: "debit" as "debit" | "credit",
    isInventory: false,
  });

  const [voucherForm, setVoucherForm] = useState({
    voucherType: "cash_receipt" as "cash_receipt" | "cash_payment",
    entryDate: today(),
    cashAccountId: "",
    narration: "",
  });
  const [voucherLines, setVoucherLines] = useState<VoucherLine[]>([{ accountId: "", amount: "", description: "" }]);

  const [journalForm, setJournalForm] = useState({ entryDate: today(), narration: "" });
  const [journalLines, setJournalLines] = useState<GeneralLine[]>([
    { accountId: "", side: "debit", amount: "", description: "" },
    { accountId: "", side: "credit", amount: "", description: "" },
  ]);

  const summary = trpc.finance.summary.useQuery();
  const accounts = trpc.finance.accounts.list.useQuery({ activeOnly: false });
  const journals = trpc.finance.journals.list.useQuery({ limit: 100 });
  const trialBalance = trpc.finance.reports.trialBalance.useQuery();
  const accountLedger = trpc.finance.reports.accountLedger.useQuery(
    { accountId: Number(selectedAccountId) },
    { enabled: Boolean(selectedAccountId) },
  );

  const refreshFinance = async () => {
    await Promise.all([
      utils.finance.summary.invalidate(),
      utils.finance.accounts.list.invalidate(),
      utils.finance.journals.list.invalidate(),
      utils.finance.reports.trialBalance.invalidate(),
      utils.finance.reports.accountLedger.invalidate(),
    ]);
  };

  const createAccount = trpc.finance.accounts.create.useMutation({
    onSuccess: async () => {
      toast.success("Ledger account created");
      setShowAccountDialog(false);
      setAccountForm({ code: "", title: "", description: "", accountClass: "asset", ledgerType: "detail", parentId: "", openingBalance: "0", openingBalanceSide: "debit", isInventory: false });
      await refreshFinance();
    },
    onError: error => toast.error(error.message),
  });

  const createVoucher = trpc.finance.vouchers.create.useMutation({
    onSuccess: async data => {
      toast.success(`Voucher ${data.entryNumber} posted`);
      setShowVoucherDialog(false);
      setVoucherForm({ voucherType: "cash_receipt", entryDate: today(), cashAccountId: "", narration: "" });
      setVoucherLines([{ accountId: "", amount: "", description: "" }]);
      await refreshFinance();
    },
    onError: error => toast.error(error.message),
  });

  const createJournal = trpc.finance.journals.create.useMutation({
    onSuccess: async data => {
      toast.success(`Journal ${data.entryNumber} posted`);
      setShowJournalDialog(false);
      setJournalForm({ entryDate: today(), narration: "" });
      setJournalLines([
        { accountId: "", side: "debit", amount: "", description: "" },
        { accountId: "", side: "credit", amount: "", description: "" },
      ]);
      await refreshFinance();
    },
    onError: error => toast.error(error.message),
  });

  const deleteVoucher = trpc.finance.vouchers.delete.useMutation({
    onSuccess: async () => {
      toast.success("Voucher deleted (a reversal entry was posted)");
      setDeletingVoucherId(null);
      setDeleteReason("");
      await refreshFinance();
    },
    onError: error => toast.error(error.message),
  });

  const createCashAccount = trpc.finance.accounts.create.useMutation({
    onSuccess: async (account: { id: number; code: string; title: string }) => {
      toast.success(`${account.title} (${account.code}) added`);
      setShowCashAccountDialog(false);
      setCashAccountForm({ title: "", description: "", openingBalance: "0" });
      await refreshFinance();
      setVoucherForm(form => ({ ...form, cashAccountId: String(account.id) }));
    },
    onError: error => toast.error(error.message),
  });

  const reverseJournal = trpc.finance.journals.reverse.useMutation({
    onSuccess: async data => {
      toast.success(`Reversal ${data.entryNumber} posted`);
      setReversingEntryId(null);
      setReversalReason("");
      await refreshFinance();
    },
    onError: error => toast.error(error.message),
  });

  const detailAccounts = useMemo(() => accounts.data?.filter(account => account.ledgerType === "detail" && account.isActive) || [], [accounts.data]);
  const controlAccounts = useMemo(() => accounts.data?.filter(account => account.ledgerType === "control" && account.isActive) || [], [accounts.data]);
  const cashAccounts = useMemo(() => detailAccounts.filter(account => account.code.startsWith("CA")), [detailAccounts]);
  const cashControlAccount = useMemo(() => accounts.data?.find(account => account.code === "CA000000"), [accounts.data]);

  const submitCashAccount = () => {
    if (!cashAccountForm.title.trim()) return toast.error("Account name is required");
    if (!cashControlAccount) return toast.error("Cash / Bank control account is not set up yet");
    createCashAccount.mutate({
      title: cashAccountForm.title.trim(),
      description: cashAccountForm.description || undefined,
      accountClass: "asset",
      ledgerType: "detail",
      parentId: cashControlAccount.id,
      openingBalance: cashAccountForm.openingBalance || "0",
      openingBalanceSide: "debit",
      isInventory: false,
      isActive: true,
    });
  };
  const filteredAccounts = useMemo(() => {
    const query = accountSearch.toLowerCase();
    return accounts.data?.filter(account => `${account.code} ${account.title} ${account.parentTitle || ""}`.toLowerCase().includes(query)) || [];
  }, [accounts.data, accountSearch]);

  const voucherTotal = voucherLines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
  const journalDebit = journalLines.filter(line => line.side === "debit").reduce((sum, line) => sum + Number(line.amount || 0), 0);
  const journalCredit = journalLines.filter(line => line.side === "credit").reduce((sum, line) => sum + Number(line.amount || 0), 0);

  const submitAccount = () => {
    if (!accountForm.title.trim()) return toast.error("Account title is required");
    if (accountForm.ledgerType === "detail" && !accountForm.parentId) return toast.error("Select a parent control account");
    createAccount.mutate({
      code: accountForm.code.trim() ? accountForm.code.trim().toUpperCase().replace(/\s+/g, "") : undefined,
      title: accountForm.title.trim(),
      description: accountForm.description || undefined,
      accountClass: accountForm.accountClass,
      ledgerType: accountForm.ledgerType,
      parentId: accountForm.parentId ? Number(accountForm.parentId) : undefined,
      openingBalance: accountForm.openingBalance || "0",
      openingBalanceSide: accountForm.openingBalanceSide,
      isInventory: accountForm.isInventory,
      isActive: true,
    });
  };

  const submitVoucher = () => {
    if (!voucherForm.cashAccountId) return toast.error("Select a cash or bank account");
    const validLines = voucherLines.filter(line => line.accountId && Number(line.amount) > 0);
    if (!validLines.length) return toast.error("Add at least one valid voucher line");
    createVoucher.mutate({
      voucherType: voucherForm.voucherType,
      entryDate: voucherForm.entryDate,
      cashAccountId: Number(voucherForm.cashAccountId),
      narration: voucherForm.narration || undefined,
      counterpartLines: validLines.map(line => ({ accountId: Number(line.accountId), amount: line.amount, description: line.description || undefined })),
    });
  };

  const submitJournal = () => {
    if (!journalForm.narration.trim()) return toast.error("Narration is required");
    const validLines = journalLines.filter(line => line.accountId && Number(line.amount) > 0);
    if (validLines.length < 2) return toast.error("Add at least two valid journal lines");
    if (Math.round(journalDebit * 100) !== Math.round(journalCredit * 100)) return toast.error("Debit and credit totals must be equal");
    createJournal.mutate({
      entryDate: journalForm.entryDate,
      narration: journalForm.narration,
      lines: validLines.map(line => ({
        accountId: Number(line.accountId),
        description: line.description || undefined,
        debit: line.side === "debit" ? line.amount : "0",
        credit: line.side === "credit" ? line.amount : "0",
      })),
    });
  };

  const summaryCards = [
    { label: "Cash & Bank", value: summary.data?.cash, icon: Landmark, tone: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Receivables", value: summary.data?.receivables, icon: Users, tone: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Customer Credits", value: summary.data?.customerCredits, icon: WalletCards, tone: "text-violet-500", bg: "bg-violet-500/10" },
    { label: "Vendor Payables", value: summary.data?.vendorPayables, icon: Building2, tone: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Sales Revenue", value: summary.data?.revenue, icon: TrendingUp, tone: "text-cyan-500", bg: "bg-cyan-500/10" },
    { label: "Expenses", value: summary.data?.expenses, icon: ReceiptText, tone: "text-rose-500", bg: "bg-rose-500/10" },
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary mb-2">
            <CircleDollarSign className="h-4 w-4" /> Operations & Finance
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Finance Control Center</h1>
          <p className="text-sm text-muted-foreground mt-1">Double-entry accounts, cash book, journals, and live balances connected to orders.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowAccountDialog(true)}><Plus className="h-4 w-4 mr-2" />New Ledger</Button>
          <Button variant="outline" onClick={() => setShowJournalDialog(true)}><BookOpenCheck className="h-4 w-4 mr-2" />General Journal</Button>
          <Button onClick={() => setShowVoucherDialog(true)} className="gold-gradient text-primary-foreground border-0"><ReceiptText className="h-4 w-4 mr-2" />Cash Voucher</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {summaryCards.map(({ label, value, icon: Icon, tone, bg }) => (
          <Card key={label} className="border-border/70 bg-card/80 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="text-xl font-semibold text-foreground mt-2">{summary.isLoading ? "—" : money(value)}</p>
              </div>
              <div className={`h-11 w-11 rounded-xl ${bg} flex items-center justify-center`}><Icon className={`h-5 w-5 ${tone}`} /></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto flex-wrap bg-card border border-border p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="accounts">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="cashbook">Cash Book</TabsTrigger>
          <TabsTrigger value="journal">General Journal</TabsTrigger>
          <TabsTrigger value="ledger">Account Ledger</TabsTrigger>
          <TabsTrigger value="trial">Trial Balance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5 grid grid-cols-1 xl:grid-cols-[1.4fr_0.6fr] gap-5">
          <Card className="border-border">
            <CardHeader className="pb-3"><CardTitle className="text-base">Recent Finance Activity</CardTitle></CardHeader>
            <CardContent className="p-0">
              <JournalTable entries={journals.data || []} canReverse={user?.role === "admin"} onReverse={setReversingEntryId} />
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader className="pb-3"><CardTitle className="text-base">Controls</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <QuickAction icon={ArrowDownLeft} title="Receive money" description="Debit cash, credit customer or ledger" onClick={() => { setVoucherForm(form => ({ ...form, voucherType: "cash_receipt" })); setShowVoucherDialog(true); }} />
              <QuickAction icon={ArrowUpRight} title="Make payment" description="Debit expense/vendor, credit cash" onClick={() => { setVoucherForm(form => ({ ...form, voucherType: "cash_payment" })); setShowVoucherDialog(true); }} />
              <QuickAction icon={BookOpenCheck} title="Post adjustment" description="Create a balanced general journal" onClick={() => setShowJournalDialog(true)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="mt-5">
          <Card className="border-border">
            <CardHeader className="flex-row items-center justify-between gap-4">
              <div><CardTitle className="text-base">Chart of Accounts</CardTitle><p className="text-sm text-muted-foreground mt-1">Control and detail ledgers with live balances.</p></div>
              <div className="relative w-full max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={accountSearch} onChange={event => setAccountSearch(event.target.value)} placeholder="Search code or title" className="pl-9" /></div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-y border-border bg-muted/30"><th className="px-5 py-3 text-left">Code</th><th className="px-5 py-3 text-left">Title</th><th className="px-5 py-3 text-left">Parent</th><th className="px-5 py-3 text-left">Class</th><th className="px-5 py-3 text-left">Type</th><th className="px-5 py-3 text-right">Balance</th></tr></thead>
                <tbody>{filteredAccounts.map(account => <tr key={account.id} className="border-b border-border/60 hover:bg-muted/20"><td className="px-5 py-3 font-mono text-xs text-primary">{account.code}</td><td className="px-5 py-3 font-medium text-foreground">{account.title}{account.isSystem && <Badge variant="outline" className="ml-2 text-[10px]">System</Badge>}</td><td className="px-5 py-3 text-muted-foreground">{account.parentTitle || "—"}</td><td className="px-5 py-3 capitalize text-muted-foreground">{account.accountClass}</td><td className="px-5 py-3 capitalize text-muted-foreground">{account.ledgerType}</td><td className="px-5 py-3 text-right font-medium">{money(account.balance)} <span className="text-xs text-muted-foreground uppercase">{account.balanceSide === "debit" ? "Dr" : "Cr"}</span></td></tr>)}</tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cashbook" className="mt-5">
          <Card className="border-border"><CardHeader className="flex-row items-center justify-between"><div><CardTitle className="text-base">Cash Book</CardTitle><p className="text-sm text-muted-foreground mt-1">Posted cash receives and cash payments.</p></div><Button onClick={() => setShowVoucherDialog(true)}><Plus className="h-4 w-4 mr-2" />New Voucher</Button></CardHeader><CardContent className="p-0"><JournalTable entries={(journals.data || []).filter(item => item.entry.entryType === "cash_receipt" || item.entry.entryType === "cash_payment")} canReverse={false} onReverse={setReversingEntryId} onDelete={setDeletingVoucherId} /></CardContent></Card>
        </TabsContent>

        <TabsContent value="journal" className="mt-5">
          <Card className="border-border"><CardHeader className="flex-row items-center justify-between"><div><CardTitle className="text-base">General Journal</CardTitle><p className="text-sm text-muted-foreground mt-1">Manual adjustments and system-generated entries.</p></div><Button onClick={() => setShowJournalDialog(true)}><Plus className="h-4 w-4 mr-2" />New Entry</Button></CardHeader><CardContent className="p-0"><JournalTable entries={journals.data || []} canReverse={user?.role === "admin"} onReverse={setReversingEntryId} /></CardContent></Card>
        </TabsContent>

        <TabsContent value="ledger" className="mt-5 space-y-4">
          <Card className="border-border"><CardContent className="p-5"><Label className="text-sm">Select Detail Ledger</Label><Select value={selectedAccountId} onValueChange={setSelectedAccountId}><SelectTrigger className="mt-2 max-w-lg"><SelectValue placeholder="Choose an account" /></SelectTrigger><SelectContent>{detailAccounts.map(account => <SelectItem key={account.id} value={String(account.id)}>{account.code} — {account.title}</SelectItem>)}</SelectContent></Select></CardContent></Card>
          {selectedAccountId && <Card className="border-border"><CardHeader><CardTitle className="text-base">{accountLedger.data?.account.code} — {accountLedger.data?.account.title}</CardTitle></CardHeader><CardContent className="p-0 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-y border-border bg-muted/30"><th className="px-5 py-3 text-left">Date</th><th className="px-5 py-3 text-left">Entry</th><th className="px-5 py-3 text-left">Narration</th><th className="px-5 py-3 text-right">Debit</th><th className="px-5 py-3 text-right">Credit</th><th className="px-5 py-3 text-right">Balance</th></tr></thead><tbody>{accountLedger.data?.transactions.map(({ entry, line, runningBalance, runningBalanceSide }) => <tr key={line.id} className="border-b border-border/60"><td className="px-5 py-3">{new Date(entry.entryDate).toLocaleDateString()}</td><td className="px-5 py-3 font-mono text-xs text-primary">{entry.entryNumber}</td><td className="px-5 py-3 text-muted-foreground">{line.description || entry.narration || "—"}</td><td className="px-5 py-3 text-right">{money(line.debit)}</td><td className="px-5 py-3 text-right">{money(line.credit)}</td><td className="px-5 py-3 text-right font-medium">{money(runningBalance)} <span className="text-xs uppercase text-muted-foreground">{runningBalanceSide === "debit" ? "Dr" : "Cr"}</span></td></tr>)}</tbody></table>{!accountLedger.data?.transactions.length && <div className="py-10 text-center text-sm text-muted-foreground">No posted transactions for this account.</div>}</CardContent></Card>}
        </TabsContent>

        <TabsContent value="trial" className="mt-5">
          <Card className="border-border"><CardHeader><CardTitle className="text-base">Trial Balance</CardTitle><p className="text-sm text-muted-foreground mt-1">All active detail-ledger balances. Total debits must equal total credits.</p></CardHeader><CardContent className="p-0 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-y border-border bg-muted/30"><th className="px-5 py-3 text-left">Code</th><th className="px-5 py-3 text-left">Account</th><th className="px-5 py-3 text-right">Debit</th><th className="px-5 py-3 text-right">Credit</th></tr></thead><tbody>{trialBalance.data?.rows.map(row => <tr key={row.id} className="border-b border-border/60"><td className="px-5 py-3 font-mono text-xs text-primary">{row.code}</td><td className="px-5 py-3 font-medium">{row.title}</td><td className="px-5 py-3 text-right">{money(row.debit)}</td><td className="px-5 py-3 text-right">{money(row.credit)}</td></tr>)}</tbody><tfoot><tr className="bg-primary/5 font-semibold"><td className="px-5 py-4" colSpan={2}>Total</td><td className="px-5 py-4 text-right">{money(trialBalance.data?.totalDebit)}</td><td className="px-5 py-4 text-right">{money(trialBalance.data?.totalCredit)}</td></tr></tfoot></table></CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>New Ledger Account</DialogTitle><DialogDescription>Create a control or detail ledger. Account codes and entity ledgers are generated automatically.</DialogDescription></DialogHeader><div className="grid grid-cols-2 gap-4 py-2"><Field label="Account Code (optional)"><Input value={accountForm.code} onChange={event => setAccountForm(form => ({ ...form, code: event.target.value }))} placeholder="Auto-generated" /></Field><Field label="Title"><Input value={accountForm.title} onChange={event => setAccountForm(form => ({ ...form, title: event.target.value }))} placeholder="Office Expense" /></Field><Field label="Ledger Type"><Select value={accountForm.ledgerType} onValueChange={(value: "control" | "detail") => setAccountForm(form => ({ ...form, ledgerType: value, parentId: value === "control" ? "" : form.parentId }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="control">Control</SelectItem><SelectItem value="detail">Detail</SelectItem></SelectContent></Select></Field><Field label="Account Class"><Select value={accountForm.accountClass} onValueChange={(value: typeof accountForm.accountClass) => setAccountForm(form => ({ ...form, accountClass: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["asset", "liability", "equity", "income", "expense"].map(value => <SelectItem key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</SelectItem>)}</SelectContent></Select></Field>{accountForm.ledgerType === "detail" && <div className="col-span-2"><Field label="Parent Control Ledger"><Select value={accountForm.parentId} onValueChange={value => setAccountForm(form => ({ ...form, parentId: value }))}><SelectTrigger><SelectValue placeholder="Select parent" /></SelectTrigger><SelectContent>{controlAccounts.map(account => <SelectItem key={account.id} value={String(account.id)}>{account.code} — {account.title}</SelectItem>)}</SelectContent></Select></Field></div>}<Field label="Opening Balance"><Input type="number" value={accountForm.openingBalance} onChange={event => setAccountForm(form => ({ ...form, openingBalance: event.target.value }))} /></Field><Field label="Balance Side"><Select value={accountForm.openingBalanceSide} onValueChange={(value: "debit" | "credit") => setAccountForm(form => ({ ...form, openingBalanceSide: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="debit">Debit</SelectItem><SelectItem value="credit">Credit</SelectItem></SelectContent></Select></Field><div className="col-span-2"><Field label="Description"><Textarea value={accountForm.description} onChange={event => setAccountForm(form => ({ ...form, description: event.target.value }))} rows={2} /></Field></div></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowAccountDialog(false)}>Cancel</Button><Button onClick={submitAccount} disabled={createAccount.isPending}>Create Ledger</Button></div></DialogContent></Dialog>

      <Dialog open={showVoucherDialog} onOpenChange={setShowVoucherDialog}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>{voucherForm.voucherType === "cash_receipt" ? "New Cash Receive" : "New Cash Payment"}</DialogTitle><DialogDescription>The cash-side entry is generated automatically; add one or more counterpart ledgers.</DialogDescription></DialogHeader><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Field label="Voucher Type"><Select value={voucherForm.voucherType} onValueChange={(value: "cash_receipt" | "cash_payment") => setVoucherForm(form => ({ ...form, voucherType: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash_receipt">Receive</SelectItem><SelectItem value="cash_payment">Payment</SelectItem></SelectContent></Select></Field><Field label="Date"><DateInput value={voucherForm.entryDate} onChange={value => setVoucherForm(form => ({ ...form, entryDate: value }))} clearable={false} /></Field><Field label="Cash / Bank / Online Account"><div className="flex gap-2"><Select value={voucherForm.cashAccountId} onValueChange={value => setVoucherForm(form => ({ ...form, cashAccountId: value }))}><SelectTrigger className="flex-1"><SelectValue placeholder="Select account" /></SelectTrigger><SelectContent>{cashAccounts.map(account => <SelectItem key={account.id} value={String(account.id)}>{account.code} — {account.title}</SelectItem>)}</SelectContent></Select><Button type="button" variant="outline" size="icon" title="Add bank / cash account" onClick={() => setShowCashAccountDialog(true)}><Plus className="h-4 w-4" /></Button></div></Field></div><Field label="Narration"><Input value={voucherForm.narration} onChange={event => setVoucherForm(form => ({ ...form, narration: event.target.value }))} placeholder="Payment or receive details" /></Field><div className="space-y-2"><div className="grid grid-cols-[1.2fr_1.4fr_0.7fr_36px] gap-2 text-xs text-muted-foreground px-1"><span>Ledger Account</span><span>Description</span><span>Amount</span><span /></div>{voucherLines.map((line, index) => <div key={index} className="grid grid-cols-[1.2fr_1.4fr_0.7fr_36px] gap-2"><Select value={line.accountId} onValueChange={value => setVoucherLines(lines => lines.map((item, itemIndex) => itemIndex === index ? { ...item, accountId: value } : item))}><SelectTrigger><SelectValue placeholder="Select ledger" /></SelectTrigger><SelectContent>{detailAccounts.filter(account => String(account.id) !== voucherForm.cashAccountId).map(account => <SelectItem key={account.id} value={String(account.id)}>{account.code} — {account.title}</SelectItem>)}</SelectContent></Select><Input value={line.description} onChange={event => setVoucherLines(lines => lines.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item))} placeholder="Line narration" /><Input type="number" value={line.amount} onChange={event => setVoucherLines(lines => lines.map((item, itemIndex) => itemIndex === index ? { ...item, amount: event.target.value } : item))} placeholder="0.00" /><Button variant="ghost" size="icon" disabled={voucherLines.length === 1} onClick={() => setVoucherLines(lines => lines.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4" /></Button></div>)}<Button variant="ghost" size="sm" onClick={() => setVoucherLines(lines => [...lines, { accountId: "", amount: "", description: "" }])}><Plus className="h-4 w-4 mr-1" />Add Line</Button></div><div className="flex items-center justify-between border-t border-border pt-4"><p className="font-semibold">Voucher Total: {money(voucherTotal)}</p><div className="flex gap-2"><Button variant="outline" onClick={() => setShowVoucherDialog(false)}>Cancel</Button><Button onClick={submitVoucher} disabled={createVoucher.isPending}>Post Voucher</Button></div></div></DialogContent></Dialog>

      <Dialog open={showJournalDialog} onOpenChange={setShowJournalDialog}><DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>New General Journal</DialogTitle><DialogDescription>Every entry must balance. Posted entries can only be corrected with a reversal.</DialogDescription></DialogHeader><div className="grid grid-cols-[180px_1fr] gap-4"><Field label="Date"><DateInput value={journalForm.entryDate} onChange={value => setJournalForm(form => ({ ...form, entryDate: value }))} clearable={false} /></Field><Field label="Narration"><Input value={journalForm.narration} onChange={event => setJournalForm(form => ({ ...form, narration: event.target.value }))} placeholder="Reason for adjustment" /></Field></div><div className="space-y-2"><div className="grid grid-cols-[1.2fr_0.6fr_0.6fr_1.2fr_36px] gap-2 text-xs text-muted-foreground px-1"><span>Account</span><span>Side</span><span>Amount</span><span>Description</span><span /></div>{journalLines.map((line, index) => <div key={index} className="grid grid-cols-[1.2fr_0.6fr_0.6fr_1.2fr_36px] gap-2"><Select value={line.accountId} onValueChange={value => setJournalLines(lines => lines.map((item, itemIndex) => itemIndex === index ? { ...item, accountId: value } : item))}><SelectTrigger><SelectValue placeholder="Select ledger" /></SelectTrigger><SelectContent>{detailAccounts.map(account => <SelectItem key={account.id} value={String(account.id)}>{account.code} — {account.title}</SelectItem>)}</SelectContent></Select><Select value={line.side} onValueChange={(value: "debit" | "credit") => setJournalLines(lines => lines.map((item, itemIndex) => itemIndex === index ? { ...item, side: value } : item))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="debit">Debit</SelectItem><SelectItem value="credit">Credit</SelectItem></SelectContent></Select><Input type="number" value={line.amount} onChange={event => setJournalLines(lines => lines.map((item, itemIndex) => itemIndex === index ? { ...item, amount: event.target.value } : item))} placeholder="0.00" /><Input value={line.description} onChange={event => setJournalLines(lines => lines.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item))} placeholder="Line details" /><Button variant="ghost" size="icon" disabled={journalLines.length === 2} onClick={() => setJournalLines(lines => lines.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4" /></Button></div>)}<Button variant="ghost" size="sm" onClick={() => setJournalLines(lines => [...lines, { accountId: "", side: "debit", amount: "", description: "" }])}><Plus className="h-4 w-4 mr-1" />Add Line</Button></div><div className={`rounded-lg border p-3 flex items-center justify-between ${Math.round(journalDebit * 100) === Math.round(journalCredit * 100) && journalDebit > 0 ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}><div className="flex gap-6 text-sm"><span>Debit <strong>{money(journalDebit)}</strong></span><span>Credit <strong>{money(journalCredit)}</strong></span></div><span className="text-xs font-medium">{Math.round(journalDebit * 100) === Math.round(journalCredit * 100) && journalDebit > 0 ? "Balanced" : "Not balanced"}</span></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowJournalDialog(false)}>Cancel</Button><Button onClick={submitJournal} disabled={createJournal.isPending}>Post Journal</Button></div></DialogContent></Dialog>

      <Dialog open={reversingEntryId !== null} onOpenChange={open => !open && setReversingEntryId(null)}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Reverse Posted Entry</DialogTitle><DialogDescription>This keeps the original entry and posts an equal opposite transaction.</DialogDescription></DialogHeader><Field label="Reason"><Textarea value={reversalReason} onChange={event => setReversalReason(event.target.value)} placeholder="Explain why this entry is being reversed" /></Field><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setReversingEntryId(null)}>Cancel</Button><Button variant="destructive" onClick={() => reversingEntryId && reverseJournal.mutate({ id: reversingEntryId, reason: reversalReason })} disabled={reversalReason.trim().length < 3 || reverseJournal.isPending}><RotateCcw className="h-4 w-4 mr-2" />Post Reversal</Button></div></DialogContent></Dialog>
      <Dialog open={deletingVoucherId !== null} onOpenChange={open => { if (!open) { setDeletingVoucherId(null); setDeleteReason(""); } }}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Delete Voucher</DialogTitle><DialogDescription>The voucher is marked deleted and an equal opposite entry is posted, so balances are corrected and the audit trail is kept.</DialogDescription></DialogHeader><Field label="Reason"><Textarea value={deleteReason} onChange={event => setDeleteReason(event.target.value)} placeholder="e.g. Entered twice / wrong amount" /></Field><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDeletingVoucherId(null)}>Cancel</Button><Button variant="destructive" onClick={() => deletingVoucherId && deleteVoucher.mutate({ id: deletingVoucherId, reason: deleteReason.trim() })} disabled={deleteReason.trim().length < 3 || deleteVoucher.isPending}><Trash2 className="h-4 w-4 mr-2" />Delete Voucher</Button></div></DialogContent></Dialog>
      <Dialog open={showCashAccountDialog} onOpenChange={setShowCashAccountDialog}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>New Cash / Bank Account</DialogTitle><DialogDescription>Add a bank account, wallet or cash counter. It appears in every Cash Voucher.</DialogDescription></DialogHeader><div className="grid gap-4"><Field label="Account name"><Input value={cashAccountForm.title} onChange={event => setCashAccountForm(form => ({ ...form, title: event.target.value }))} placeholder="e.g. Meezan Bank 0123, JazzCash, Shop Counter" /></Field><Field label="Details (optional)"><Input value={cashAccountForm.description} onChange={event => setCashAccountForm(form => ({ ...form, description: event.target.value }))} placeholder="Account number / branch" /></Field><Field label="Opening balance (optional)"><Input type="number" value={cashAccountForm.openingBalance} onChange={event => setCashAccountForm(form => ({ ...form, openingBalance: event.target.value }))} placeholder="0.00" /></Field></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowCashAccountDialog(false)}>Cancel</Button><Button onClick={submitCashAccount} disabled={createCashAccount.isPending}><Plus className="h-4 w-4 mr-2" />Add Account</Button></div></DialogContent></Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}

function QuickAction({ icon: Icon, title, description, onClick }: { icon: typeof Banknote; title: string; description: string; onClick: () => void }) {
  return <button onClick={onClick} className="w-full rounded-xl border border-border bg-muted/20 p-4 text-left flex gap-3 hover:border-primary/40 hover:bg-primary/5 transition-colors"><div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Icon className="h-4 w-4 text-primary" /></div><div><p className="text-sm font-medium text-foreground">{title}</p><p className="text-xs text-muted-foreground mt-0.5">{description}</p></div></button>;
}

function JournalTable({ entries, canReverse, onReverse, onDelete }: { entries: any[]; canReverse: boolean; onReverse: (id: number) => void; onDelete?: (id: number) => void }) {
  if (!entries.length) return <div className="py-12 text-center text-sm text-muted-foreground">No posted finance transactions yet.</div>;
  const showActions = canReverse || Boolean(onDelete);
  return <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-y border-border bg-muted/30"><th className="px-5 py-3 text-left">Entry</th><th className="px-5 py-3 text-left">Date</th><th className="px-5 py-3 text-left">Type</th><th className="px-5 py-3 text-left">Narration</th><th className="px-5 py-3 text-right">Amount</th><th className="px-5 py-3 text-right">Status</th>{showActions && <th className="px-5 py-3 text-right">Action</th>}</tr></thead><tbody>{entries.map(({ entry }) => <tr key={entry.id} className="border-b border-border/60 hover:bg-muted/20"><td className="px-5 py-3 font-mono text-xs text-primary">{entry.entryNumber}</td><td className="px-5 py-3 text-muted-foreground">{new Date(entry.entryDate).toLocaleDateString()}</td><td className="px-5 py-3"><Badge variant="outline">{entryLabels[entry.entryType] || entry.entryType}</Badge></td><td className="px-5 py-3 text-muted-foreground max-w-xs truncate">{entry.narration || "—"}</td><td className="px-5 py-3 text-right font-medium">{money(entry.totalDebit)}</td><td className="px-5 py-3 text-right"><Badge className={entry.status === "posted" ? "bg-emerald-500/10 text-emerald-600" : "bg-zinc-500/10 text-zinc-500"}>{onDelete && entry.status === "reversed" ? "deleted" : entry.status}</Badge></td>{showActions && <td className="px-5 py-3 text-right">{onDelete ? <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={entry.status !== "posted"} onClick={() => onDelete(entry.id)}><Trash2 className="h-3.5 w-3.5 mr-1" />Delete</Button> : <Button variant="ghost" size="sm" disabled={entry.status !== "posted" || entry.entryType === "reversal"} onClick={() => onReverse(entry.id)}><RotateCcw className="h-3.5 w-3.5 mr-1" />Reverse</Button>}</td>}</tr>)}</tbody></table></div>;
}
