import { useMemo, useState } from "react";
import { BarChart3, ChevronLeft, DollarSign, Loader2, Lock, Receipt, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { SafeStaff } from "../../../shared/types";

type Props = {
  staffUser: SafeStaff;
  onBack: () => void;
};

type CogsBucket = "food" | "beer" | "liquor" | "store_runs";
type Trend = "up" | "down" | "flat";

type WeekRange = {
  label: string;
  start: Date;
  end: Date;
  startKey: string;
  endKey: string;
};

const MANAGER_ROLES = ["owner", "key_manager", "kitchen_manager", "bar_manager"];
const FOOD_INVOICE_CATEGORIES = new Set(["meat", "bread", "produce", "supplies", "misc"]);
const STORE_RUN_PAYOUT_CATEGORIES = new Set(["store_run", "supplies", "bread", "meat", "produce", "miscellaneous", "other"]);

function isManagerOrOwner(staffUser: SafeStaff | null): boolean {
  return !!staffUser && MANAGER_ROLES.includes(staffUser.jobRole);
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function weekRange(offsetWeeks: number): WeekRange {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay() + offsetWeeks * 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return {
    label: `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    start,
    end,
    startKey: formatDateKey(start),
    endKey: formatDateKey(end),
  };
}

function dollars(value: string | number | null | undefined): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

function isWithin(dateValue: Date | string, range: WeekRange): boolean {
  const date = new Date(dateValue);
  return date >= range.start && date <= range.end;
}

function bucketForInvoice(invoice: { category?: string | null; vendorName?: string | null; items?: unknown }): CogsBucket {
  const category = invoice.category ?? "misc";
  const vendor = (invoice.vendorName ?? "").toLowerCase();

  // A few imported liquor invoices were categorized as beer. Vendor-level clues are a safer fallback
  // than treating the full invoice total as beer COGS when the source is wine/spirits/liquor.
  if (category === "beer") {
    if (/liquor|spirit|wine/.test(vendor) && !/beer|brew|distribut/.test(vendor)) return "liquor";
    return "beer";
  }
  if (category === "liquor") return "liquor";
  if (FOOD_INVOICE_CATEGORIES.has(category)) return "food";
  return "food";
}

function netSalesForDay(row: any): number {
  const explicitNet = dollars(row.totalAmount);
  if (explicitNet > 0) return explicitNet;
  const grandTotal = dollars(row.grandTotal);
  const tax = dollars(row.tax);
  const voids = dollars(row.voidsAmount);
  const discounts = dollars(row.discountTotal);
  return Math.max(0, grandTotal - tax - voids - discounts);
}

function trend(current: number, previous: number): { trend: Trend; delta: number } {
  const delta = current - previous;
  if (Math.abs(delta) < 1) return { trend: "flat", delta };
  return { trend: delta > 0 ? "up" : "down", delta };
}

function AccessDenied({ onBack }: { onBack: () => void }) {
  return (
    <div className="h-screen bg-slate-50 flex flex-col items-center justify-center px-8">
      <Lock size={32} className="text-zinc-700 mb-4" />
      <p className="text-slate-600 text-sm font-bold">Manager Access Required</p>
      <p className="text-zinc-600 text-xs text-center mt-2">Weekly COGS and prime-cost reporting is manager-only.</p>
      <button onClick={onBack} className="mt-6 px-5 py-2.5 rounded-xl bg-white text-slate-600 text-xs font-semibold border border-slate-200">Back</button>
    </div>
  );
}

export default function WeeklyCOGSTrackerScreen({ staffUser, onBack }: Props) {
  const [offsetWeeks, setOffsetWeeks] = useState(0);
  const currentRange = useMemo(() => weekRange(offsetWeeks), [offsetWeeks]);
  const previousRange = useMemo(() => weekRange(offsetWeeks - 1), [offsetWeeks]);

  const invoicesQuery = trpc.invoices.byDateRange.useQuery({ startDate: previousRange.start, endDate: currentRange.end, limit: 500 }, { enabled: isManagerOrOwner(staffUser), staleTime: 30_000 });
  const payoutsQuery = trpc.payouts.byDateRange.useQuery({ startDate: previousRange.start, endDate: currentRange.end, limit: 500 }, { enabled: isManagerOrOwner(staffUser), staleTime: 30_000 });
  const salesQuery = trpc.sales.daily.useQuery({ startDate: previousRange.startKey, endDate: currentRange.endKey, limit: 30 }, { enabled: isManagerOrOwner(staffUser), staleTime: 30_000 });

  const summary = useMemo(() => {
    const emptyBuckets: Record<CogsBucket, number> = { food: 0, beer: 0, liquor: 0, store_runs: 0 };
    const previousBuckets: Record<CogsBucket, number> = { food: 0, beer: 0, liquor: 0, store_runs: 0 };

    for (const invoice of invoicesQuery.data ?? []) {
      const bucket = bucketForInvoice(invoice);
      if (isWithin(invoice.date, currentRange)) emptyBuckets[bucket] += dollars(invoice.totalAmount);
      if (isWithin(invoice.date, previousRange)) previousBuckets[bucket] += dollars(invoice.totalAmount);
    }

    for (const payout of payoutsQuery.data ?? []) {
      if (!STORE_RUN_PAYOUT_CATEGORIES.has(payout.category)) continue;
      if (isWithin(payout.date, currentRange)) emptyBuckets.store_runs += dollars(payout.amount);
      if (isWithin(payout.date, previousRange)) previousBuckets.store_runs += dollars(payout.amount);
    }

    const currentSalesRows = (salesQuery.data ?? []).filter(row => row.businessDate >= currentRange.startKey && row.businessDate <= currentRange.endKey);
    const previousSalesRows = (salesQuery.data ?? []).filter(row => row.businessDate >= previousRange.startKey && row.businessDate <= previousRange.endKey);

    const netSales = currentSalesRows.reduce((sum, row) => sum + netSalesForDay(row), 0);
    const previousNetSales = previousSalesRows.reduce((sum, row) => sum + netSalesForDay(row), 0);
    const labor = currentSalesRows.reduce((sum, row) => sum + dollars(row.laborTotal), 0);
    const previousLabor = previousSalesRows.reduce((sum, row) => sum + dollars(row.laborTotal), 0);
    const cogs = Object.values(emptyBuckets).reduce((sum, value) => sum + value, 0);
    const previousCogs = Object.values(previousBuckets).reduce((sum, value) => sum + value, 0);
    const primeCost = cogs + labor;
    const previousPrimeCost = previousCogs + previousLabor;

    return {
      buckets: emptyBuckets,
      previousBuckets,
      cogs,
      previousCogs,
      labor,
      previousLabor,
      netSales,
      previousNetSales,
      primeCost,
      previousPrimeCost,
      cogsPercent: netSales > 0 ? (cogs / netSales) * 100 : null,
      laborPercent: netSales > 0 ? (labor / netSales) * 100 : null,
      primePercent: netSales > 0 ? (primeCost / netSales) * 100 : null,
      salesDays: currentSalesRows.length,
    };
  }, [invoicesQuery.data, payoutsQuery.data, salesQuery.data, currentRange, previousRange]);

  const categoryCards: Array<{ key: CogsBucket; label: string; value: number; previous: number }> = [
    { key: "food", label: "Food", value: summary.buckets.food, previous: summary.previousBuckets.food },
    { key: "beer", label: "Beer", value: summary.buckets.beer, previous: summary.previousBuckets.beer },
    { key: "liquor", label: "Liquor", value: summary.buckets.liquor, previous: summary.previousBuckets.liquor },
    { key: "store_runs", label: "Store Runs", value: summary.buckets.store_runs, previous: summary.previousBuckets.store_runs },
  ];

  if (!isManagerOrOwner(staffUser)) return <AccessDenied onBack={onBack} />;

  const isLoading = invoicesQuery.isLoading || payoutsQuery.isLoading || salesQuery.isLoading;
  const primeTrend = trend(summary.primeCost, summary.previousPrimeCost);

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-y-auto pb-24">
      <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur border-b border-zinc-900 p-3 flex items-center gap-2">
        <button onClick={onBack} className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-slate-200">
          <ChevronLeft size={15} className="text-slate-500" />
        </button>
        <div className="flex-1">
          <h2 className="text-slate-900 font-black text-sm tracking-[0.08em]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>WEEKLY COGS</h2>
          <p className="text-slate-500 text-[10px]">Sunday open through Saturday close · prime cost tracker</p>
        </div>
      </div>

      <div className="p-3 space-y-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between">
          <button onClick={() => setOffsetWeeks(offsetWeeks - 1)} className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold">Prev</button>
          <div className="text-center">
            <p className="text-slate-900 text-xs font-bold">{currentRange.label}</p>
            <p className="text-slate-500 text-[9px]">{summary.salesDays} sales days loaded</p>
          </div>
          <button onClick={() => setOffsetWeeks(Math.min(0, offsetWeeks + 1))} className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold disabled:opacity-40" disabled={offsetWeeks === 0}>Next</button>
        </div>

        {isLoading && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-center gap-2">
            <Loader2 size={16} className="text-amber-400 animate-spin" />
            <span className="text-slate-500 text-xs">Loading week totals...</span>
          </div>
        )}

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-amber-300 text-[10px] uppercase tracking-wide font-bold">Prime Cost</p>
              <p className="text-slate-900 text-2xl font-black mt-1">{formatMoney(summary.primeCost)}</p>
              <p className="text-slate-500 text-[10px] mt-1">COGS + labor ÷ actual net sales</p>
            </div>
            <div className="text-right">
              <p className="text-amber-300 text-xl font-black">{formatPercent(summary.primePercent)}</p>
              <p className={`text-[9px] mt-1 flex items-center justify-end gap-1 ${primeTrend.trend === "up" ? "text-red-400" : primeTrend.trend === "down" ? "text-green-400" : "text-slate-500"}`}>
                {primeTrend.trend === "up" ? <TrendingUp size={10} /> : primeTrend.trend === "down" ? <TrendingDown size={10} /> : null}
                {primeTrend.delta === 0 ? "flat" : `${primeTrend.delta > 0 ? "+" : ""}${formatMoney(primeTrend.delta)} vs last week`}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-xl border border-slate-200 p-3">
            <p className="text-slate-500 text-[9px] uppercase tracking-wide flex items-center gap-1"><Receipt size={10} /> COGS</p>
            <p className="text-slate-900 text-lg font-bold mt-1">{formatMoney(summary.cogs)}</p>
            <p className="text-slate-500 text-[9px]">{formatPercent(summary.cogsPercent)} of net sales</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3">
            <p className="text-slate-500 text-[9px] uppercase tracking-wide flex items-center gap-1"><WalletCards size={10} /> Labor</p>
            <p className="text-slate-900 text-lg font-bold mt-1">{formatMoney(summary.labor)}</p>
            <p className="text-slate-500 text-[9px]">{formatPercent(summary.laborPercent)} of net sales</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <p className="text-slate-900 text-xs font-bold flex items-center gap-2"><DollarSign size={13} className="text-amber-400" /> Actual Net Sales</p>
          <p className="text-amber-400 text-xl font-black mt-1">{formatMoney(summary.netSales)}</p>
            <p className="text-slate-500 text-[10px] mt-1">Calculated from PDQ net sales for this Sunday–Saturday week only. Falls back to grand total less tax, voids, and discounts if explicit net sales is missing.</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {categoryCards.map(card => {
            const cardTrend = trend(card.value, card.previous);
            return (
              <div key={card.key} className="bg-white rounded-xl border border-slate-200 p-3">
                <p className="text-slate-500 text-[9px] uppercase tracking-wide">{card.label}</p>
                <p className="text-slate-900 text-lg font-bold mt-1">{formatMoney(card.value)}</p>
                <p className={`text-[9px] mt-1 ${cardTrend.trend === "up" ? "text-red-400" : cardTrend.trend === "down" ? "text-green-400" : "text-slate-500"}`}>{cardTrend.delta > 0 ? "+" : ""}{formatMoney(cardTrend.delta)} vs last week</p>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <p className="text-slate-900 text-xs font-bold flex items-center gap-2"><BarChart3 size={13} className="text-amber-400" /> Formula</p>
          <p className="text-slate-500 text-[10px] leading-relaxed mt-2">
            COGS combines only invoices dated inside the selected Sunday–Saturday week plus same-week store-run payouts. Prime cost is COGS plus imported labor dollars divided by that same week's actual net sales.
          </p>
        </div>
      </div>
    </div>
  );
}
