import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Gem, ImageIcon, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { calculateProductPrice, karatLabel, rateForKarat, toNumber, type GoldRates } from "@shared/pricing";
import { formatPKR, productImages } from "./productUtils";

type Props = {
  item: { product: any; category: any } | null;
  goldRates: GoldRates | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (item: { product: any; category: any }) => void;
  onDelete: (id: number) => void;
};

export function ProductDetailDialog({ item, goldRates, open, onOpenChange, onEdit, onDelete }: Props) {
  const product = item?.product;
  const images = useMemo(() => (product ? productImages(product) : []), [product]);
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [product?.id]);

  // Arrow keys move between photos.
  useEffect(() => {
    if (!open || images.length < 2) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") setIndex(i => (i + 1) % images.length);
      if (event.key === "ArrowLeft") setIndex(i => (i - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, images.length]);

  if (!product) return null;

  const price = calculateProductPrice(product, goldRates);
  const total = price.total ?? toNumber(product.totalPrice);
  const todayRate = rateForKarat(product.goldKarat, goldRates);
  const rateAtOrder = toNumber(product.goldRateAtOrder);
  const weight = toNumber(product.goldWeight);

  const groups: Array<{ title: string; rows: Array<[string, string | null]> }> = [
    {
      title: "Gold",
      rows: [
        ["Type", product.goldKarat ? karatLabel(product.goldKarat, goldRates?.whiteGoldKarat) : null],
        ["Weight (incl. wastage)", weight ? `${weight} tola` : null],
        ["Wastage", toNumber(product.goldWastage) ? `${toNumber(product.goldWastage)}%` : null],
        ["Rate today", todayRate ? `${formatPKR(todayRate)} / tola` : null],
        ["Rate when added", rateAtOrder ? `${formatPKR(rateAtOrder)} / tola` : null],
      ],
    },
    {
      title: "Diamonds",
      rows: [
        ["Weight", toNumber(product.diamondWeight) ? `${toNumber(product.diamondWeight)} ct` : null],
        ["Rate", toNumber(product.diamondRate) ? `${formatPKR(toNumber(product.diamondRate))} / ct` : null],
      ],
    },
    {
      title: product.stoneType ? `Stones · ${product.stoneType}` : "Stones",
      rows: [
        ["Weight", toNumber(product.stoneWeight) ? `${toNumber(product.stoneWeight)} ct` : null],
        ["Rate", toNumber(product.stoneRate) ? `${formatPKR(toNumber(product.stoneRate))} / ct` : null],
      ],
    },
  ];
  const specs = groups
    .map(group => ({ ...group, rows: group.rows.filter(([, value]) => !!value) }))
    .filter(group => group.rows.length > 0);

  const breakdown: Array<[string, number]> = [
    [weight && todayRate ? `Gold · ${weight} tola × ${formatPKR(todayRate)}` : "Gold", price.goldValue],
    [product.makingChargesType === "per_gram" ? "Making (per gram)" : "Making", price.making],
    ["Diamonds", price.diamonds],
    ["Stones", price.stones],
  ].filter(([, value]) => (value as number) > 0) as Array<[string, number]>;

  const current = images[index];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl w-[calc(100%-2rem)] p-0 gap-0 overflow-hidden bg-card border-border md:h-[min(86vh,760px)]">
        <div className="grid h-full md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          {/* Photo viewer */}
          <div className="relative flex flex-col bg-neutral-950 min-h-[320px]">
            <div className="relative flex-1 flex items-center justify-center overflow-hidden">
              {current ? (
                <img key={current} src={current} alt={product.name} className="max-h-full max-w-full object-contain animate-in fade-in duration-200" />
              ) : (
                <ImageIcon className="h-16 w-16 text-white/20" />
              )}
              {images.length > 1 && (
                <>
                  <NavButton side="left" onClick={() => setIndex(i => (i - 1 + images.length) % images.length)} />
                  <NavButton side="right" onClick={() => setIndex(i => (i + 1) % images.length)} />
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2.5 py-0.5 text-xs text-white/80">
                    {index + 1} / {images.length}
                  </span>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto bg-black/40 p-3">
                {images.map((src, i) => (
                  <button
                    key={src + i}
                    type="button"
                    onClick={() => setIndex(i)}
                    className={cn(
                      "h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 transition",
                      i === index ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex min-h-0 flex-col">
            <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
              <div className="flex flex-wrap items-center gap-2 pr-8">
                {item?.category && <Badge variant="secondary">{item.category.name}</Badge>}
                {product.sku && <span className="text-xs font-mono text-muted-foreground">{product.sku}</span>}
              </div>
              <DialogTitle className="mt-2 text-2xl font-semibold leading-tight text-foreground">{product.name}</DialogTitle>
              <DialogDescription className={cn("mt-1.5 text-sm", !product.description && "sr-only")}>
                {product.description || "Product details"}
              </DialogDescription>

              {/* Price */}
              <div className="mt-5 rounded-xl border border-primary/25 bg-primary/5 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Price today</p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-primary">{total ? formatPKR(total) : "Not priced yet"}</p>
                {breakdown.length > 0 && (
                  <dl className="mt-3 space-y-1.5 border-t border-primary/15 pt-3 text-sm">
                    {breakdown.map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="tabular-nums text-foreground">{formatPKR(value)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {!total && (
                  <p className="mt-2 text-xs text-muted-foreground">Add gold karat and weight to calculate the price.</p>
                )}
              </div>

              {/* Specifications */}
              {specs.length > 0 && (
                <div className="mt-6 space-y-5">
                  {specs.map(group => (
                    <section key={group.title}>
                      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <Gem className="h-3.5 w-3.5" />
                        {group.title}
                      </h4>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-muted/40 p-4">
                        {group.rows.map(([label, value]) => (
                          <div key={label} className="min-w-0">
                            <dt className="text-xs text-muted-foreground">{label}</dt>
                            <dd className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border px-6 py-3">
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => onDelete(product.id)}>
                <Trash2 className="mr-1.5 h-4 w-4" /> Delete
              </Button>
              <Button size="sm" onClick={() => item && onEdit(item)} className="gold-gradient text-primary-foreground border-0">
                <Pencil className="mr-1.5 h-4 w-4" /> Edit product
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NavButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "absolute top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/75",
        side === "left" ? "left-3" : "right-3"
      )}
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
