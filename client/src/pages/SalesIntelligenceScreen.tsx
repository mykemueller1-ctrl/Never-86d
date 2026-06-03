/**
 * Intelligence Dashboard — The brain of Community Tap & Pizza.
 * Product mix trends, void/comp analysis, weather correlation,
 * hourly heatmap, anomaly detection, schedule intelligence.
 * Manager-only: raw numbers. Staff: gamified vibe ratings.
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import type { SafeStaff } from "../../../shared/types";
import {
  ChevronLeft, TrendingUp, TrendingDown, BarChart3,
  Clock, DollarSign, Users, Truck, Coffee, Utensils,
  Calendar, AlertTriangle, CloudRain, Sun, Snowflake,
  Wind, Eye, ShieldAlert, Zap, Beer, Pizza, GlassWater,
  MapPin, Sparkles, ChevronDown, ChevronUp, Check,
} from "lucide-react";

interface Props {
  staffUser: SafeStaff;
  onBack: () => void;
}

const MANAGER_ROLES = ["owner", "key_manager", "kitchen_manager", "bar_manager"];

type Tab = "daily" | "product" | "voids" | "weather" | "heatmap" | "anomalies" | "schedule";

function formatMoney(val: string | number | null | undefined): string {
  if (!val) return "$0";
  const n = typeof val === "string" ? parseFloat(val) : val;
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function pctChange(current: number, previous: number): { pct: string; up: boolean } {
  if (!previous) return { pct: "—", up: true };
  const change = ((current - previous) / previous) * 100;
  return { pct: `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`, up: change >= 0 };
}

const DOW_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SalesIntelligenceScreen({ staffUser, onBack }: Props) {
  const isManager = MANAGER_ROLES.includes(staffUser.jobRole);
  const [tab, setTab] = useState<Tab>("daily");
  const [daysBack, setDaysBack] = useState(30);
  const [mixCategory, setMixCategory] = useState("all");
  const [expandedAnomaly, setExpandedAnomaly] = useState<number | null>(null);

  // Data queries
  const dailySalesQuery = trpc.sales.daily.useQuery({ limit: daysBack });
  const coverageSalesQuery = trpc.sales.daily.useQuery({ limit: 1000 }, { staleTime: 60_000 });
  const dailySales = dailySalesQuery.data || [];
  const availableSalesDays = coverageSalesQuery.data?.length ?? dailySales.length;
  const { data: productMix = [] } = trpc.intelligence.productMix.useQuery({ category: mixCategory });
  const { data: voidSummary = [] } = trpc.intelligence.voidSummary.useQuery();
  const { data: weatherCorrelation } = trpc.intelligence.weatherCorrelation.useQuery();
  const { data: heatmapData = [] } = trpc.intelligence.hourlyHeatmap.useQuery();
  const { data: anomalies = [] } = trpc.intelligence.anomalies.useQuery({});
  const { data: events = [] } = trpc.intelligence.upcomingEvents.useQuery();

  const ackMutation = trpc.intelligence.acknowledgeAnomaly.useMutation();
  const genScheduleMutation = trpc.intelligence.generateScheduleIntel.useMutation();

  const canonicalVoidTotals = useMemo(() => {
    const rowTotalVoids = voidSummary.reduce((sum: number, e: any) => sum + (Number(e.totalVoids) || 0), 0);
    const rowTotalAmount = voidSummary.reduce((sum: number, e: any) => sum + (Number(e.totalAmount) || 0), 0);

    if (rowTotalVoids > 0 || rowTotalAmount > 0) {
      return { totalVoids: rowTotalVoids, totalVoidAmount: rowTotalAmount };
    }

    return {
      totalVoids: dailySales.reduce((sum: number, d: any) => sum + (Number(d.voidsCount) || 0), 0),
      totalVoidAmount: dailySales.reduce((sum: number, d: any) => sum + (parseFloat(d.voidsAmount || "0") || 0), 0),
    };
  }, [dailySales, voidSummary]);

  // Computed daily stats
  const stats = useMemo(() => {
    if (dailySales.length === 0) return null;
    const totals = dailySales.map(d => parseFloat(d.grandTotal || "0"));
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
    const max = Math.max(...totals);
    const min = Math.min(...totals);
    const total = totals.reduce((a, b) => a + b, 0);
    const pickup = dailySales.reduce((s, d) => s + parseFloat(d.pickupAmount || "0"), 0);
    const delivery = dailySales.reduce((s, d) => s + parseFloat(d.deliveryAmount || "0"), 0);
    const bar = dailySales.reduce((s, d) => s + parseFloat(d.barAmount || "0"), 0);
    const table = dailySales.reduce((s, d) => s + parseFloat(d.tableAmount || "0"), 0);
    const food = dailySales.reduce((s, d) => s + parseFloat(d.catFoodAmount || "0"), 0);
    const beer = dailySales.reduce((s, d) => s + parseFloat(d.catBeerAmount || "0"), 0);
    const liquor = dailySales.reduce((s, d) => s + parseFloat(d.catLiquorAmount || "0"), 0);
    const avgLabor = dailySales.reduce((s, d) => s + parseFloat(d.laborPct || "0"), 0) / dailySales.length;
    return { avg, max, min, total, pickup, delivery, bar, table, food, beer, liquor, avgLabor, ...canonicalVoidTotals };
  }, [dailySales, canonicalVoidTotals]);

  const recentDays = useMemo(() => {
    return dailySales.slice(0, 14).map((d, i) => {
      const prev = dailySales[i + 1];
      const current = parseFloat(d.grandTotal || "0");
      const previous = prev ? parseFloat(prev.grandTotal || "0") : 0;
      return { ...d, current, previous, change: pctChange(current, previous) };
    });
  }, [dailySales]);

  function salesVibe(amount: number): { label: string; color: string } {
    if (amount >= 8000) return { label: "Legendary", color: "text-amber-400" };
    if (amount >= 5000) return { label: "Great", color: "text-green-400" };
    if (amount >= 3500) return { label: "Solid", color: "text-blue-400" };
    if (amount >= 2000) return { label: "Steady", color: "text-slate-500" };
    return { label: "Quiet", color: "text-slate-500" };
  }

  // ─── Tab definitions ───
  const managerTabs: { key: Tab; label: string; icon: any }[] = [
    { key: "daily", label: "Daily", icon: Calendar },
    { key: "product", label: "Mix", icon: Pizza },
    { key: "voids", label: "Voids", icon: ShieldAlert },
    { key: "weather", label: "Weather", icon: CloudRain },
    { key: "heatmap", label: "Hours", icon: Clock },
    { key: "anomalies", label: "Alerts", icon: AlertTriangle },
    { key: "schedule", label: "Sched", icon: Sparkles },
  ];

  const staffTabs: { key: Tab; label: string; icon: any }[] = [
    { key: "daily", label: "Daily", icon: Calendar },
    { key: "product", label: "Mix", icon: Pizza },
    { key: "heatmap", label: "Hours", icon: Clock },
  ];

  const TABS = isManager ? managerTabs : staffTabs;

  // ─── Daily Tab ───
  const PeriodButtons = () => (
    <div className="flex gap-1">
      {[7, 14, 30, 90].map(d => (
        <button key={d} onClick={() => setDaysBack(d)}
          className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
            daysBack === d ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" : "bg-white text-slate-500 border border-slate-200"
          }`}>{d}d</button>
      ))}
    </div>
  );

  const DailyTab = () => {
    if (dailySalesQuery.isLoading) {
      return (
        <div className="space-y-3">
          <PeriodButtons />
          <div className="bg-white rounded-xl p-6 border border-slate-200 text-center">
            <Clock size={22} className="text-amber-500 mx-auto mb-2 animate-pulse" />
            <p className="text-slate-500 text-[11px]">Loading canonical daily sales history...</p>
          </div>
        </div>
      );
    }

    if (dailySalesQuery.isError || dailySales.length === 0) {
      return (
        <div className="space-y-3">
          <PeriodButtons />
          <div className="bg-white rounded-xl p-6 border border-slate-200 text-center">
            <Calendar size={24} className="text-zinc-700 mx-auto mb-2" />
            <p className="text-slate-900 text-xs font-semibold">No daily sales records found</p>
            <p className="text-slate-500 text-[10px] mt-1">
              Uploaded PDQ/Z-report history will appear here after it is imported. Supporting intelligence tabs may still show historical data from their own canonical tables.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {stats && (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-xl p-3 border border-slate-200">
              <p className="text-slate-500 text-[10px] uppercase">Avg / Day</p>
              <p className="text-slate-900 font-bold text-lg">{isManager ? formatMoney(stats.avg) : salesVibe(stats.avg).label}</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-slate-200">
              <p className="text-slate-500 text-[10px] uppercase">Period Total</p>
              <p className="text-slate-900 font-bold text-lg">{isManager ? formatMoney(stats.total) : `${dailySales.length} days`}</p>
            </div>
            {isManager && (
              <>
                <div className="bg-white rounded-xl p-3 border border-slate-200">
                  <p className="text-slate-500 text-[10px] uppercase">Best Day</p>
                  <p className="text-green-400 font-bold text-lg">{formatMoney(stats.max)}</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-slate-200">
                  <p className="text-slate-500 text-[10px] uppercase">Slowest Day</p>
                  <p className="text-red-400 font-bold text-lg">{formatMoney(stats.min)}</p>
                </div>
              </>
            )}
          </div>
        )}
        <PeriodButtons />
        <div className="bg-white rounded-xl p-3 border border-slate-200">
          <p className="text-slate-500 text-[10px] uppercase mb-2 font-semibold">Daily Revenue</p>
          <div className="space-y-1">
            {recentDays.map(d => {
              const maxVal = stats?.max || 1;
              const pct = Math.max(0, Math.min(100, (d.current / maxVal) * 100));
              const dayName = new Date(d.businessDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
              return (
                <div key={d.businessDate} className="flex items-center gap-2">
                  <span className="text-slate-500 text-[9px] w-16 shrink-0">{dayName}</span>
                  <div className="flex-1 h-4 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${d.current >= (stats?.avg || 0) ? "bg-green-500/60" : "bg-amber-500/40"}`} style={{ width: `${pct}%` }} />
                  </div>
                  {isManager ? (
                    <div className="flex items-center gap-1 w-20 justify-end">
                      <span className="text-slate-900 text-[10px] font-medium">{formatMoney(d.current)}</span>
                      <span className={`text-[8px] ${d.change.up ? "text-green-400" : "text-red-400"}`}>{d.change.pct}</span>
                    </div>
                  ) : (
                    <span className={`text-[10px] w-20 text-right ${salesVibe(d.current).color}`}>{salesVibe(d.current).label}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Channel & Category breakdown */}
        {stats && isManager && (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-xl p-3 border border-slate-200">
              <p className="text-slate-500 text-[10px] uppercase mb-2 font-semibold">Channels</p>
              {[
                { label: "Pickup", val: stats.pickup, color: "bg-blue-500" },
                { label: "Delivery", val: stats.delivery, color: "bg-green-500" },
                { label: "Bar", val: stats.bar, color: "bg-purple-500" },
                { label: "Table", val: stats.table, color: "bg-amber-500" },
              ].map(ch => {
                const maxChannel = Math.max(stats.pickup, stats.delivery, stats.bar, stats.table, 1);
                const share = stats.total > 0 ? ((ch.val / stats.total) * 100).toFixed(0) : "0";
                return (
                  <div key={ch.label} className="mb-1.5">
                    <div className="flex justify-between text-[9px]">
                      <span className="text-slate-500">{ch.label}</span>
                      <span className="text-slate-500">{share}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full ${ch.color} rounded-full`} style={{ width: `${(ch.val / maxChannel) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="bg-white rounded-xl p-3 border border-slate-200">
              <p className="text-slate-500 text-[10px] uppercase mb-2 font-semibold">Categories</p>
              {[
                { label: "Food", val: stats.food, color: "bg-amber-500" },
                { label: "Beer", val: stats.beer, color: "bg-yellow-500" },
                { label: "Liquor", val: stats.liquor, color: "bg-purple-500" },
              ].map(cat => {
                const maxCategory = Math.max(stats.food, stats.beer, stats.liquor, 1);
                return (
                  <div key={cat.label} className="mb-1.5">
                    <div className="flex justify-between text-[9px]">
                      <span className="text-slate-500">{cat.label}</span>
                      <span className="text-slate-500">{formatMoney(cat.val)}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full ${cat.color} rounded-full`} style={{ width: `${(cat.val / maxCategory) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Product Mix Tab ───
  const ProductMixTab = () => {
    const categories = ["all", "pizza", "food", "beer", "liquor", "pop"];
    const catIcons: Record<string, any> = { all: BarChart3, pizza: Pizza, food: Utensils, beer: Beer, liquor: GlassWater, pop: Coffee };
    const maxAmount = productMix.length > 0 ? Math.max(...productMix.map((p: any) => p.totalAmount || 0)) : 1;

    return (
      <div className="space-y-3">
        <div className="flex gap-1 flex-wrap">
          {categories.map(c => {
            const Icon = catIcons[c] || BarChart3;
            return (
              <button key={c} onClick={() => setMixCategory(c)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                  mixCategory === c ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" : "bg-white text-slate-500 border border-slate-200"
                }`}>
                <Icon size={10} />
                {c === "all" ? "All" : c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200">
          <p className="text-slate-500 text-[10px] uppercase mb-2 font-semibold">
            Top Products {mixCategory !== "all" ? `· ${mixCategory}` : ""} ({productMix.length})
          </p>
          <div className="space-y-1.5">
            {productMix.slice(0, 25).map((p: any, i: number) => (
              <div key={p.name + i} className="flex items-center gap-2">
                <span className="text-zinc-600 text-[9px] w-4 text-right">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-900 text-[10px] font-medium truncate max-w-[140px]">{p.name}</span>
                    <div className="flex items-center gap-2">
                      {isManager && <span className="text-slate-500 text-[9px]">{formatMoney(p.totalAmount)}</span>}
                      <span className="text-zinc-600 text-[9px]">{p.totalQty} sold</span>
                    </div>
                  </div>
                  <div className="h-1 bg-zinc-800 rounded-full overflow-hidden mt-0.5">
                    <div className="h-full bg-amber-500/50 rounded-full" style={{ width: `${(p.totalAmount / maxAmount) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ─── Voids Tab (Manager Only) ───
  const VoidsTab = () => {
    if (!isManager) return null;
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-xl p-3 border border-slate-200">
            <p className="text-slate-500 text-[10px] uppercase">Total Voids</p>
            <p className="text-red-400 font-bold text-lg">{canonicalVoidTotals.totalVoids}</p>
            <p className="text-zinc-600 text-[9px]">{formatMoney(canonicalVoidTotals.totalVoidAmount)} total</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-slate-200">
            <p className="text-slate-500 text-[10px] uppercase">Employees</p>
            <p className="text-slate-900 font-bold text-lg">{voidSummary.length}</p>
            <p className="text-zinc-600 text-[9px]">with void activity</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200">
          <p className="text-slate-500 text-[10px] uppercase mb-2 font-semibold">Void/Comp by Employee</p>
          <div className="space-y-2">
            {voidSummary.slice(0, 15).map((e: any, i: number) => {
              const isHigh = e.avgPerDay > 4;
              return (
                <div key={e.name} className={`p-2 rounded-lg ${isHigh ? "bg-red-500/5 border border-red-500/10" : "bg-zinc-800/50"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-600 text-[9px] w-4">{i + 1}</span>
                      <span className={`text-[11px] font-medium ${isHigh ? "text-red-400" : "text-slate-900"}`}>{e.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 text-[10px]">{e.totalVoids} voids</span>
                      <span className="text-slate-500 text-[10px]">{formatMoney(e.totalAmount)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-zinc-600 text-[9px]">{e.daysWorked} days</span>
                    <span className={`text-[9px] font-medium ${isHigh ? "text-red-400" : "text-slate-500"}`}>
                      {e.avgPerDay}/day avg
                    </span>
                    {isHigh && <span className="text-red-400 text-[8px] bg-red-500/10 px-1.5 py-0.5 rounded">HIGH</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ─── Weather Tab (Manager Only) ───
  const WeatherTab = () => {
    if (!isManager || !weatherCorrelation) return null;
    const wc = weatherCorrelation;
    return (
      <div className="space-y-3">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-slate-500 text-[10px] uppercase mb-3 font-semibold">Weather Impact on Revenue</p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-2 bg-zinc-800/50 rounded-lg">
              <Sun size={18} className="text-amber-400 shrink-0" />
              <div className="flex-1">
                <p className="text-slate-900 text-xs font-medium">Dry Days</p>
                <p className="text-slate-500 text-[9px]">{wc.dryDays.count} days</p>
              </div>
              <p className="text-slate-900 font-bold text-sm">{formatMoney(wc.dryDays.avg)}</p>
            </div>
            <div className="flex items-center gap-3 p-2 bg-blue-500/5 rounded-lg border border-blue-500/10">
              <CloudRain size={18} className="text-blue-400 shrink-0" />
              <div className="flex-1">
                <p className="text-slate-900 text-xs font-medium">Rainy Days</p>
                <p className="text-slate-500 text-[9px]">{wc.rainyDays.count} days</p>
              </div>
              <div className="text-right">
                <p className="text-slate-900 font-bold text-sm">{formatMoney(wc.rainyDays.avg)}</p>
                {wc.dryDays.avg > 0 && (
                  <p className={`text-[9px] ${wc.rainyDays.avg < wc.dryDays.avg ? "text-red-400" : "text-green-400"}`}>
                    {((wc.rainyDays.avg - wc.dryDays.avg) / wc.dryDays.avg * 100).toFixed(1)}% vs dry
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 bg-cyan-500/5 rounded-lg border border-cyan-500/10">
              <Snowflake size={18} className="text-cyan-400 shrink-0" />
              <div className="flex-1">
                <p className="text-slate-900 text-xs font-medium">Snow Days</p>
                <p className="text-slate-500 text-[9px]">{wc.snowDays.count} days</p>
              </div>
              <div className="text-right">
                <p className="text-slate-900 font-bold text-sm">{formatMoney(wc.snowDays.avg)}</p>
                {wc.dryDays.avg > 0 && (
                  <p className={`text-[9px] ${wc.snowDays.avg < wc.dryDays.avg ? "text-red-400" : "text-green-400"}`}>
                    {((wc.snowDays.avg - wc.dryDays.avg) / wc.dryDays.avg * 100).toFixed(1)}% vs dry
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-slate-500 text-[10px] uppercase mb-3 font-semibold">Delivery vs Weather</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
              <Sun size={16} className="text-amber-400 mx-auto mb-1" />
              <p className="text-slate-900 font-bold text-sm">{wc.deliveryImpact.goodWeather}%</p>
              <p className="text-slate-500 text-[9px]">Delivery share (dry)</p>
            </div>
            <div className="bg-blue-500/5 rounded-lg p-3 text-center border border-blue-500/10">
              <CloudRain size={16} className="text-blue-400 mx-auto mb-1" />
              <p className="text-slate-900 font-bold text-sm">{wc.deliveryImpact.badWeather}%</p>
              <p className="text-slate-500 text-[9px]">Delivery share (rain/snow)</p>
            </div>
          </div>
          <p className="text-slate-500 text-[9px] mt-2 text-center">
            Delivery share increases {(wc.deliveryImpact.badWeather - wc.deliveryImpact.goodWeather).toFixed(1)}% in bad weather — staff drivers accordingly
          </p>
        </div>

        {/* Upcoming Events */}
        {events.length > 0 && (
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-slate-500 text-[10px] uppercase mb-2 font-semibold">
              <MapPin size={10} className="inline mr-1" />Upcoming Events (30mi)
            </p>
            {events.slice(0, 5).map((e: any, i: number) => (
              <div key={i} className="flex items-center gap-2 py-1.5 border-b border-slate-200/50 last:border-0">
                <span className="text-amber-400 text-[10px] font-medium w-16">{e.eventDate}</span>
                <span className="text-slate-900 text-[10px] flex-1 truncate">{e.eventName}</span>
                {e.estimatedImpact && (
                  <span className={`text-[8px] px-1.5 py-0.5 rounded ${
                    e.estimatedImpact === "high" ? "bg-green-500/10 text-green-400" :
                    e.estimatedImpact === "medium" ? "bg-amber-500/10 text-amber-400" :
                    "bg-zinc-800 text-slate-500"
                  }`}>{e.estimatedImpact}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─── Hourly Heatmap Tab ───
  const HeatmapTab = () => {
    const hours = Array.from({ length: 16 }, (_, i) => i + 8); // 8am to 11pm
    const maxRevenue = heatmapData.length > 0 ? Math.max(...heatmapData.map((h: any) => h.avgRevenue || 0)) : 1;

    function getColor(val: number): string {
      const pct = val / maxRevenue;
      if (pct >= 0.8) return "bg-red-500";
      if (pct >= 0.6) return "bg-orange-500";
      if (pct >= 0.4) return "bg-amber-500";
      if (pct >= 0.2) return "bg-amber-500/40";
      if (pct > 0) return "bg-zinc-700";
      return "bg-white";
    }

    function getVal(dow: number, hour: number): number {
      const cell = heatmapData.find((h: any) => h.dow === dow && h.hour === hour);
      return cell?.avgRevenue || 0;
    }

    return (
      <div className="space-y-3">
        <div className="bg-white rounded-xl p-3 border border-slate-200">
          <p className="text-slate-500 text-[10px] uppercase mb-2 font-semibold">Avg Revenue by Hour & Day</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[8px]">
              <thead>
                <tr>
                  <th className="text-zinc-600 text-left p-0.5 w-8"></th>
                  {DOW_NAMES.map(d => <th key={d} className="text-slate-500 text-center p-0.5 font-medium">{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {hours.map(h => (
                  <tr key={h}>
                    <td className="text-zinc-600 p-0.5 text-right pr-1">{h > 12 ? `${h - 12}p` : h === 12 ? "12p" : `${h}a`}</td>
                    {[0, 1, 2, 3, 4, 5, 6].map(dow => {
                      const val = getVal(dow, h);
                      return (
                        <td key={dow} className="p-0.5">
                          <div className={`w-full h-5 rounded-sm ${getColor(val)} flex items-center justify-center`}
                               title={`${DOW_NAMES[dow]} ${h}:00 - ${formatMoney(val)}`}>
                            {isManager && val > 0 && <span className="text-slate-700 text-[7px]">{Math.round(val)}</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-1 mt-2 justify-center">
            <span className="text-zinc-600 text-[8px]">Low</span>
            <div className="w-3 h-2 bg-zinc-700 rounded-sm" />
            <div className="w-3 h-2 bg-amber-500/40 rounded-sm" />
            <div className="w-3 h-2 bg-amber-500 rounded-sm" />
            <div className="w-3 h-2 bg-orange-500 rounded-sm" />
            <div className="w-3 h-2 bg-red-500 rounded-sm" />
            <span className="text-zinc-600 text-[8px]">High</span>
          </div>
        </div>

        <div className="bg-amber-500/5 rounded-xl p-3 border border-amber-500/10">
          <p className="text-amber-500 text-[10px] font-semibold flex items-center gap-1"><Zap size={10} /> Peak Hours</p>
          <p className="text-slate-500 text-[10px] mt-1">
            Fri & Sat 5-7pm are your highest revenue hours. Monday is dead after 8pm — consider reduced staffing.
            Sunday lunch (11am-1pm) is surprisingly strong.
          </p>
        </div>
      </div>
    );
  };

  // ─── Anomalies Tab (Manager Only) ───
  const AnomaliesTab = () => {
    if (!isManager) return null;
    const highCount = anomalies.filter((a: any) => a.severity === "high").length;
    const medCount = anomalies.filter((a: any) => a.severity === "medium").length;

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-red-500/5 rounded-xl p-2 border border-red-500/10 text-center">
            <p className="text-red-400 font-bold text-lg">{highCount}</p>
            <p className="text-slate-500 text-[9px]">High</p>
          </div>
          <div className="bg-amber-500/5 rounded-xl p-2 border border-amber-500/10 text-center">
            <p className="text-amber-400 font-bold text-lg">{medCount}</p>
            <p className="text-slate-500 text-[9px]">Medium</p>
          </div>
          <div className="bg-white rounded-xl p-2 border border-slate-200 text-center">
            <p className="text-slate-500 font-bold text-lg">{anomalies.length - highCount - medCount}</p>
            <p className="text-slate-500 text-[9px]">Low</p>
          </div>
        </div>

        <div className="space-y-2">
          {anomalies.map((a: any) => {
            const isExpanded = expandedAnomaly === a.id;
            const severityColor = a.severity === "high" ? "border-red-500/20 bg-red-500/5" : a.severity === "medium" ? "border-amber-500/20 bg-amber-500/5" : "border-slate-200 bg-white";
            const severityText = a.severity === "high" ? "text-red-400" : a.severity === "medium" ? "text-amber-400" : "text-slate-500";
            return (
              <div key={a.id} className={`rounded-xl p-3 border ${severityColor}`}>
                <button onClick={() => setExpandedAnomaly(isExpanded ? null : a.id)} className="w-full text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={12} className={severityText} />
                      <span className="text-slate-900 text-[11px] font-medium">{a.employeeName || "System"}</span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded ${severityText} bg-slate-50/20`}>{a.severity}</span>
                    </div>
                    {isExpanded ? <ChevronUp size={12} className="text-slate-500" /> : <ChevronDown size={12} className="text-slate-500" />}
                  </div>
                  <p className="text-slate-500 text-[10px] mt-1">{a.anomalyType?.replace(/_/g, " ")}</p>
                </button>
                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-slate-200/50">
                    <p className="text-slate-600 text-[10px]">{a.detail}</p>
                    {a.theory && <p className="text-slate-500 text-[10px] mt-1 italic">Theory: {a.theory}</p>}
                    {!a.acknowledged && (
                      <button
                        onClick={() => ackMutation.mutate({ id: a.id, acknowledgedBy: `${staffUser.firstName} ${staffUser.lastName}` })}
                        className="mt-2 flex items-center gap-1 text-[10px] text-green-400 bg-green-500/10 px-2 py-1 rounded-lg"
                      >
                        <Check size={10} /> Acknowledge
                      </button>
                    )}
                    {a.acknowledged && <p className="text-green-400/50 text-[9px] mt-1">Acknowledged by {a.acknowledgedBy}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── Schedule Intelligence Tab (Manager Only) ───
  const ScheduleTab = () => {
    if (!isManager) return null;
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const weekStart = monday.toISOString().split("T")[0];
    const weekEnd = sunday.toISOString().split("T")[0];

    const { data: scheduleIntel } = trpc.intelligence.scheduleIntel.useQuery({ weekStart });

    return (
      <div className="space-y-3">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-slate-500 text-[10px] uppercase font-semibold">
                <Sparkles size={10} className="inline mr-1 text-amber-400" />AI Schedule Intelligence
              </p>
              <p className="text-zinc-600 text-[9px]">Week of {weekStart}</p>
            </div>
            <button
              onClick={() => genScheduleMutation.mutate({ weekStart, weekEnd })}
              disabled={genScheduleMutation.isPending}
              className="text-[10px] bg-amber-500/20 text-amber-500 px-3 py-1.5 rounded-lg border border-amber-500/30 disabled:opacity-50"
            >
              {genScheduleMutation.isPending ? "Generating..." : "Generate"}
            </button>
          </div>

          {(scheduleIntel?.recommendations as any)?.days ? (
            <div className="space-y-2">
              {((scheduleIntel?.recommendations as any)?.days || []).map((day: any) => {
                const levelColor = day.staffingLevel === "heavy" ? "bg-red-500/10 border-red-500/20 text-red-400" :
                  day.staffingLevel === "normal" ? "bg-green-500/10 border-green-500/20 text-green-400" :
                  "bg-zinc-800 border-zinc-700 text-slate-500";
                return (
                  <div key={day.date} className={`p-2.5 rounded-lg border ${levelColor}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-900 text-[11px] font-medium">{day.dayOfWeek}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px]">{formatMoney(day.expectedRevenue?.low)}-{formatMoney(day.expectedRevenue?.high)}</span>
                        <span className="text-[8px] uppercase font-bold">{day.staffingLevel}</span>
                      </div>
                    </div>
                    <p className="text-slate-500 text-[9px] mt-1">{day.reasoning}</p>
                    {day.alerts?.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {day.alerts.map((alert: string, i: number) => (
                          <span key={i} className="text-[8px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded">{alert}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <Sparkles size={24} className="text-zinc-700 mx-auto mb-2" />
              <p className="text-slate-500 text-[10px]">Click "Generate" to create AI-powered staffing recommendations</p>
              <p className="text-zinc-600 text-[9px] mt-1">Uses historical sales, weather, events, and void patterns</p>
            </div>
          )}
        </div>

        {genScheduleMutation.data?.days && (
          <div className="bg-green-500/5 rounded-xl p-3 border border-green-500/10">
            <p className="text-green-400 text-[10px] font-semibold">New recommendations generated</p>
            <p className="text-slate-500 text-[9px]">Refresh to see updated schedule intelligence</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col overflow-hidden overscroll-contain">
      {/* Header */}
      <div className="p-4 pb-2 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-900 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <h2 className="text-slate-900 font-bold text-base" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.03em" }}>
            Intelligence
          </h2>
          <p className="text-slate-500 text-[10px]">PDQ POS · {availableSalesDays} {availableSalesDays === 1 ? "day" : "days"} · {anomalies.length} alerts</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-2 flex gap-1 overflow-x-auto shrink-0">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-medium transition-all whitespace-nowrap ${
              tab === t.key ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" : "bg-white text-slate-500 border border-slate-200"
            }`}>
            <t.icon size={10} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-32">
        {tab === "daily" && <DailyTab />}
        {tab === "product" && <ProductMixTab />}
        {tab === "voids" && <VoidsTab />}
        {tab === "weather" && <WeatherTab />}
        {tab === "heatmap" && <HeatmapTab />}
        {tab === "anomalies" && <AnomaliesTab />}
        {tab === "schedule" && <ScheduleTab />}
      </div>
    </div>
  );
}
