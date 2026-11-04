import { useMemo, useRef } from "react";
import { Loader2, Printer } from "lucide-react";
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

  return (
    <Dialog open={invoiceId !== null} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl w-[calc(100%-2rem)] max-h-[92vh] flex flex-col gap-3 bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{invoice?.invoiceNumber ?? "Sales Invoice"}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {order?.orderNumber} · {customer ? `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() : "—"}
          </DialogDescription>
        </DialogHeader>

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
            style={{ height: "68vh" }}
          />
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={print} disabled={!invoice} className="gold-gradient text-primary-foreground border-0">
            <Printer className="h-4 w-4 mr-2" /> Print / Save PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default InvoiceViewDialog;
