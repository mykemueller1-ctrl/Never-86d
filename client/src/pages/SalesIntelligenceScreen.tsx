/**
 * Sales Intelligence Screen — PDQ POS data visualization.
 * Daily revenue trends, hourly heatmap, channel breakdown, labor analysis.
 * Manager-only: raw numbers. Staff: gamified vibe ratings.
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import type { SafeStaff } from "../../../shared/types";
import {
  ChevronLeft, TrendingUp, TrendingDown, BarChart3,
  Clock, DollarSign, Users, Truck, Coffee, Utensils,
  Calendar, ChevronRight, ChevronDown,
} from "lucide-react";

interface Props {
  staffUser: SafeStaff;
  onBack: () => void;
}

const MANAGER_ROLES = ["owner", "key_manager", "kitchen_manager", "bar_manager"];

type Tab = "daily" | "hourly" | "channels" | "labor";

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

export default function SalesIntelligenceScreen({ staffUser, onBack }: Props) {
  const isManager = MANAGER_ROLES.includes(staffUser.jobRole);
  const [tab, setTab] = useState<Tab>("daily");
  const [daysBack, setDaysBack] = useState(30);

  const { data: dailySales = [] } = trpc.sales.daily.useQuery({ limit: daysBack });

  // Computed stats
  const stats = useMemo(() => {
    if (dailySales.length === 0) return null;
    const totals = dailySales.map(d => parseFloat(d.grandTotal || "0"));
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
    const max = Math.max(...totals);
    const min = Math.min(...totals);
    const total = totals.reduce((a, b) => a + b, 0);

    // Channel breakdown
    const pickup = dailySales.reduce((s, d) => s + parseFloat(d.pickupAmount || "0"), 0);
    const delivery = dailySales.reduce((s, d) => s + parseFloat(d.deliveryAmount || "0"), 0);
    const bar = dailySales.reduce((s, d) => s + parseFloat(d.barAmount || "0"), 0);
    const table = dailySales.reduce((s, d) => s + parseFloat(d.tableAmount || "0"), 0);

    // Category breakdown
    const food = dailySales.reduce((s, d) => s + parseFloat(d.catFoodAmount || "0"), 0);
    const beer = dailySales.reduce((s, d) => s + parseFloat(d.catBeerAmount || "0"), 0);
    const liquor = dailySales.reduce((s, d) => s + parseFloat(d.catLiquorAmount || "0"), 0);

    // Labor
    const avgLabor = dailySales.reduce((s, d) => s + parseFloat(d.laborPct || "0"), 0) / dailySales.length;

    // Voids
    const totalVoids = dailySales.reduce((s, d) => s + (d.voidsCount || 0), 0);
    const totalVoidAmount = dailySales.reduce((s, d) => s + parseFloat(d.voidsAmount || "0"), 0);

    return { avg, max, min, total, pickup, delivery, bar, table, food, beer, liquor, avgLabor, totalVoids, totalVoidAmount };
  }, [dailySales]);

  // Day-over-day for recent days
  const recentDays = useMemo(() => {
    return dailySales.slice(0, 14).map((d, i) => {
      const prev = dailySales[i + 1];
      const current = parseFloat(d.grandTotal || "0");
      const previous = prev ? parseFloat(prev.grandTotal || "0") : 0;
      return { ...d, current, previous, change: pctChange(current, previous) };
    });
  }, [dailySales]);

  // Vibe rating for non-managers
  function salesVibe(amount: number): { label: string; color: string } {
    if (amount >= 8000) return { label: "Legendary Night", color: "text-amber-400" };
    if (amount >= 5000) return { label: "Great Night", color: "text-green-400" };
    if (amount >= 3500) return { label: "Solid Night", color: "text-blue-400" };
    if (amount >= 2000) return { label: "Steady Night", color: "text-zinc-400" };
    return { label: "Quiet Night", color: "text-zinc-500" };
  }

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: "daily", label: "Daily", icon: Calendar },
    { key: "channels", label: "Channels", icon: BarChart3 },
    { key: "labor", label: "Labor", icon: Users },
  ];

  // ─── Daily Tab ───
  const DailyTab = () => (
    <div className="space-y-3">
      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
            <p className="text-zinc-500 text-[10px] uppercase">Avg / Day</p>
            <p className="text-white font-bold text-lg">{isManager ? formatMoney(stats.avg) : salesVibe(stats.avg).label}</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
            <p className="text-zinc-500 text-[10px] uppercase">Period Total</p>
            <p className="text-white font-bold text-lg">{isManager ? formatMoney(stats.total) : `${dailySales.length} days`}</p>
          </div>
          {isManager && (
            <>
              <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
                <p className="text-zinc-500 text-[10px] uppercase">Best Day</p>
                <p className="text-green-400 font-bold text-lg">{formatMoney(stats.max)}</p>
              </div>
              <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
                <p className="text-zinc-500 text-[10px] uppercase">Slowest Day</p>
                <p className="text-red-400 font-bold text-lg">{formatMoney(stats.min)}</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Period Selector */}
      <div className="flex gap-1">
        {[7, 14, 30, 90].map(d => (
          <button
            key={d}
            onClick={() => setDaysBack(d)}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
              daysBack === d ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" : "bg-zinc-900 text-zinc-500 border border-zinc-800"
            }`}
          >
            {d}d
          </button>
        ))}
      </div>

      {/* Daily Bars */}
      <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
        <p className="text-zinc-400 text-[10px] uppercase mb-2 font-semibold">Daily Revenue</p>
        <div className="space-y-1">
          {recentDays.map(d => {
            const maxVal = stats?.max || 1;
            const pct = (d.current / maxVal) * 100;
            const dayName = new Date(d.businessDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
            return (
              <div key={d.businessDate} className="flex items-center gap-2">
                <span className="text-zinc-500 text-[9px] w-16 shrink-0">{dayName}</span>
                <div className="flex-1 h-4 bg-zinc-800 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full rounded-full transition-all ${d.current >= (stats?.avg || 0) ? "bg-green-500/60" : "bg-amber-500/40"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {isManager ? (
                  <div className="flex items-center gap-1 w-20 justify-end">
                    <span className="text-white text-[10px] font-medium">{formatMoney(d.current)}</span>
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

      {/* Year-over-Year (manager only) */}
      {isManager && dailySales.some(d => d.totalLastYear) && (
        <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
          <p className="text-zinc-400 text-[10px] uppercase mb-2 font-semibold">vs Last Year</p>
          {recentDays.filter(d => d.totalLastYear).slice(0, 7).map(d => {
            const lastYear = parseFloat(d.totalLastYear || "0");
            const { pct, up } = pctChange(d.current, lastYear);
            return (
              <div key={d.businessDate} className="flex items-center justify-between py-1 border-b border-zinc-800/50 last:border-0">
                <span className="text-zinc-400 text-[10px]">{new Date(d.businessDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-500 text-[10px]">LY: {formatMoney(lastYear)}</span>
                  <span className="text-white text-[10px] font-medium">{formatMoney(d.current)}</span>
                  <span className={`text-[10px] font-medium flex items-center gap-0.5 ${up ? "text-green-400" : "text-red-400"}`}>
                    {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />} {pct}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ─── Channels Tab ───
  const ChannelsTab = () => {
    if (!stats) return null;
    const channels = [
      { label: "Pickup", amount: stats.pickup, icon: Utensils, color: "bg-blue-500" },
      { label: "Delivery", amount: stats.delivery, icon: Truck, color: "bg-green-500" },
      { label: "Bar", amount: stats.bar, icon: Coffee, color: "bg-purple-500" },
      { label: "Table", amount: stats.table, icon: Users, color: "bg-amber-500" },
    ];
    const maxChannel = Math.max(...channels.map(c => c.amount));

    const categories = [
      { label: "Food", amount: stats.food, color: "bg-amber-500" },
      { label: "Beer", amount: stats.beer, color: "bg-yellow-500" },
      { label: "Liquor", amount: stats.liquor, color: "bg-purple-500" },
    ];
    const maxCat = Math.max(...categories.map(c => c.amount));

    return (
      <div className="space-y-3">
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <p className="text-zinc-400 text-[10px] uppercase mb-3 font-semibold">Sales by Channel ({daysBack}d)</p>
          {channels.map(ch => (
            <div key={ch.label} className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <ch.icon size={12} className="text-zinc-400" />
                  <span className="text-white text-xs font-medium">{ch.label}</span>
                </div>
                {isManager && <span className="text-zinc-400 text-xs">{formatMoney(ch.amount)}</span>}
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div className={`h-full ${ch.color} rounded-full transition-all`} style={{ width: `${(ch.amount / maxChannel) * 100}%` }} />
              </div>
              <p className="text-zinc-600 text-[9px] mt-0.5">{((ch.amount / stats.total) * 100).toFixed(1)}% of total</p>
            </div>
          ))}
        </div>

        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <p className="text-zinc-400 text-[10px] uppercase mb-3 font-semibold">Sales by Category ({daysBack}d)</p>
          {categories.map(cat => (
            <div key={cat.label} className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white text-xs font-medium">{cat.label}</span>
                {isManager && <span className="text-zinc-400 text-xs">{formatMoney(cat.amount)}</span>}
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div className={`h-full ${cat.color} rounded-full transition-all`} style={{ width: `${(cat.amount / maxCat) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── Labor Tab ───
  const LaborTab = () => {
    if (!stats) return null;
    const laborDays = dailySales.slice(0, 14).map(d => ({
      date: d.businessDate,
      pct: parseFloat(d.laborPct || "0"),
      total: d.laborTotal,
      headcount: d.laborHeadcount,
    }));

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
            <p className="text-zinc-500 text-[10px] uppercase">Avg Labor %</p>
            <p className={`font-bold text-lg ${stats.avgLabor <= 30 ? "text-green-400" : stats.avgLabor <= 35 ? "text-amber-400" : "text-red-400"}`}>
              {stats.avgLabor.toFixed(1)}%
            </p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
            <p className="text-zinc-500 text-[10px] uppercase">Voids ({daysBack}d)</p>
            <p className="text-red-400 font-bold text-lg">{stats.totalVoids}</p>
            {isManager && <p className="text-zinc-500 text-[9px]">{formatMoney(stats.totalVoidAmount)}</p>}
          </div>
        </div>

        <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
          <p className="text-zinc-400 text-[10px] uppercase mb-2 font-semibold">Daily Labor %</p>
          {laborDays.map(d => {
            const dayName = new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
            const color = d.pct <= 28 ? "bg-green-500" : d.pct <= 33 ? "bg-amber-500" : "bg-red-500";
            return (
              <div key={d.date} className="flex items-center gap-2 mb-1">
                <span className="text-zinc-500 text-[9px] w-16 shrink-0">{dayName}</span>
                <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(d.pct * 2, 100)}%` }} />
                </div>
                <span className={`text-[10px] font-medium w-10 text-right ${d.pct <= 28 ? "text-green-400" : d.pct <= 33 ? "text-amber-400" : "text-red-400"}`}>
                  {d.pct.toFixed(1)}%
                </span>
                {isManager && d.headcount && (
                  <span className="text-zinc-600 text-[9px] w-6 text-right">{d.headcount}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Labor target line */}
        <div className="bg-amber-500/5 rounded-xl p-3 border border-amber-500/10">
          <p className="text-amber-500 text-[10px] font-semibold">Target: 28-30% labor</p>
          <p className="text-zinc-400 text-[10px]">
            {stats.avgLabor <= 30 
              ? "You're in the green zone. Keep it up." 
              : stats.avgLabor <= 35 
                ? "Slightly over target. Review scheduling on slow days." 
                : "Labor is running hot. Consider adjusting shift coverage."}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-2 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="text-zinc-400 hover:text-white transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <h2 className="text-white font-bold text-base" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.03em" }}>
            Sales Intelligence
          </h2>
          <p className="text-zinc-500 text-[10px]">PDQ POS · {dailySales.length} days loaded</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-2 flex gap-1 shrink-0">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-medium transition-all ${
              tab === t.key ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" : "bg-zinc-900 text-zinc-400 border border-zinc-800"
            }`}
          >
            <t.icon size={10} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-20">
        {tab === "daily" && <DailyTab />}
        {tab === "channels" && <ChannelsTab />}
        {tab === "labor" && <LaborTab />}
      </div>
    </div>
  );
}
