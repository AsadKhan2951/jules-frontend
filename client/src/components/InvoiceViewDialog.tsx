import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";

type OrderItemLike = { id: number; itemName: string | null; images?: string[] | null; quantity?: number | null };
type CustomerLike = { firstName?: string | null; lastName?: string | null; phone?: string | null; email?: string | null } | null | undefined;

const money = (value: unknown) => `PKR ${Number(value || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;
const day = (value: unknown) =>
  value ? new Date(value as string).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const escapeHtml = (text: unknown) =>
  String(text ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

/** Invoice view with the order's design images, plus a printable version. */
export function InvoiceViewDialog({
  invoiceId,
  onClose,
  orderNumber,
  customer,
  orderItems,
}: {
  invoiceId: number | null;
  onClose: () => void;
  orderNumber?: string | null;
  customer: CustomerLike;
  orderItems: OrderItemLike[];
}) {
  const { data: invoice, isLoading } = trpc.invoices.getById.useQuery(
    { id: invoiceId ?? 0 },
    { enabled: invoiceId !== null }
  );
  const customerName = customer ? `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() : "—";
  const itemsWithImages = orderItems.filter(item => item.images && item.images.length > 0);
  const lines = invoice?.items ?? [];
  const totals: Array<[string, unknown]> = invoice
    ? [
        ["Metal Value", invoice.metalValue],
        ["Stone Value", invoice.stoneValue],
        ["Making Charges", invoice.makingCharges],
        ["Other Charges", invoice.otherCharges],
        ["Discount", invoice.discount],
      ]
    : [];

  const handlePrint = () => {
    if (!invoice) return;
    const origin = window.location.origin;
    const imageBlocks = itemsWithImages
      .map(
        item => `<div class="design"><h4>${escapeHtml(item.itemName || "Item")}</h4><div class="imgs">${(item.images ?? [])
          .map(url => `<img src="${escapeHtml(url.startsWith("http") ? url : origin + url)}" />`)
          .join("")}</div></div>`
      )
      .join("");
    const lineRows = lines
      .map(
        (line: any) => `<tr><td>${escapeHtml(line.itemName)}</td><td>${escapeHtml(line.particular)}</td><td class="r">${escapeHtml(
          line.qty ?? ""
        )}</td><td class="r">${escapeHtml(line.netWeight ?? line.weight ?? "")}</td><td class="r">${escapeHtml(
          line.rate ?? ""
        )}</td><td class="r">${escapeHtml(money(line.amount))}</td></tr>`
      )
      .join("");
    const totalRows = totals
      .filter(([, value]) => Number(value) !== 0)
      .map(([label, value]) => `<tr><td>${label}</td><td class="r">${escapeHtml(money(value))}</td></tr>`)
      .join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(invoice.invoiceNumber)}</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:32px;font-size:13px}
h1{margin:0;font-size:22px}h4{margin:0 0 6px}
.head{display:flex;justify-content:space-between;border-bottom:2px solid #b8860b;padding-bottom:12px;margin-bottom:16px}
table{width:100%;border-collapse:collapse;margin:12px 0}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
th{background:#f6f1e3}.r{text-align:right}.tot{width:320px;margin-left:auto}
.design{margin:10px 0;page-break-inside:avoid}.imgs{display:flex;flex-wrap:wrap;gap:8px}
.imgs img{width:150px;height:150px;object-fit:cover;border:1px solid #ddd;border-radius:6px}
.grand td{font-weight:bold;font-size:15px}
</style></head><body>
<div class="head"><div><h1>Sales Invoice</h1><div>${escapeHtml(invoice.invoiceNumber)}</div></div>
<div style="text-align:right"><div><b>Date:</b> ${escapeHtml(day(invoice.invoiceDate || invoice.createdAt))}</div>
<div><b>Order:</b> ${escapeHtml(orderNumber)}</div><div><b>Customer:</b> ${escapeHtml(customerName)}</div>
<div>${escapeHtml(customer?.phone || "")}</div></div></div>
${lineRows ? `<table><thead><tr><th>Item</th><th>Particular</th><th class="r">Qty</th><th class="r">Net Wt</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead><tbody>${lineRows}</tbody></table>` : ""}
<table class="tot"><tbody>${totalRows}<tr class="grand"><td>Total</td><td class="r">${escapeHtml(money(invoice.totalAmount))}</td></tr></tbody></table>
${invoice.remarks ? `<p><b>Remarks:</b> ${escapeHtml(invoice.remarks)}</p>` : ""}
${imageBlocks ? `<h3>Design Images</h3>${imageBlocks}` : ""}
<script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
</body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  return (
    <Dialog open={invoiceId !== null} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{invoice?.invoiceNumber ?? "Invoice"}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {orderNumber} · {customerName} · {day(invoice?.invoiceDate || invoice?.createdAt)}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !invoice ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5">
            {lines.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Item</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Particular</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Qty</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Net Wt</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Rate</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line: any) => (
                      <tr key={line.id} className="border-b border-border/50">
                        <td className="px-3 py-2 text-foreground">{line.itemName}</td>
                        <td className="px-3 py-2 text-muted-foreground">{line.particular || "—"}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{line.qty ?? "—"}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{line.netWeight ?? line.weight ?? "—"}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{line.rate ?? "—"}</td>
                        <td className="px-3 py-2 text-right text-foreground">{money(line.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
              {totals
                .filter(([, value]) => Number(value) !== 0)
                .map(([label, value]) => (
                  <div key={label} className="flex justify-between text-muted-foreground">
                    <span>{label}</span>
                    <span>{money(value)}</span>
                  </div>
                ))}
              <div className="flex justify-between border-t border-border pt-1 text-base font-semibold text-foreground">
                <span>Total</span>
                <span>{money(invoice.totalAmount)}</span>
              </div>
            </div>

            {invoice.remarks && <p className="text-sm text-muted-foreground">Remarks: {invoice.remarks}</p>}

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Design Images</h4>
              {itemsWithImages.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No images on this order yet. Add them from Edit Order → Order Items.
                </p>
              ) : (
                itemsWithImages.map(item => (
                  <div key={item.id}>
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">{item.itemName}</p>
                    <div className="flex flex-wrap gap-2">
                      {(item.images ?? []).map(url => (
                        <a key={url} href={url} target="_blank" rel="noreferrer">
                          <img src={url} alt={item.itemName ?? "Item"} className="h-28 w-28 rounded-lg border border-border object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button onClick={handlePrint} className="gold-gradient text-primary-foreground border-0">
                <Printer className="h-4 w-4 mr-2" /> Print
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default InvoiceViewDialog;
