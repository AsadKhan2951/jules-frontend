import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Package,
  ShoppingCart,
  CreditCard,
  Edit,
  User
} from "lucide-react";
import { useParams, useLocation } from "wouter";

export default function CustomerDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const customerId = Number(params.id);

  const { data: customer, isLoading: customerLoading } = trpc.customers.getById.useQuery(
    { id: customerId },
    { enabled: !!customerId }
  );

  const { data: orders, isLoading: ordersLoading } = trpc.orders.list.useQuery();
  
  // Filter orders for this customer
  const customerOrders = orders?.filter(o => o.order.customerId === customerId) || [];

  const formatDate = (date: any) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: any) => {
    if (!amount) return "-";
    return `PKR ${Number(amount).toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-500';
      case 'production': return 'bg-blue-500/20 text-blue-500';
      case 'completed': return 'bg-green-500/20 text-green-500';
      case 'delivered': return 'bg-purple-500/20 text-purple-500';
      case 'cancelled': return 'bg-red-500/20 text-red-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (customerLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center mb-4">
          <User className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">Customer not found</h3>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/customers")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Customers
        </Button>
      </div>
    );
  }

  const totalSpent = customerOrders.reduce((sum, o) => sum + Number(o.order.totalPrice || 0), 0);
  const completedOrders = customerOrders.filter(o => o.order.status === 'completed' || o.order.status === 'delivered').length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/customers")} className="hover:bg-card">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-foreground">
            {customer.firstName} {customer.lastName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Customer since {formatDate(customer.createdAt)}
          </p>
        </div>
        <Badge className={customer.paymentStatus === 'paid' ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}>
          {customer.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
        </Badge>
      </div>

      {/* Customer Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Contact Info */}
        <div className="rounded-xl bg-card border border-border p-5">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Contact Information</h3>
          <div className="space-y-3">
            {customer.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{customer.email}</span>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{customer.phone}</span>
              </div>
            )}
            {(customer.city || customer.country) && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">
                  {[customer.city, customer.country].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Total Orders */}
        <div className="rounded-xl bg-card border border-border p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-semibold text-foreground">{customerOrders.length}</p>
            </div>
          </div>
        </div>

        {/* Completed Orders */}
        <div className="rounded-xl bg-card border border-border p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Package className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-semibold text-foreground">{completedOrders}</p>
            </div>
          </div>
        </div>

        {/* Total Spent */}
        <div className="rounded-xl bg-card border border-border p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className="text-2xl font-semibold text-foreground">{formatCurrency(totalSpent)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Order History</h3>
          <p className="text-sm text-muted-foreground mt-1">All orders placed by this customer</p>
        </div>
        
        {customerOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
              <ShoppingCart className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No orders yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-muted-foreground">Order #</TableHead>
                  <TableHead className="text-muted-foreground">Date</TableHead>
                  <TableHead className="text-muted-foreground">Catalog</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Expected Delivery</TableHead>
                  <TableHead className="text-muted-foreground text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerOrders.map((orderItem) => (
                  <TableRow 
                    key={orderItem.order.id} 
                    className="border-border hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setLocation(`/orders/${orderItem.order.id}`)}
                  >
                    <TableCell className="font-medium text-foreground">
                      <span className="text-primary hover:underline">{orderItem.order.orderNumber}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(orderItem.order.createdAt)}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {orderItem.catalog?.name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(orderItem.order.status || 'pending')}>
                        {orderItem.order.status || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(orderItem.order.expectedDelivery)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground">
                      {formatCurrency(orderItem.order.totalPrice)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Address Details */}
      {customer.address && (
        <div className="rounded-xl bg-card border border-border p-5">
          <h3 className="text-lg font-semibold text-foreground mb-4">Full Address</h3>
          <p className="text-foreground">
            {customer.address}
            {customer.city && <>, {customer.city}</>}
            {customer.state && <>, {customer.state}</>}
            {customer.country && <>, {customer.country}</>}
          </p>
        </div>
      )}

      {/* Notes */}
      {customer.notes && (
        <div className="rounded-xl bg-card border border-border p-5">
          <h3 className="text-lg font-semibold text-foreground mb-4">Notes</h3>
          <p className="text-muted-foreground whitespace-pre-wrap">{customer.notes}</p>
        </div>
      )}
    </div>
  );
}
