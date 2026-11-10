/** Print a report in the shop's old Zewar style (plain monospace table on white paper). */
export function printReport(title: string, bodyHtml: string, options: { landscape?: boolean } = {}) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
*{box-sizing:border-box}
body{font-family:"Courier New",Courier,monospace;color:#111;margin:0;padding:18px 22px;font-size:11.5px;background:#fff}
h1{font-size:14px;text-align:center;margin:0 0 4px;letter-spacing:.04em}
.sub{text-align:center;margin:0 0 12px}
.head{margin:10px 0 6px;font-weight:700}
table{width:100%;border-collapse:collapse;margin-bottom:14px}
th,td{border:1px solid #444;padding:3px 5px;vertical-align:top}
th{font-weight:400;background:#f2f2f2}
td.r,th.r{text-align:right;white-space:nowrap}
tr.total td{font-weight:700;background:#fafafa}
tr.bf td{font-style:italic}
@media print{body{padding:8mm}@page{size:A4 ${options.landscape ? "landscape" : "portrait"};margin:0}}
</style></head><body>${bodyHtml}</body></html>`;
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const doc = frame.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 2000);
  }, 250);
}

export function escapeHtml(text: unknown) {
  return String(text ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}

export const fmtWeight = (value: unknown) => {
  const n = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(n) || n === 0 ? "" : n.toFixed(3);
};
export const fmtMoney = (value: unknown) => {
  const n = Number(value);
  return !Number.isFinite(n) || n === 0 ? "" : n.toLocaleString("en-PK", { maximumFractionDigits: 2 });
};
export const fmtDate = (value: unknown) =>
  value ? new Date(value as string).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-") : "";
