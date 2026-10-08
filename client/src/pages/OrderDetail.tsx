import { trpc } from "@/lib/trpc";
import { DateInput } from "@/components/DateInput";
import { InvoiceViewDialog } from "@/components/InvoiceViewDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  ArrowLeft,
  Calendar,
  Package,
  User,
  Truck,
  CreditCard,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Cog,
  Factory,
  Gem,
  Receipt,
  UserPlus,
  Save,
} from "lucide-react";
import { useParams, useLocation } from "wouter";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const processTypes = [
  "Body Making",
  "Stone Setting",
  "Polishing",
  "Rhodium Plating",
  "Enameling",
  "Engraving",
  "Assembly",
  "Quality Check",
  "Other",
];

const itemTypes = [
  "Necklace", "Earrings", "Ring", "Bracelet", "Bangle", "Pendant", 
  "Brooch", "Anklet", "Baalis", "Bindi / Tika", "Clips", "Set", "Other"
];

const statusColors: Record<string, string> = {
  saved: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-600",
  pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-600",
  production: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-600",
  completed: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-600",
  delivered: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-600",
  cancelled: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-600",
};

const processStatusColors: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  in_progress: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  complete: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

export default function OrderDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const orderId = Number(params.id);

  // State
  const [activeTab, setActiveTab] = useState("overview");
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [editingProcess, setEditingProcess] = useState<any>(null);
  const [showProcessDetailModal, setShowProcessDetailModal] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<any>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [viewInvoiceId, setViewInvoiceId] = useState<number | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [deleteProcessConfirm, setDeleteProcessConfirm] = useState<number | null>(null);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);

  // Process form
  const [processForm, setProcessForm] = useState({
    itemName: "",
    processType: "",
    vendorId: null as number | null,
    startDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: "",
    comments: "",
  });

  // Vendor form
  const [vendorForm, setVendorForm] = useState({
    name: "",
    phone: "",
    specialization: "",
    city: "",
  });

  // Process detail form (for updating a process)
  const [processDetailForm, setProcessDetailForm] = useState({
    processStatus: "pending" as string,
    actualDeliveryDate: "",
    issueBodyWeight: "",
    returnBodyMetal: "",
    returnBodyWeight: "",
    returnBodyPieces: 0,
    lumpSumLabour: "0",
    gemsIssueType: "",
    gemsIssueSource: "",
    gemsIssueDate: "",
    gemsIssueWeight: "",
    gemsIssueQty: 0,
    comments: "",
    isClosed: false,
    closedDate: "",
  });

  const utils = trpc.useUtils();

  // Queries
  const { data: orderDetail, isLoading } = trpc.orderDetail.get.useQuery(
    { id: orderId },
    { enabled: !!orderId }
  );

  const { data: vendors } = trpc.vendors.list.useQuery({ isActive: true });
  const { data: processes } = trpc.orderProcesses.list.useQuery(
    { orderId },
    { enabled: !!orderId }
  );

  // Mutations
  const createProcessMutation = trpc.orderProcesses.create.useMutation({
    onSuccess: () => {
      toast.success("Process added");
      setShowProcessModal(false);
      resetProcessForm();
      utils.orderProcesses.list.invalidate();
    },
    onError: (e) => toast.error(e.message || "Failed to add process"),
  });

  const updateProcessMutation = trpc.orderProcesses.update.useMutation({
    onSuccess: () => {
      toast.success("Process updated");
      setShowProcessDetailModal(false);
      utils.orderProcesses.list.invalidate();
    },
    onError: (e) => toast.error(e.message || "Failed to update process"),
  });

  const deleteProcessMutation = trpc.orderProcesses.delete.useMutation({
    onSuccess: () => {
      toast.success("Process deleted");
      setDeleteProcessConfirm(null);
      utils.orderProcesses.list.invalidate();
    },
    onError: (e) => toast.error(e.message || "Failed to delete process"),
  });

  const updateOrderMutation = trpc.orders.update.useMutation({
    onSuccess: () => {
      toast.success("Order updated");
      utils.orderDetail.get.invalidate();
      utils.orders.list.invalidate();
    },
    onError: (e) => toast.error(e.message || "Failed to update order"),
  });

  const createVendorMutation = trpc.vendors.create.useMutation({
    onSuccess: (data) => {
      toast.success("Vendor created");
      setShowAddVendorModal(false);
      setVendorForm({ name: "", phone: "", specialization: "", city: "" });
      utils.vendors.list.invalidate();
      if (data?.id) {
        setProcessForm(prev => ({ ...prev, vendorId: data.id }));
      }
    },
    onError: (e) => toast.error(e.message || "Failed to create vendor"),
  });

  const createInvoiceMutation = trpc.invoices.create.useMutation({
    onSuccess: () => {
      toast.success("Invoice created");
      setShowInvoiceModal(false);
      utils.orderDetail.get.invalidate();
    },
    onError: (e) => toast.error(e.message || "Failed to create invoice"),
  });

  const resetProcessForm = () => {
    setProcessForm({
      itemName: "",
      processType: "",
      vendorId: null,
      startDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: "",
      comments: "",
    });
    setEditingProcess(null);
  };

  const handleAddProcess = () => {
    if (!processForm.processType) {
      toast.error("Please select a process type");
      return;
    }
    createProcessMutation.mutate({
      orderId,
      itemName: processForm.itemName || undefined,
      processType: processForm.processType,
      vendorId: processForm.vendorId || undefined,
      startDate: processForm.startDate || undefined,
      expectedDeliveryDate: processForm.expectedDeliveryDate || undefined,
      comments: processForm.comments || undefined,
    });
  };

  const handleOpenProcessDetail = (proc: any) => {
    setSelectedProcess(proc);
    const p = proc.process;
    setProcessDetailForm({
      processStatus: p.status || "pending",
      actualDeliveryDate: p.actualDeliveryDate ? new Date(p.actualDeliveryDate).toISOString().split('T')[0] : "",
      issueBodyWeight: p.issueBodyWeight || "",
      returnBodyMetal: p.returnBodyMetal || "",
      returnBodyWeight: p.returnBodyWeight || "",
      returnBodyPieces: p.returnBodyPieces || 0,
      lumpSumLabour: p.lumpSumLabour || "0",
      gemsIssueType: p.gemsIssueType || "",
      gemsIssueSource: p.gemsIssueSource || "",
      gemsIssueDate: p.gemsIssueDate ? new Date(p.gemsIssueDate).toISOString().split('T')[0] : "",
      gemsIssueWeight: p.gemsIssueWeight || "",
      gemsIssueQty: p.gemsIssueQty || 0,
      comments: p.comments || "",
      isClosed: p.isClosed || false,
      closedDate: p.closedDate ? new Date(p.closedDate).toISOString().split('T')[0] : "",
    });
    setShowProcessDetailModal(true);
  };

  const handleUpdateProcess = () => {
    if (!selectedProcess) return;
    updateProcessMutation.mutate({
      id: selectedProcess.process.id,
      status: processDetailForm.processStatus as any,
      actualDeliveryDate: processDetailForm.actualDeliveryDate || undefined,
      issueBodyWeight: processDetailForm.issueBodyWeight || undefined,
      returnBodyMetal: processDetailForm.returnBodyMetal || undefined,
      returnBodyWeight: processDetailForm.returnBodyWeight || undefined,
      returnBodyPieces: processDetailForm.returnBodyPieces || undefined,
      lumpSumLabour: processDetailForm.lumpSumLabour || undefined,
      gemsIssueType: processDetailForm.gemsIssueType || undefined,
      gemsIssueSource: processDetailForm.gemsIssueSource || undefined,
      gemsIssueDate: processDetailForm.gemsIssueDate || undefined,
      gemsIssueWeight: processDetailForm.gemsIssueWeight || undefined,
      gemsIssueQty: processDetailForm.gemsIssueQty || undefined,
      comments: processDetailForm.comments || undefined,
      isClosed: processDetailForm.isClosed,
      closedDate: processDetailForm.closedDate || undefined,
    });
  };

  const handleCreateInvoice = () => {
    createInvoiceMutation.mutate({
      orderId,
      customerId: orderDetail?.order?.customerId || undefined,
      invoiceDate: new Date().toISOString().split('T')[0],
      remarks: orderDetail?.order?.notes || "",
    });
  };

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === "cancelled") {
      setConfirmCancel(true);
      return;
    }
    updateOrderMutation.mutate({ id: orderId, status: newStatus as any });
  };

  const formatDate = (date: any) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const formatCurrency = (amount: any) => {
    if (!amount) return "—";
    return `PKR ${Number(amount).toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const order = orderDetail?.order;
  const customer = orderDetail?.customer;

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center mb-4">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">Order not found</h3>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/orders")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/orders')} className="hover:bg-card">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-foreground">{order.orderNumber}</h1>
            <Badge className={`${statusColors[order.status || 'pending']} border`}>
              {order.status || 'pending'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {customer ? `${customer.firstName} ${customer.lastName}` : 'No customer'} — Placed {formatDate(order.orderDate)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {order.status !== 'cancelled' && (
            <Button variant="outline" size="sm" onClick={() => setLocation(`/orders/${orderId}/edit`)}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit Order
            </Button>
          )}
          <Select value={order.status || 'pending'} onValueChange={handleStatusChange} disabled={order.status === 'cancelled' || updateOrderMutation.isPending}>
            <SelectTrigger className="w-[160px] bg-card border-border h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="saved">Saved</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="production">In Production</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInvoiceModal(true)}
          >
            <Receipt className="h-4 w-4 mr-1" />
            Sales Invoice
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary/10">Overview</TabsTrigger>
          <TabsTrigger value="processes" className="data-[state=active]:bg-primary/10">
            Order Processes ({processes?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="invoices" className="data-[state=active]:bg-primary/10">
            Invoices ({orderDetail?.invoices?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4">
          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl bg-card border border-border p-5 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => customer && setLocation(`/customers/${customer.id}`)}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-sm text-muted-foreground">Customer</p>
              </div>
              {customer ? (
                <div>
                  <p className="font-medium text-foreground">{customer.firstName} {customer.lastName}</p>
                  <p className="text-sm text-muted-foreground">{customer.phone || customer.email || ''}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">No customer</p>
              )}
            </div>

            <div className="rounded-xl bg-card border border-border p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-sm text-muted-foreground">Expected Delivery</p>
              </div>
              <p className="font-medium text-foreground">{formatDate(order.expectedDelivery)}</p>
            </div>

            <div className="rounded-xl bg-card border border-border p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-sm text-muted-foreground">Advance Cash</p>
              </div>
              <p className="font-medium text-foreground">{formatCurrency(order.advanceCash)}</p>
            </div>

            <div className="rounded-xl bg-card border border-border p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <p className="text-sm text-muted-foreground">Items</p>
              </div>
              <p className="font-medium text-foreground">{orderDetail?.items?.length || 0} items</p>
            </div>
          </div>

          {/* Description & Notes */}
          {(order.description || order.notes) && (
            <div className="rounded-xl bg-card border border-border p-5">
              <h3 className="text-base font-semibold text-foreground mb-3">Description & Notes</h3>
              {order.description && (
                <div className="mb-2">
                  <span className="text-sm text-muted-foreground">Description: </span>
                  <span className="text-foreground">{order.description}</span>
                </div>
              )}
              {order.notes && (
                <div>
                  <span className="text-sm text-muted-foreground">Notes: </span>
                  <span className="text-foreground">{order.notes}</span>
                </div>
              )}
            </div>
          )}

          {/* Order Items Table */}
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">Order Items</h3>
            </div>
            {(!orderDetail?.items || orderDetail.items.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Package className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No items in this order</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Item</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Assigned Vendor</th>
                      <th className="px-5 py-3 text-center font-medium text-muted-foreground">Qty</th>
                      <th className="px-5 py-3 text-right font-medium text-muted-foreground">Unit Price</th>
                      <th className="px-5 py-3 text-right font-medium text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderDetail.items.map((item: any, idx: number) => (
                      <tr key={item.id || idx} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="px-5 py-3 font-medium text-foreground">
                          <div className="flex items-center gap-3">
                            {item.images?.length ? (
                              <a href={item.images[0]} target="_blank" rel="noreferrer" className="relative shrink-0">
                                <img src={item.images[0]} alt={item.itemName || "Item"} className="h-10 w-10 rounded-md border border-border object-cover" />
                                {item.images.length > 1 && (
                                  <span className="absolute -right-1.5 -top-1.5 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                                    {item.images.length}
                                  </span>
                                )}
                              </a>
                            ) : null}
                            <span>{item.itemName || `Item #${idx + 1}`}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {orderDetail.processes?.find((process: any) => process.process.orderItemId === item.id)?.vendor?.name || "—"}
                        </td>
                        <td className="px-5 py-3 text-center text-muted-foreground">{item.quantity}</td>
                        <td className="px-5 py-3 text-right text-muted-foreground">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-5 py-3 text-right font-medium text-foreground">{formatCurrency(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* PROCESSES TAB */}
        <TabsContent value="processes" className="space-y-4">
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">Sales Order Processes</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Assign vendors and track manufacturing processes</p>
              </div>
              <Button
                size="sm"
                onClick={() => { resetProcessForm(); setShowProcessModal(true); }}
                className="gold-gradient text-primary-foreground border-0"
              >
                <Plus className="h-4 w-4 mr-1" />
                New Process
              </Button>
            </div>

            {/* Process creation helper - item + type selectors */}
            <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center gap-3 flex-wrap">
              <Select onValueChange={(v) => setProcessForm(prev => ({ ...prev, itemName: v }))}>
                <SelectTrigger className="w-[160px] bg-card border-border h-8 text-sm">
                  <SelectValue placeholder="Select Item" />
                </SelectTrigger>
                <SelectContent>
                  {itemTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select onValueChange={(v) => setProcessForm(prev => ({ ...prev, processType: v }))}>
                <SelectTrigger className="w-[160px] bg-card border-border h-8 text-sm">
                  <SelectValue placeholder="Process Type" />
                </SelectTrigger>
                <SelectContent>
                  {processTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => {
                  if (!processForm.processType) {
                    toast.error("Select item and process type first");
                    return;
                  }
                  setShowProcessModal(true);
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                New Process
              </Button>
            </div>

            {/* Processes Table */}
            {(!processes || processes.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Cog className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No processes assigned yet</p>
                <p className="text-xs text-muted-foreground mt-1">Add a process to start tracking manufacturing</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Items</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground" colSpan={3}>Process</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Vendor</th>
                      <th className="px-5 py-3 text-right font-medium text-muted-foreground">Action</th>
                    </tr>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="px-5 py-2 text-left text-xs font-normal text-muted-foreground"></th>
                      <th className="px-3 py-2 text-left text-xs font-normal text-muted-foreground">Type</th>
                      <th className="px-3 py-2 text-left text-xs font-normal text-muted-foreground">Start</th>
                      <th className="px-3 py-2 text-left text-xs font-normal text-muted-foreground">Status</th>
                      <th className="px-5 py-2 text-left text-xs font-normal text-muted-foreground"></th>
                      <th className="px-5 py-2 text-right text-xs font-normal text-muted-foreground"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {processes.map((proc: any) => (
                      <tr key={proc.process.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3 text-foreground font-medium">{proc.process.itemName || '—'}</td>
                        <td className="px-3 py-3 text-foreground">{proc.process.processType}</td>
                        <td className="px-3 py-3 text-muted-foreground">{formatDate(proc.process.startDate)}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${processStatusColors[proc.process.status || 'pending']}`}>
                            {proc.process.status === 'in_progress' ? 'In Progress' : 
                             proc.process.status === 'complete' ? 'Complete' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {proc.vendor ? `${proc.vendor.code || ''} ${proc.vendor.name}` : '—'}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleOpenProcessDetail(proc)}
                            >
                              Update
                            </Button>
                            <span className="text-border">|</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-destructive hover:text-destructive"
                              onClick={() => setDeleteProcessConfirm(proc.process.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* INVOICES TAB */}
        <TabsContent value="invoices" className="space-y-4">
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">Sales Invoices</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Generate and manage invoices for this order</p>
              </div>
              <Button
                size="sm"
                onClick={() => setShowInvoiceModal(true)}
                className="gold-gradient text-primary-foreground border-0"
              >
                <Plus className="h-4 w-4 mr-1" />
                Create Invoice
              </Button>
            </div>

            {(!orderDetail?.invoices || orderDetail.invoices.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Receipt className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No invoices generated yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setShowInvoiceModal(true)}
                >
                  <Receipt className="h-4 w-4 mr-1" />
                  Generate Sales Invoice
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Invoice #</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Date</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
                      <th className="px-5 py-3 text-right font-medium text-muted-foreground">Total</th>
                      <th className="px-5 py-3 text-right font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderDetail.invoices.map((inv: any) => (
                      <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="px-5 py-3 font-medium text-foreground">{inv.invoiceNumber}</td>
                        <td className="px-5 py-3 text-muted-foreground">{formatDate(inv.invoiceDate || inv.createdAt)}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            inv.status === 'paid' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                            inv.status === 'sent' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' :
                            inv.status === 'cancelled' ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' :
                            'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400'
                          }`}>
                            {inv.status || 'Draft'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-foreground">{formatCurrency(inv.totalAmount)}</td>
                        <td className="px-5 py-3 text-right">
                          <Button variant="ghost" size="sm" className="h-7 text-xs"
                            onClick={() => setViewInvoiceId(inv.id)}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ============ ADD PROCESS MODAL ============ */}
      <Dialog open={showProcessModal} onOpenChange={(open) => {
        if (!open) resetProcessForm();
        setShowProcessModal(open);
      }}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add New Process</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Assign a manufacturing process and vendor
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Item</Label>
                <Select value={processForm.itemName} onValueChange={(v) => setProcessForm({ ...processForm, itemName: v })}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {itemTypes.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Process Type *</Label>
                <Select value={processForm.processType} onValueChange={(v) => setProcessForm({ ...processForm, processType: v })}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {processTypes.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-foreground">Vendor</Label>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowAddVendorModal(true)}>
                  <UserPlus className="h-3 w-3 mr-1" />
                  Add New
                </Button>
              </div>
              <Select 
                value={processForm.vendorId?.toString() || ""} 
                onValueChange={(v) => setProcessForm({ ...processForm, vendorId: v ? Number(v) : null })}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors?.map((v: any) => (
                    <SelectItem key={v.id} value={v.id.toString()}>
                      {v.code} {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Start Date</Label>
                <DateInput value={processForm.startDate} onChange={value => setProcessForm({ ...processForm, startDate: value })} className="" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Expected Delivery</Label>
                <DateInput value={processForm.expectedDeliveryDate} onChange={value => setProcessForm({ ...processForm, expectedDeliveryDate: value })} className="" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Comments</Label>
              <Textarea
                value={processForm.comments}
                onChange={(e) => setProcessForm({ ...processForm, comments: e.target.value })}
                className="bg-input border-border"
                rows={2}
                placeholder="Process notes..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" onClick={() => setShowProcessModal(false)}>Cancel</Button>
              <Button
                onClick={handleAddProcess}
                disabled={createProcessMutation.isPending}
                className="gold-gradient text-primary-foreground border-0"
              >
                Add Process
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ PROCESS DETAIL / UPDATE MODAL ============ */}
      <Dialog open={showProcessDetailModal} onOpenChange={setShowProcessDetailModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Sales Order Process — {selectedProcess?.process?.processType}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedProcess?.process?.itemName || 'Item'} — {selectedProcess?.vendor?.name || 'No vendor'}
            </DialogDescription>
          </DialogHeader>

          {selectedProcess && (
            <div className="space-y-4 py-2">
              {/* Close Process */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={processDetailForm.isClosed}
                    onChange={(e) => setProcessDetailForm({ ...processDetailForm, isClosed: e.target.checked })}
                    className="rounded border-border"
                  />
                  Close Process?
                </label>
                {processDetailForm.isClosed && (
                  <DateInput value={processDetailForm.closedDate} onChange={value => setProcessDetailForm({ ...processDetailForm, closedDate: value })} className="h-8 w-40" />
                )}
              </div>

              {/* Process Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Order ID:</span>
                  <span className="ml-2 text-foreground font-medium">{order.orderNumber}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="ml-2 text-foreground">{customer?.firstName} {customer?.lastName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Item:</span>
                  <span className="ml-2 text-foreground">{selectedProcess.process.itemName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Process Type:</span>
                  <span className="ml-2 text-foreground">{selectedProcess.process.processType}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Vendor:</span>
                  <span className="ml-2 text-foreground">{selectedProcess.vendor ? `${selectedProcess.vendor.code} ${selectedProcess.vendor.name}` : '—'}</span>
                </div>
              </div>

              {/* Status & Dates */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select
                    value={processDetailForm.processStatus}
                    onValueChange={(v) => setProcessDetailForm({ ...processDetailForm, processStatus: v })}
                  >
                    <SelectTrigger className="bg-input border-border h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="complete">Complete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Expected Delivery</Label>
                  <DateInput value={selectedProcess.process.expectedDeliveryDate ? new Date(selectedProcess.process.expectedDeliveryDate).toISOString().split('T')[0] : ''} onChange={() => {}} disabled clearable={false} className="h-9" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Actual Delivery Date</Label>
                  <DateInput value={processDetailForm.actualDeliveryDate} onChange={value => setProcessDetailForm({ ...processDetailForm, actualDeliveryDate: value })} className="h-9" />
                </div>
              </div>

              {/* Lump Sum Labour */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Lump Sum Labour (PKR)</Label>
                <Input
                  type="number"
                  value={processDetailForm.lumpSumLabour}
                  onChange={(e) => setProcessDetailForm({ ...processDetailForm, lumpSumLabour: e.target.value })}
                  className="bg-input border-border h-9"
                />
              </div>

              {/* Issue Body */}
              <div className="pt-3 border-t border-border">
                <h4 className="text-sm font-semibold text-foreground mb-3">Issue Body</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Weight (gm)</Label>
                    <Input
                      type="number"
                      value={processDetailForm.issueBodyWeight}
                      onChange={(e) => setProcessDetailForm({ ...processDetailForm, issueBodyWeight: e.target.value })}
                      className="bg-input border-border h-9"
                      placeholder="e.g., 187.000"
                    />
                  </div>
                </div>
              </div>

              {/* Return Body */}
              <div className="pt-3 border-t border-border">
                <h4 className="text-sm font-semibold text-foreground mb-3">Return Body</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Metal</Label>
                    <Select
                      value={processDetailForm.returnBodyMetal}
                      onValueChange={(v) => setProcessDetailForm({ ...processDetailForm, returnBodyMetal: v })}
                    >
                      <SelectTrigger className="bg-input border-border h-9">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Gold 22k">Gold 22k</SelectItem>
                        <SelectItem value="Gold 24k">Gold 24k</SelectItem>
                        <SelectItem value="Gold 18k">Gold 18k</SelectItem>
                        <SelectItem value="Silver">Silver</SelectItem>
                        <SelectItem value="Platinum">Platinum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Weight (gm)</Label>
                    <Input
                      type="number"
                      value={processDetailForm.returnBodyWeight}
                      onChange={(e) => setProcessDetailForm({ ...processDetailForm, returnBodyWeight: e.target.value })}
                      className="bg-input border-border h-9"
                      placeholder="e.g., 192.500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">No. of Pieces</Label>
                    <Input
                      type="number"
                      value={processDetailForm.returnBodyPieces}
                      onChange={(e) => setProcessDetailForm({ ...processDetailForm, returnBodyPieces: Number(e.target.value) })}
                      className="bg-input border-border h-9"
                      placeholder="1"
                    />
                  </div>
                </div>
              </div>

              {/* Gems Issue To Vendor */}
              <div className="pt-3 border-t border-border">
                <h4 className="text-sm font-semibold text-foreground mb-3">Gems Issue To Vendor</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Gems Type</Label>
                    <Input
                      value={processDetailForm.gemsIssueType}
                      onChange={(e) => setProcessDetailForm({ ...processDetailForm, gemsIssueType: e.target.value })}
                      className="bg-input border-border h-9"
                      placeholder="e.g., Emeralds - 01"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Source</Label>
                    <Select
                      value={processDetailForm.gemsIssueSource}
                      onValueChange={(v) => setProcessDetailForm({ ...processDetailForm, gemsIssueSource: v })}
                    >
                      <SelectTrigger className="bg-input border-border h-9">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Our Stock">Our Stock</SelectItem>
                        <SelectItem value="Customer">Customer</SelectItem>
                        <SelectItem value="Vendor">Vendor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Date</Label>
                    <DateInput value={processDetailForm.gemsIssueDate} onChange={value => setProcessDetailForm({ ...processDetailForm, gemsIssueDate: value })} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Weight</Label>
                    <Input
                      type="number"
                      value={processDetailForm.gemsIssueWeight}
                      onChange={(e) => setProcessDetailForm({ ...processDetailForm, gemsIssueWeight: e.target.value })}
                      className="bg-input border-border h-9"
                      placeholder="Carats"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Quantity</Label>
                    <Input
                      type="number"
                      value={processDetailForm.gemsIssueQty}
                      onChange={(e) => setProcessDetailForm({ ...processDetailForm, gemsIssueQty: Number(e.target.value) })}
                      className="bg-input border-border h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Comments */}
              <div className="space-y-2 pt-3 border-t border-border">
                <Label className="text-xs text-muted-foreground">Comments</Label>
                <Textarea
                  value={processDetailForm.comments}
                  onChange={(e) => setProcessDetailForm({ ...processDetailForm, comments: e.target.value })}
                  className="bg-input border-border"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button variant="outline" onClick={() => setShowProcessDetailModal(false)}>Cancel</Button>
                <Button
                  onClick={handleUpdateProcess}
                  disabled={updateProcessMutation.isPending}
                  className="gold-gradient text-primary-foreground border-0"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============ ADD VENDOR MODAL ============ */}
      <Dialog open={showAddVendorModal} onOpenChange={setShowAddVendorModal}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add New Vendor</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Create a new vendor/craftsman
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Name *</Label>
              <Input
                value={vendorForm.name}
                onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                className="bg-input border-border"
                placeholder="Vendor name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Phone</Label>
                <Input
                  value={vendorForm.phone}
                  onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                  className="bg-input border-border"
                  placeholder="+92..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">City</Label>
                <Input
                  value={vendorForm.city}
                  onChange={(e) => setVendorForm({ ...vendorForm, city: e.target.value })}
                  className="bg-input border-border"
                  placeholder="City"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Specialization</Label>
              <Select
                value={vendorForm.specialization}
                onValueChange={(v) => setVendorForm({ ...vendorForm, specialization: v })}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Body Making">Body Making</SelectItem>
                  <SelectItem value="Stone Setting">Stone Setting</SelectItem>
                  <SelectItem value="Polishing">Polishing</SelectItem>
                  <SelectItem value="Engraving">Engraving</SelectItem>
                  <SelectItem value="General">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" onClick={() => setShowAddVendorModal(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  if (!vendorForm.name) { toast.error("Name is required"); return; }
                  createVendorMutation.mutate({
                    name: vendorForm.name,
                    phone: vendorForm.phone || undefined,
                    city: vendorForm.city || undefined,
                    specialization: vendorForm.specialization || undefined,
                  });
                }}
                disabled={createVendorMutation.isPending}
                className="gold-gradient text-primary-foreground border-0"
              >
                Create Vendor
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ CREATE INVOICE MODAL ============ */}
      <Dialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Generate Sales Invoice</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Create an invoice from this sales order. You can edit the details after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-4 rounded-lg bg-muted/30 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order:</span>
                <span className="font-medium text-foreground">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer:</span>
                <span className="text-foreground">{customer?.firstName} {customer?.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items:</span>
                <span className="text-foreground">{orderDetail?.items?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span className="text-foreground">{new Date().toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" onClick={() => setShowInvoiceModal(false)}>Cancel</Button>
              <Button
                onClick={handleCreateInvoice}
                disabled={createInvoiceMutation.isPending}
                className="gold-gradient text-primary-foreground border-0"
              >
                <Receipt className="h-4 w-4 mr-1" />
                Generate Invoice
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <InvoiceViewDialog
        invoiceId={viewInvoiceId}
        onClose={() => setViewInvoiceId(null)}
        orderNumber={order.orderNumber}
        customer={customer}
        orderItems={orderDetail?.items ?? []}
      />

      {/* Cancel Order Confirmation */}
      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Cancel this order?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              The order will be hidden from the orders list, and its advance cash, advance metal and any invoice
              postings will be reversed in the ledger. If an invoice is already posted, only a Super Admin can do this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Order</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => updateOrderMutation.mutate({ id: orderId, status: "cancelled" })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Process Confirmation */}
      <AlertDialog open={!!deleteProcessConfirm} onOpenChange={() => setDeleteProcessConfirm(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Process</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this process? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProcessConfirm && deleteProcessMutation.mutate({ id: deleteProcessConfirm })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
