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
  Calendar,
  Package,
  User,
  Truck,
  CreditCard,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react";
import { useParams, useLocation } from "wouter";

export default function OrderDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const orderId = Number(params.id);

  const { data: orders, isLoading } = trpc.orders.list.useQuery();
  const { data: products } = trpc.products.list.useQuery();
  
  // Find the specific order
  const orderData = orders?.find(o => o.order.id === orderId);
  const order = orderData?.order;
  const customer = orderData?.customer;
  const catalog = orderData?.catalog;

  // Get order with items
  const { data: orderWithItems } = trpc.orders.getById.useQuery(
    { id: orderId },
    { enabled: !!orderId }
  );
  
  const orderItems = orderWithItems?.items || [];

  const formatDate = (date: any) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
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
      case 'pending': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'production': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      case 'completed': return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'delivered': return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-500 border-red-500/30';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'production': return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      case 'delivered': return <Truck className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  // Get product details for order items
  const getProductDetails = (productId: number) => {
    const productData = products?.find(p => p.product.id === productId);
    return productData?.product;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

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
        <Button variant="ghost" size="icon" onClick={() => {
          // Use browser history to go back to the previous page
          if (window.history.length > 1) {
            window.history.back();
          } else {
            setLocation('/orders');
          }
        }} className="hover:bg-card">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">
              {order.orderNumber}
            </h1>
            <Badge className={`${getStatusColor(order.status || 'pending')} border`}>
              <span className="flex items-center gap-1.5">
                {getStatusIcon(order.status || 'pending')}
                {order.status || 'pending'}
              </span>
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Placed on {formatDate(order.orderDate)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Order Total</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(order.totalPrice)}</p>
        </div>
      </div>

      {/* Order Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Customer Info */}
        <div 
          className="rounded-xl bg-card border border-border p-5 cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => customer && setLocation(`/customers/${customer.id}`)}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <User className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-sm text-muted-foreground">Customer</p>
          </div>
          {customer ? (
            <div>
              <p className="font-medium text-foreground">{customer.firstName} {customer.lastName}</p>
              <p className="text-sm text-muted-foreground">{customer.phone || customer.email}</p>
            </div>
          ) : (
            <p className="text-muted-foreground">No customer assigned</p>
          )}
        </div>

        {/* Catalog Info */}
        <div className="rounded-xl bg-card border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <FileText className="h-5 w-5 text-purple-500" />
            </div>
            <p className="text-sm text-muted-foreground">Catalog</p>
          </div>
          {catalog ? (
            <p className="font-medium text-foreground">{catalog.name}</p>
          ) : (
            <p className="text-muted-foreground">No catalog linked</p>
          )}
        </div>

        {/* Expected Delivery */}
        <div className="rounded-xl bg-card border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Truck className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground">Expected Delivery</p>
          </div>
          <p className="font-medium text-foreground">{formatDate(order.expectedDelivery)}</p>
        </div>

        {/* Items Count */}
        <div className="rounded-xl bg-card border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Items</p>
          </div>
          <p className="font-medium text-foreground">{orderItems?.length || order.totalItems || 0} products</p>
        </div>
      </div>

      {/* Order Items */}
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Order Items</h3>
          <p className="text-sm text-muted-foreground mt-1">Products included in this order</p>
        </div>
        
        {!orderItems || orderItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No items in this order</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-muted-foreground">Product</TableHead>
                  <TableHead className="text-muted-foreground">SKU</TableHead>
                  <TableHead className="text-muted-foreground text-center">Quantity</TableHead>
                  <TableHead className="text-muted-foreground text-right">Unit Price</TableHead>
                  <TableHead className="text-muted-foreground text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderItems.map((item: any, index: number) => {
                  const product = getProductDetails(item.productId);
                  return (
                    <TableRow key={item.id || `item-${index}`} className="border-border hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {product?.primaryImage ? (
                            <img 
                              src={product.primaryImage} 
                              alt={product.name}
                              className="w-12 h-12 rounded-lg object-cover bg-muted"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-foreground">{product?.name || 'Unknown Product'}</p>
                            {product?.goldKarat && (
                              <p className="text-xs text-muted-foreground">{product?.goldKarat} Gold</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {product?.sku || '-'}
                      </TableCell>
                      <TableCell className="text-center text-foreground">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-foreground">
                        {formatCurrency(item.totalPrice)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Order Summary */}
        <div className="p-5 border-t border-border bg-muted/30">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">{formatCurrency(order.totalPrice)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="text-foreground">-</span>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex justify-between font-semibold">
                <span className="text-foreground">Total</span>
                <span className="text-primary">{formatCurrency(order.totalPrice)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="rounded-xl bg-card border border-border p-5">
          <h3 className="text-lg font-semibold text-foreground mb-4">Order Notes</h3>
          <p className="text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
        </div>
      )}

      {/* Timeline */}
      <div className="rounded-xl bg-card border border-border p-5">
        <h3 className="text-lg font-semibold text-foreground mb-4">Order Timeline</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="font-medium text-foreground">Order Placed</p>
              <p className="text-sm text-muted-foreground">{formatDate(order.orderDate)}</p>
            </div>
          </div>
          
          {(order.status === 'production' || order.status === 'completed' || order.status === 'delivered') && (
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Loader2 className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="font-medium text-foreground">In Production</p>
                <p className="text-sm text-muted-foreground">Order is being crafted</p>
              </div>
            </div>
          )}
          
          {(order.status === 'completed' || order.status === 'delivered') && (
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="font-medium text-foreground">Completed</p>
                <p className="text-sm text-muted-foreground">{formatDate(order.completedDate)}</p>
              </div>
            </div>
          )}
          
          {order.status === 'delivered' && (
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Truck className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <p className="font-medium text-foreground">Delivered</p>
                <p className="text-sm text-muted-foreground">Order has been delivered</p>
              </div>
            </div>
          )}
          
          {order.status === 'pending' && (
            <div className="flex items-start gap-4 opacity-50">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">Awaiting Processing</p>
                <p className="text-sm text-muted-foreground">Order will be processed soon</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
