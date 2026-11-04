import { useMemo, useRef, useState } from "react";
import { BookImage, ImageIcon, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { ImageUploader } from "@/components/ImageUploader";
import { ProductPicker } from "@/components/ProductPicker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { buildInvoiceHtml, type CustomerLike, type OrderItemLike, type OrderLike } from "@/lib/invoiceHtml";

/** Sales invoice in the shop's bill layout, with one picture of every item in the header. */
export function InvoiceViewDialog({
  invoiceId,
  onClose,
  order,
  customer,
  orderItems,
  itemCovers,
}: {
  invoiceId: number | null;
  onClose: () => void;
  order: OrderLike;
  customer: CustomerLike;
  orderItems: OrderItemLike[];
  itemCovers?: Record<number, string> | null;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const { data: invoice, isLoading } = trpc.invoices.getById.useQuery({ id: invoiceId ?? 0 }, { enabled: invoiceId !== null });

  const html = useMemo(
    () => (invoice ? buildInvoiceHtml({ invoice, order, customer, orderItems, itemCovers, origin: window.location.origin }) : ""),
    [invoice, order, customer, orderItems, itemCovers]
  );

  const print = () => frame.current?.contentWindow?.print();

  // Pictures can be added right here (also after invoicing) — they appear at the top of the invoice.
  const utils = trpc.useUtils();
  const [pickingFor, setPickingFor] = useState<OrderItemLike | null>(null);
  const setPicture = trpc.orders.setItemPicture.useMutation({
    onSuccess: () => utils.orderDetail.get.invalidate(),
    onError: error => toast.error(error.message),
  });
  const missing = orderItems.filter(item => !(itemCovers?.[item.id] || item.images?.length)).length;

  return (
    <Dialog open={invoiceId !== null} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl w-[calc(100%-2rem)] max-h-[94vh] flex flex-col gap-3 bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{invoice?.invoiceNumber ?? "Sales Invoice"}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {order?.orderNumber} · {customer ? `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() : "—"}
          </DialogDescription>
        </DialogHeader>

        {orderItems.length > 0 && (
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <ImageIcon className="h-4 w-4 text-primary" /> Item pictures
                <span className="font-normal text-muted-foreground">— shown at the top of the invoice</span>
              </p>
              {missing > 0 && (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-600">
                  {missing} item{missing > 1 ? "s" : ""} without a picture
                </span>
              )}
            </div>
            <div className="space-y-2">
              {orderItems.map(item => (
                <div key={item.id} className="flex flex-wrap items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-sm text-foreground" title={item.itemName ?? ""}>{item.itemName || "Item"}</span>
                  <ImageUploader
                    images={item.images ?? []}
                    disabled={setPicture.isPending}
                    onChange={images => setPicture.mutate({ itemId: item.id, images })}
                  />
                  {!item.images?.length && itemCovers?.[item.id] && (
                    <span className="text-xs text-muted-foreground">Using the catalogue picture</span>
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={() => setPickingFor(item)}>
                    <BookImage className="mr-1.5 h-4 w-4" /> From catalogue
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading || !invoice ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <iframe
            ref={frame}
            title="Sales invoice"
            srcDoc={html}
            className="min-h-0 w-full flex-1 rounded-md border border-border bg-white"
            style={{ height: "62vh", minHeight: 420 }}
          />
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={print} disabled={!invoice} className="gold-gradient text-primary-foreground border-0">
            <Printer className="h-4 w-4 mr-2" /> Print / Save PDF
          </Button>
        </div>
      </DialogContent>
      <ProductPicker
        open={pickingFor !== null}
        onOpenChange={open => !open && setPickingFor(null)}
        title={pickingFor ? `Picture for ${pickingFor.itemName || "item"}` : undefined}
        onPick={product => {
          const item = pickingFor;
          if (!item || !product.image) return toast.error("This product has no picture");
          const images = [product.image, ...(item.images ?? []).filter(url => url !== product.image)].slice(0, 10);
          setPicture.mutate({ itemId: item.id, images, productId: product.id });
        }}
      />
    </Dialog>
  );
}

export default InvoiceViewDialog;
