export const formatPKR = (value: number | string | null | undefined) => {
  const n = typeof value === "number" ? value : Number(value);
  if (value == null || value === "" || !Number.isFinite(n)) return "—";
  return `PKR ${Math.round(n).toLocaleString("en-PK")}`;
};

/** Primary image first, then the comma-separated additional images. */
export function productImages(product: { primaryImage?: string | null; images?: string | null }): string[] {
  const list = [product.primaryImage, ...String(product.images ?? "").split(",")]
    .map(value => (value ?? "").trim())
    .filter(Boolean);
  return Array.from(new Set(list));
}

/** Small preview for grids; falls back to the full image. */
export const productThumb = (product: { thumbnail?: string | null; primaryImage?: string | null }) =>
  product.thumbnail || product.primaryImage || null;
