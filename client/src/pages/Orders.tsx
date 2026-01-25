import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  MoreHorizontal, 
  Pencil, 
  Trash2,
  ShoppingCart,
  Eye,
  Calendar,
  User,
  Package,
  Clock
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type OrderFormData = {
  customerId: number | null;
  catalogId: number | null;
  status: "pending" | "production" | "completed" | "delivered" | "cancelled";
  expectedDelivery: string;
  notes: string;
  totalPrice: string;
};

const initialFormData: OrderFormData = {
  customerId: null,
  catalogId: null,
  status: "pending",
  expectedDelivery: "",
  notes: "",
  totalPrice: "",
};

const statusOptions = [
  { value: "pending", label: "Pending", color: "bg-amber-500/20 text-amber-400" },
  { value: "production", label: "In Production", color: "bg-blue-500/20 text-blue-400" },
  { value: "completed", label: "Completed", color: "bg-emerald-500/20 text-emerald-400" },
  { value: "delivered", label: "Delivered", color: "bg-purple-500/20 text-purple-400" },
  { value: "cancelled", label: "Cancelled", color: "bg-rose-500/20 text-rose-400" },
];

export default function Orders() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<OrderFormData>(initialFormData);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [viewOrder, setViewOrder] = useState<any>(null);

  const utils = trpc.useUtils();
  
  const { data: orders, isLoading } = trpc.orders.list.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const { data: customers } = trpc.customers.list.useQuery();
  const { data: catalogs } = trpc.catalogs.list.useQuery();

  const createMutation = trpc.orders.create.useMutation({
    onSuccess: () => {
      toast.success("Order created successfully");
      setShowModal(false);
      resetForm();
      utils.orders.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create order");
    },
  });

  const updateMutation = trpc.orders.update.useMutation({
    onSuccess: () => {
      toast.success("Order updated successfully");
      setShowModal(false);
      resetForm();
      utils.orders.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update order");
    },
  });

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

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingId(null);
  };

  const handleEdit = (order: any) => {
    setEditingId(order.order.id);
    setFormData({
      customerId: order.order.customerId,
      catalogId: order.order.catalogId,
      status: order.order.status || "pending",
      expectedDelivery: order.order.expectedDelivery 
        ? new Date(order.order.expectedDelivery).toISOString().split('T')[0] 
        : "",
      notes: order.order.notes || "",
      totalPrice: order.order.totalPrice || "",
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!formData.customerId) {
      toast.error("Please select a customer");
      return;
    }

    const data = {
      customerId: formData.customerId,
      catalogId: formData.catalogId || undefined,
      status: formData.status,
      expectedDelivery: formData.expectedDelivery || undefined,
      notes: formData.notes || undefined,
      totalPrice: formData.totalPrice || undefined,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getStatusStyle = (status: string) => {
    return statusOptions.find(s => s.value === status)?.color || "bg-zinc-500/20 text-zinc-400";
  };

  const formatPrice = (price: string | null | undefined) => {
    if (!price) return "—";
    return `PKR ${Number(price).toLocaleString()}`;
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Filter orders by search
  const filteredOrders = orders?.filter(o => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      o.order.orderNumber?.toLowerCase().includes(searchLower) ||
      o.customer?.firstName?.toLowerCase().includes(searchLower) ||
      o.customer?.lastName?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and manage customer orders
          </p>
        </div>
        <Button 
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="gold-gradient text-primary-foreground border-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Order
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-card border-border">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {statusOptions.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl shimmer" />
          ))}
        </div>
      ) : filteredOrders?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center mb-4">
            <ShoppingCart className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">No orders found</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first order to get started.</p>
          <Button 
            onClick={() => { resetForm(); setShowModal(true); }}
            className="gold-gradient text-primary-foreground border-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders?.map((item, index) => (
            <div
              key={item.order.id}
              className="group relative rounded-xl bg-card border border-border p-5 transition-all hover:border-primary/30 animate-fadeIn"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground">{item.order.orderNumber}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(item.order.status || 'pending')}`}>
                        {statusOptions.find(s => s.value === item.order.status)?.label || 'Pending'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      {item.customer && (
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {item.customer.firstName} {item.customer.lastName}
                        </span>
                      )}
                      {item.order.expectedDelivery && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(item.order.expectedDelivery)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-semibold text-primary">
                      {formatPrice(item.order.totalPrice)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(item.order.createdAt)}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setViewOrder(item)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(item)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setDeleteConfirm(item.order.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Order Modal */}
      <Dialog open={showModal} onOpenChange={(open) => {
        if (!open) resetForm();
        setShowModal(open);
      }}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingId ? "Edit Order" : "Create New Order"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Enter the order details below.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customer" className="text-foreground">Customer *</Label>
              <Select 
                value={formData.customerId?.toString() || ""} 
                onValueChange={(v) => setFormData({ ...formData, customerId: v ? Number(v) : null })}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.firstName} {customer.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="catalog" className="text-foreground">Catalog (Optional)</Label>
              <Select 
                value={formData.catalogId?.toString() || "none"} 
                onValueChange={(v) => setFormData({ ...formData, catalogId: v === "none" ? null : Number(v) })}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Select a catalog" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No catalog</SelectItem>
                  {catalogs?.map((item) => (
                    <SelectItem key={item.catalog.id} value={item.catalog.id.toString()}>
                      {item.catalog.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status" className="text-foreground">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(v) => setFormData({ ...formData, status: v as any })}
                >
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expectedDelivery" className="text-foreground">Expected Delivery</Label>
                <Input
                  id="expectedDelivery"
                  type="date"
                  value={formData.expectedDelivery}
                  onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalPrice" className="text-foreground">Total Price (PKR)</Label>
              <Input
                id="totalPrice"
                type="number"
                value={formData.totalPrice}
                onChange={(e) => setFormData({ ...formData, totalPrice: e.target.value })}
                placeholder="e.g., 500000"
                className="bg-input border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-foreground">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Order notes..."
                className="bg-input border-border"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="gold-gradient text-primary-foreground border-0"
              >
                {editingId ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Order Details Modal */}
      <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Order Details</DialogTitle>
          </DialogHeader>
          
          {viewOrder && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Number:</span>
                  <span className="font-medium text-foreground">{viewOrder.order.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(viewOrder.order.status)}`}>
                    {statusOptions.find(s => s.value === viewOrder.order.status)?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="text-foreground">
                    {viewOrder.customer?.firstName} {viewOrder.customer?.lastName}
                  </span>
                </div>
                {viewOrder.catalog && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Catalog:</span>
                    <span className="text-foreground">{viewOrder.catalog.name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Price:</span>
                  <span className="font-semibold text-primary">{formatPrice(viewOrder.order.totalPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected Delivery:</span>
                  <span className="text-foreground">{formatDate(viewOrder.order.expectedDelivery)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="text-foreground">{formatDate(viewOrder.order.createdAt)}</span>
                </div>
                {viewOrder.order.notes && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-muted-foreground text-sm">Notes:</span>
                    <p className="text-foreground mt-1">{viewOrder.order.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
