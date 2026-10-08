import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Plus,
  Search,
  ShoppingCart,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const statusOptions = [
  { value: "saved", label: "Saved", color: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400" },
  { value: "pending", label: "Pending", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  { value: "production", label: "In Production", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  { value: "completed", label: "Completed", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  { value: "delivered", label: "Delivered", color: "bg-purple-500/15 text-purple-600 dark:text-purple-400" },
  { value: "cancelled", label: "Cancelled", color: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
];

export default function Orders() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: orders, isLoading } = trpc.orders.list.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const { data: customers } = trpc.customers.list.useQuery();

  const deleteMutation = trpc.orders.delete.useMutation({
    onSuccess: () => {
      toast.success("Order deleted successfully");
      setDeleteConfirm(null);
      utils.orders.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete order");
    },
  });

  const getStatusStyle = (status: string) => {
    return statusOptions.find((s) => s.value === status)?.color || "bg-zinc-500/15 text-zinc-500";
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Separate confirmed (non-saved) and saved orders
  const confirmedOrders = useMemo(() => {
    return (
      orders?.filter((o) => {
        if (o.order.status === "saved") return false;
        // Cancelled orders are hidden unless the Cancelled filter is picked.
        if (o.order.status === "cancelled" && statusFilter !== "cancelled") return false;
        if (search) {
          const s = search.toLowerCase();
          if (
            !o.order.orderNumber?.toLowerCase().includes(s) &&
            !o.customer?.firstName?.toLowerCase().includes(s) &&
            !o.customer?.lastName?.toLowerCase().includes(s)
          )
            return false;
        }
        if (customerFilter !== "all" && o.order.customerId !== Number(customerFilter)) return false;
        return true;
      }) || []
    );
  }, [orders, search, customerFilter, statusFilter]);

  const savedOrders = useMemo(() => {
    return (
      orders?.filter((o) => {
        if (o.order.status !== "saved") return false;
        if (search) {
          const s = search.toLowerCase();
          if (
            !o.customer?.firstName?.toLowerCase().includes(s) &&
            !o.customer?.lastName?.toLowerCase().includes(s)
          )
            return false;
        }
        return true;
      }) || []
    );
  }, [orders, search]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Sales Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage customer orders, processes, and invoicing
          </p>
        </div>
        <Button
          onClick={() => setLocation("/orders/new")}
          className="gold-gradient text-primary-foreground border-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Sales Order
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Order ID or Customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <Select value={customerFilter} onValueChange={setCustomerFilter}>
          <SelectTrigger className="w-full sm:w-[200px] bg-card border-border">
            <SelectValue placeholder="All Customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            {customers?.map((c) => (
              <SelectItem key={c.id} value={c.id.toString()}>
                {c.firstName} {c.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-card border-border">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All (except cancelled)</SelectItem>
            {statusOptions
              .filter((s) => s.value !== "saved")
              .map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl shimmer" />
          ))}
        </div>
      ) : (
        <>
          {/* Confirmed Orders Table */}
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">Confirmed Orders</h2>
            </div>
            {confirmedOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                  <ShoppingCart className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No confirmed orders found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Order ID</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Customer Name</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Order Date</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
                      <th className="px-5 py-3 text-right font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {confirmedOrders.map((item) => (
                      <tr
                        key={item.order.id}
                        className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <span className="font-medium text-foreground">{item.order.orderNumber}</span>
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground">
                          {item.customer
                            ? `CS ${String(item.customer.id).padStart(6, "0")} ${item.customer.firstName} ${item.customer.lastName}`
                            : "—"}
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground">
                          {formatDate(item.order.orderDate)}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(
                              item.order.status || "pending"
                            )}`}
                          >
                            {statusOptions.find((s) => s.value === item.order.status)?.label || "Pending"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1 text-xs">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => setLocation(`/orders/${item.order.id}`)}
                            >
                              Update
                            </Button>
                            <span className="text-border">|</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => setLocation(`/orders/${item.order.id}`)}
                            >
                              Processes
                            </Button>
                            <span className="text-border">|</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => toast.info("Feature coming soon")}
                            >
                              Copy
                            </Button>
                            <span className="text-border">|</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirm(item.order.id)}
                            >
                              Cancel
                            </Button>
                            <span className="text-border">|</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => toast.info("Feature coming soon")}
                            >
                              Re-Open
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

          {/* Saved Orders (Drafts) */}
          {savedOrders.length > 0 && (
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-base font-semibold text-foreground">Saved Orders</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Customer Name</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Description</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Created</th>
                      <th className="px-5 py-3 text-right font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedOrders.map((item) => (
                      <tr
                        key={item.order.id}
                        className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-5 py-3.5 text-foreground">
                          {item.customer
                            ? `CS ${String(item.customer.id).padStart(6, "0")} ${item.customer.firstName} ${item.customer.lastName}`
                            : "—"}
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground">
                          {item.order.notes || "—"}
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground">
                          {formatDate(item.order.createdAt)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1 text-xs">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => setLocation(`/orders/${item.order.id}`)}
                            >
                              Update
                            </Button>
                            <span className="text-border">|</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirm(item.order.id)}
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
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Order</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && deleteMutation.mutate({ id: deleteConfirm })}
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
