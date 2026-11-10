/**
 * Metals, gems and stock voucher types used by the karigar (vendor) and inventory flow,
 * following the shop's old Zewar system. Same file in the frontend and backend (shared/metals.ts).
 */

/** Metals in the order Zewar lists them. `karat` is set for gold so conversions can be shown. */
export const METALS: Array<{ name: string; karat?: number }> = [
  { name: "Gold 24K Tezabi", karat: 24 },
  { name: "Gold 24k", karat: 24 },
  { name: "Gold 22k", karat: 22 },
  { name: "Gold 21k", karat: 21 },
  { name: "Gold 20k", karat: 20 },
  { name: "Gold 18k", karat: 18 },
  { name: "White Gold" },
  { name: "Platinum" },
  { name: "Palladium" },
  { name: "Silver" },
];
export const METAL_NAMES = METALS.map(metal => metal.name);

/** Common gem names offered as suggestions (any name can be typed). */
export const GEM_SUGGESTIONS = [
  "Diamonds",
  "Diamonds Melee",
  "Polki",
  "Emeralds",
  "Rubies",
  "Sapphires",
  "Pearls",
  "Opal",
  "Kundan",
  "Zircon",
];

export const GEM_UNITS = ["ct", "gm"] as const;
export type GemUnit = (typeof GEM_UNITS)[number];

/** 1 tola = 96 raati; Zewar's "Alloy" is raati added per tola of metal issued. */
export const RAATI_PER_TOLA = 96;

/** Net weight after adding alloy: weight × (1 + raati / 96). E.g. 25 g + 18 raati → 29.688 g. */
export function netWithAlloy(weight: number, raati: number) {
  if (!Number.isFinite(weight) || weight <= 0) return 0;
  const alloy = Number.isFinite(raati) && raati > 0 ? raati : 0;
  return Math.round(weight * (1 + alloy / RAATI_PER_TOLA) * 1000) / 1000;
}

/** Raati per tola needed to turn pure gold of `fromKarat` into `toKarat` (e.g. 24k → 20k = 19.2). */
export function raatiForKarat(fromKarat: number, toKarat: number) {
  if (!fromKarat || !toKarat || toKarat >= fromKarat) return 0;
  return Math.round((RAATI_PER_TOLA * fromKarat / toKarat - RAATI_PER_TOLA) * 100) / 100;
}

export function karatOf(metal: string | null | undefined) {
  return METALS.find(item => item.name.toLowerCase() === String(metal ?? "").toLowerCase())?.karat;
}

/** Stock voucher types (prefix = what Zewar prints, e.g. "PM 555"). */
export const STOCK_VOUCHER_TYPES = {
  PM: { label: "Purchase Metal", group: "purchase", kind: "metal" },
  PG: { label: "Purchase Gems", group: "purchase", kind: "gem" },
  PJ: { label: "Purchase Jewellery", group: "purchase", kind: "jewellery" },
  SM: { label: "Sale Metal", group: "sale", kind: "metal" },
  SG: { label: "Sale Gems", group: "sale", kind: "gem" },
  SJ: { label: "Sale Jewellery", group: "sale", kind: "jewellery" },
  VI: { label: "Issue to Karigar", group: "karigar", kind: "metal" },
  VR: { label: "Return from Karigar", group: "karigar", kind: "metal" },
} as const;
export type StockVoucherType = keyof typeof STOCK_VOUCHER_TYPES;
export const STOCK_VOUCHER_CODES = Object.keys(STOCK_VOUCHER_TYPES) as StockVoucherType[];
