import { invoiceLinesFromOrderItems, lineTypeOf } from "@shared/invoiceLines";

export type OrderItemLike = { id: number; itemName: string | null; images?: string[] | null } & Record<string, any>;
export type CustomerLike = { id?: number; firstName?: string | null; lastName?: string | null; phone?: string | null } | null | undefined;
export type OrderLike = { orderNumber?: string | null; advanceCash?: string | number | null; notes?: string | null } | null | undefined;

const num = (value: unknown) => {
  const n = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(n) ? 0 : n;
};
const amount = (value: unknown) => num(value).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const weight = (value: unknown, unit: string) => (num(value) ? `${num(value).toLocaleString("en-PK", { maximumFractionDigits: 3 })} ${unit}` : "");
const day = (value: unknown) =>
  value ? new Date(value as string).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";
const esc = (text: unknown) =>
  String(text ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

/** Printable sales invoice in the shop's bill layout, with one picture of every item at the top. */
export function buildInvoiceHtml({
  invoice,
  order,
  customer,
  orderItems,
  itemCovers,
  origin,
}: {
  invoice: any;
  order: OrderLike;
  customer: CustomerLike;
  orderItems: OrderItemLike[];
  itemCovers?: Record<number, string> | null;
  origin: string;
}): string {
  if (!invoice) return "";
  const absolute = (url: string) => (/^(https?:|data:)/.test(url) ? url : origin + (url.startsWith("/") ? url : `/${url}`));

  // Lines: saved on the invoice; older invoices without lines are rebuilt from the order.
  const saved = (invoice.items ?? []) as any[];
  const lines = saved.length ? saved : invoiceLinesFromOrderItems(orderItems);
  const groups: Array<{ name: string; lines: any[] }> = [];
  for (const line of lines) {
    const name = line.itemName || "Item";
    const last = groups[groups.length - 1];
    if (last && last.name === name) last.lines.push(line);
    else groups.push({ name, lines: [line] });
  }

  const pictures = orderItems
    .map(item => ({ name: item.itemName || "Item", url: itemCovers?.[item.id] || item.images?.find(Boolean) }))
    .filter((picture): picture is { name: string; url: string } => !!picture.url);

  const rows = groups
    .map(group => {
      const body = group.lines
        .map(line => {
          const stone = lineTypeOf(line) === "stone";
          const cells = stone
            ? [line.qty ?? "", weight(line.weight, line.weightUnit || "ct"), num(line.rate) ? amount(line.rate) : "0", "", "", "", ""]
            : [
                "",
                "",
                "",
                weight(line.weight, line.weightUnit || "gm"),
                `${num(line.wastage)} %`,
                weight(line.netWeight || line.weight, line.weightUnit || "gm"),
                num(line.rate) ? amount(line.rate) : "0",
              ];
          return `<tr><td class="part">${esc(line.particular || "")}</td>${cells
            .map(cell => `<td class="r">${esc(cell)}</td>`)
            .join("")}<td class="r">${amount(line.amount)}</td></tr>`;
        })
        .join("");
      return `<tr class="item"><td colspan="9">${esc(group.name)}</td></tr>${body}`;
    })
    .join("");

  const total = num(invoice.totalAmount);
  const advance = num(order?.advanceCash);
  const summary: Array<[string, number, string?]> = [
    ["Metal Value", num(invoice.metalValue)],
    ["Stone Value", num(invoice.stoneValue)],
    ["Making", num(invoice.makingCharges)],
    ...(num(invoice.otherCharges) ? [["Other Charges", num(invoice.otherCharges)] as [string, number]] : []),
    ...(num(invoice.discount) ? [["Discount", -num(invoice.discount)] as [string, number]] : []),
    ["Total Bill Amount", total, "line"],
    ["Total Advance (Cash Value)", advance],
    ["Net Bill Amount", total - advance, "grand"],
  ];
  const customerName = customer ? `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() : "";
  const note = [invoice.remarks, order?.notes].find(text => text && String(text).trim()) ?? "";

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(invoice.invoiceNumber || "Sales Invoice")}</title>
<style>
*{box-sizing:border-box}
body{font-family:"Courier New",Courier,monospace;color:#111;margin:0;padding:28px 32px;font-size:12.5px;background:#fff}
.top{display:grid;grid-template-columns:1fr auto 1fr;align-items:start;gap:16px}
.top .date{text-align:center;padding-top:2px;white-space:nowrap}
.meta td{padding:2px 14px 2px 0;border:0}
.title{font:700 18px Arial,Helvetica,sans-serif;letter-spacing:.06em;text-transform:uppercase;margin:0;text-align:right}
.pics{display:flex;flex-wrap:wrap;gap:10px;margin:16px 0 14px;padding:10px 0;border-top:1px solid #111;border-bottom:1px solid #111}
.pic{width:120px;text-align:center}
.pic img{width:120px;height:120px;object-fit:cover;border:1px solid #bbb;border-radius:4px;display:block}
.pic span{display:block;margin-top:4px;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
table.bill{width:100%;border-collapse:collapse}
.bill th{border:1px solid #111;padding:4px 6px;font-weight:400;text-align:center}
.bill td{padding:3px 6px;vertical-align:top}
.bill .r{text-align:right;white-space:nowrap}
.bill tr.item td{padding-top:12px;text-decoration:underline}
.bill td.part{padding-left:6px}
.bill tbody tr:last-child td{border-bottom:1px solid #111;padding-bottom:10px}
.foot{display:flex;justify-content:space-between;gap:24px;margin-top:18px;page-break-inside:avoid}
.note{flex:1;max-width:48%;border:1px solid #111;min-height:110px;padding:8px;white-space:pre-wrap}
.sum{width:340px;border-collapse:collapse}
.sum td{padding:3px 0}.sum td.r{text-align:right}
.sum tr.line td{border-top:1px solid #111}
.sum tr.grand td{border-top:1px solid #111;border-bottom:3px double #111;font-weight:700}
@media print{body{padding:12mm}@page{size:A4;margin:0}}
</style></head><body>
<div class="top">
  <table class="meta"><tbody>
    <tr><td>Order #</td><td>${esc(order?.orderNumber || "")}</td></tr>
    <tr><td>Voucher #</td><td>${esc(invoice.invoiceNumber || "")}</td></tr>
    <tr><td>Customer</td><td>${esc([customer?.id ? `CS ${customer.id}` : "", customerName].filter(Boolean).join(" "))}${customer?.phone ? ` · ${esc(customer.phone)}` : ""}</td></tr>
  </tbody></table>
  <div class="date">Date&nbsp;&nbsp;${esc(day(invoice.invoiceDate || invoice.createdAt))}</div>
  <p class="title">Sales Invoice</p>
</div>
${pictures.length ? `<div class="pics">${pictures.map(p => `<div class="pic"><img src="${esc(absolute(p.url))}" alt=""><span>${esc(p.name)}</span></div>`).join("")}</div>` : `<div style="height:14px"></div>`}
<table class="bill">
  <thead>
  <tr><th rowspan="2" style="width:30%">Particulars</th><th colspan="3">Stone</th><th colspan="4">Metal</th><th rowspan="2">Amount</th></tr>
  <tr><th>Qty</th><th>Weight</th><th>Rate</th><th>Net Weight</th><th>Wastage</th><th>Total Weight</th><th>Rate</th></tr>
  </thead>
  <tbody>${rows || `<tr><td colspan="9" style="padding:14px 6px;color:#666">No items on this order.</td></tr>`}</tbody>
</table>
<div class="foot">
  <div class="note">${esc(note)}</div>
  <table class="sum"><tbody>${summary
  .map(([label, value, kind]) => `<tr class="${kind ?? ""}"><td>${esc(label)}</td><td class="r">${amount(value)}</td></tr>`)
  .join("")}</tbody></table>
</div>
</body></html>`;
}
