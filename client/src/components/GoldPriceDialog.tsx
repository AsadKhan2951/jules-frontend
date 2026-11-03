import { useEffect, useMemo, useState } from "react";
import { Coins, Loader2, RefreshCw, Radio, PencilLine, Info } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { WHITE_GOLD_KARATS, priceForKarat, toNumber } from "@shared/pricing";

const formatPKR = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value) ? "—" : `PKR ${Math.round(value).toLocaleString("en-PK")}`;

const timeAgo = (iso: string) => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.round(minutes / 60)} h ago`;
};

/** Keep digits only for a clean, comma-free number input. */
const clean = (value: string) => value.replace(/[^\d.]/g, "");

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Daily gold rate popup. Opens pre-filled with today's live market rate
 * (international spot converted to PKR/tola + the local premium learned from
 * the last saved rate). Saving re-prices every product on the server.
 */
export function GoldPriceDialog({ open, onOpenChange }: Props) {
  const utils = trpc.useUtils();
  const live = trpc.goldPrice.live.useQuery(undefined, { enabled: open, staleTime: 5 * 60 * 1000, retry: 1 });
  const latestQuery = trpc.goldPrice.getLatest.useQuery(undefined, { enabled: open });
  const latest = latestQuery.data;

  const [price24k, setPrice24k] = useState("");
  const [price22k, setPrice22k] = useState("");
  const [whiteKarat, setWhiteKarat] = useState<string>("18k");
  const [whitePrice, setWhitePrice] = useState("");
  const [edited, setEdited] = useState(false);
  const [initialised, setInitialised] = useState(false);

  const liveRate = live.data?.ok ? live.data.rate : null;

  // Fill the form once per opening: live rate first, otherwise the last saved rate.
  useEffect(() => {
    if (!open) {
      setInitialised(false);
      setEdited(false);
      return;
    }
    if (initialised || live.isLoading || latestQuery.isLoading) return;
    const savedKarat = latest?.whiteGoldKarat || "18k";
    setWhiteKarat(savedKarat);
    if (liveRate) {
      setPrice24k(String(liveRate.price24k));
      setPrice22k(String(liveRate.price22k));
      setWhitePrice(String(priceForKarat(liveRate.price24k, savedKarat) ?? ""));
    } else if (latest) {
      setPrice24k(String(Math.round(Number(latest.price24k))));
      setPrice22k(String(Math.round(Number(latest.price22k))));
      setWhitePrice(latest.whiteGoldPrice ? String(Math.round(Number(latest.whiteGoldPrice))) : "");
    }
    setInitialised(true);
  }, [open, initialised, live.isLoading, latestQuery.isLoading, liveRate, latest]);

  const applyLive = () => {
    if (!liveRate) return;
    setPrice24k(String(liveRate.price24k));
    setPrice22k(String(liveRate.price22k));
    setWhitePrice(String(priceForKarat(liveRate.price24k, whiteKarat) ?? ""));
    setEdited(false);
  };

  // Typing a 24K rate keeps 22K and white gold in proportion until they are edited by hand.
  const on24kChange = (value: string) => {
    const v = clean(value);
    setPrice24k(v);
    const n = toNumber(v);
    if (n && !edited) {
      setPrice22k(String(priceForKarat(n, "22k")));
      setWhitePrice(String(priceForKarat(n, whiteKarat)));
    }
  };

  const onKaratChange = (karat: string) => {
    setWhiteKarat(karat);
    const n = toNumber(price24k);
    if (n) setWhitePrice(String(priceForKarat(n, karat)));
  };

  const previous = latest ? Number(latest.price24k) : null;
  const change = useMemo(() => {
    const now = toNumber(price24k);
    if (!now || !previous) return null;
    return { amount: now - previous, percent: ((now - previous) / previous) * 100 };
  }, [price24k, previous]);

  const save = trpc.goldPrice.set.useMutation({
    onSuccess: result => {
      toast.success(
        result.productsUpdated
          ? `Gold rate saved · ${result.productsUpdated} product prices updated`
          : "Gold rate saved"
      );
      utils.goldPrice.invalidate();
      utils.products.invalidate();
      utils.collections.invalidate();
      utils.catalogs.invalidate();
      utils.dashboard.invalidate();
      onOpenChange(false);
    },
    onError: error => toast.error(error.message || "Could not save the gold rate"),
  });

  const handleSave = () => {
    const p24 = toNumber(price24k);
    const p22 = toNumber(price22k);
    const white = toNumber(whitePrice);
    if (!p24 || !p22) {
      toast.error("Enter both 24K and 22K rates");
      return;
    }
    if (p22 > p24) {
      toast.error("22K rate cannot be higher than 24K");
      return;
    }
    const usedLive = !!liveRate && p24 === liveRate.price24k && p22 === liveRate.price22k;
    save.mutate({
      price24k: p24,
      price22k: p22,
      whiteGoldPrice: white || null,
      whiteGoldKarat: white ? (whiteKarat as (typeof WHITE_GOLD_KARATS)[number]) : null,
      marketReference24k: liveRate?.international24k ?? null,
      source: usedLive ? "live" : "manual",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] gap-0 p-0 overflow-hidden bg-card border-border">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
              <Coins className="h-4 w-4 text-primary" />
            </span>
            Today's Gold Rate
          </DialogTitle>
          <DialogDescription>
            Per tola in PKR. Saving updates the price of every product, catalog and new order.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          {/* Live market strip */}
          <div
            className={cn(
              "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
              liveRate ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-muted/40"
            )}
          >
            {live.isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mt-0.5 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">Fetching today's live market rate…</p>
              </>
            ) : liveRate ? (
              <>
                <Radio className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">
                    Live market rate · {formatPKR(liveRate.price24k)} <span className="text-muted-foreground font-normal">(24K)</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Gold ${liveRate.spotUsdPerOunce.toLocaleString()}/oz × PKR {liveRate.usdToPkr.toFixed(2)}
                    {liveRate.localPremium !== 0 &&
                      ` · local premium ${liveRate.localPremium > 0 ? "+" : ""}${liveRate.localPremium.toLocaleString("en-PK")}`}
                    {" · "}updated {timeAgo(liveRate.fetchedAt)}
                  </p>
                </div>
                {edited && (
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={applyLive}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Use live
                  </Button>
                )}
              </>
            ) : (
              <>
                <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <p className="text-muted-foreground">
                  {live.data && !live.data.ok ? live.data.message : "Live rate unavailable."} Showing the last saved rate.
                </p>
              </>
            )}
          </div>

          {/* Rates */}
          <div className="space-y-3">
            <RateRow
              id="price24k"
              label="24K Gold"
              hint={change ? `${change.amount >= 0 ? "▲" : "▼"} ${Math.abs(change.amount).toLocaleString("en-PK")} (${change.percent.toFixed(2)}%) vs last saved` : undefined}
              hintTone={change ? (change.amount >= 0 ? "up" : "down") : undefined}
              value={price24k}
              onChange={on24kChange}
            />
            <RateRow
              id="price22k"
              label="22K Gold"
              value={price22k}
              onChange={value => {
                setPrice22k(clean(value));
                setEdited(true);
              }}
            />
            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <div className="space-y-1">
                <Label className="text-sm text-foreground">White Gold</Label>
                <Select value={whiteKarat} onValueChange={onKaratChange}>
                  <SelectTrigger className="h-8 w-[110px] bg-background text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WHITE_GOLD_KARATS.map(karat => (
                      <SelectItem key={karat} value={karat}>
                        {karat.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <RateInput
                id="whiteGold"
                value={whitePrice}
                placeholder="Optional"
                onChange={value => {
                  setWhitePrice(clean(value));
                  setEdited(true);
                }}
              />
            </div>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <PencilLine className="h-3.5 w-3.5" />
            Change any rate before saving if your sarafa rate is different.
          </p>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border bg-muted/30 gap-2 sm:justify-between">
          <p className="hidden sm:block text-xs text-muted-foreground self-center">
            {latest?.priceDate ? `Last saved ${new Date(latest.priceDate).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}` : "No rate saved yet"}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Later
            </Button>
            <Button onClick={handleSave} disabled={save.isPending || live.isLoading} className="gold-gradient text-primary-foreground border-0 min-w-[120px]">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & update prices"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RateInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  // Raw digits while typing; thousands separators once the field loses focus.
  const [focused, setFocused] = useState(false);
  const n = Number(value);
  const display = focused || !value || !Number.isFinite(n) ? value : n.toLocaleString("en-PK", { maximumFractionDigits: 2 });
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">PKR</span>
      <Input
        id={id}
        inputMode="decimal"
        value={display}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 pl-12 pr-14 text-right text-base font-semibold tabular-nums bg-background"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">/ tola</span>
    </div>
  );
}

function RateRow({
  id,
  label,
  value,
  onChange,
  hint,
  hintTone,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  hintTone?: "up" | "down";
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-3">
      <div>
        <Label htmlFor={id} className="text-sm text-foreground">
          {label}
        </Label>
        {hint && (
          <p className={cn("text-[11px] mt-0.5", hintTone === "up" ? "text-emerald-500" : "text-rose-500")}>{hint}</p>
        )}
      </div>
      <RateInput id={id} value={value} onChange={onChange} />
    </div>
  );
}
