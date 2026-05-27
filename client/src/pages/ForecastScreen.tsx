import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, TrendingUp, Cloud, Calendar, ChevronRight, AlertTriangle, Sun, CloudRain, Snowflake, Wind, BarChart3, Brain, Activity, Target } from "lucide-react";

interface ForecastScreenProps {
  onBack: () => void;
  staffUser?: { id: number; name: string; role: string } | null;
}

type TabType = 'weekly' | 'ml';

export default function ForecastScreen({ onBack }: ForecastScreenProps) {
  const [activeTab, setActiveTab] = useState<TabType>('weekly');
  const [selectedDay, setSelectedDay] = useState(0);
  const [mlDays, setMlDays] = useState(14);
  const weekForecast = trpc.forecast.weekAhead.useQuery();
  const eventHistory = trpc.forecast.eventImpactHistory.useQuery();
  const mlPrediction = trpc.forecast.mlPrediction.useQuery({ daysAhead: mlDays });

  const forecasts = weekForecast.data || [];
  const selected = forecasts[selectedDay] || null;

  const getWeatherIcon = (note: string) => {
    if (!note) return <Sun className="w-5 h-5 text-amber-400" />;
    if (note.toLowerCase().includes('snow')) return <Snowflake className="w-5 h-5 text-blue-300" />;
    if (note.toLowerCase().includes('rain')) return <CloudRain className="w-5 h-5 text-blue-400" />;
    if (note.toLowerCase().includes('cold')) return <Wind className="w-5 h-5 text-cyan-400" />;
    if (note.toLowerCase().includes('hot')) return <Sun className="w-5 h-5 text-orange-400" />;
    return <Cloud className="w-5 h-5 text-gray-400" />;
  };

  const getConfidenceColor = (c: string) => {
    if (c === 'high') return 'text-emerald-400 bg-emerald-400/10';
    if (c === 'medium') return 'text-amber-400 bg-amber-400/10';
    return 'text-red-400 bg-red-400/10';
  };

  const formatCurrency = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  // Build hourly chart data
  const hourlyData = useMemo(() => {
    if (!selected?.hourlyPattern) return [];
    return selected.hourlyPattern.map((h: any) => ({
      hour: h.hour,
      sales: parseFloat(h.avgSales || '0'),
      orders: parseFloat(h.avgOrders || '0'),
    }));
  }, [selected]);

  const maxHourlySales = Math.max(...hourlyData.map((h: any) => h.sales), 1);

  // ML prediction data
  const mlData = mlPrediction.data;
  const predictions = mlData?.predictions || [];
  const model = mlData?.model as any;
  const trends = mlData?.trends as any;
  const maxPredicted = Math.max(...predictions.map((p: any) => p.confidenceHigh || 0), 1);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900/80 to-purple-900/80 border-b border-slate-200">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              Sales Forecast
            </h1>
            <p className="text-xs text-slate-500">Weather + Events + Historical Patterns + ML</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex px-4 pb-0 gap-1">
          <button
            onClick={() => setActiveTab('weekly')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
              activeTab === 'weekly'
                ? 'bg-slate-50 text-slate-900 border-t border-x border-slate-200'
                : 'text-slate-500 hover:text-slate-600 hover:bg-white/5'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            7-Day Forecast
          </button>
          <button
            onClick={() => setActiveTab('ml')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
              activeTab === 'ml'
                ? 'bg-slate-50 text-slate-900 border-t border-x border-slate-200'
                : 'text-slate-500 hover:text-slate-600 hover:bg-white/5'
            }`}
          >
            <Brain className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            ML Prediction
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* WEEKLY FORECAST TAB */}
      {/* ═══════════════════════════════════════════ */}
      {activeTab === 'weekly' && (
        <>
          {weekForecast.isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              <div className="flex overflow-x-auto gap-2 px-4 py-3 border-b border-slate-200">
                {forecasts.map((f: any, i: number) => {
                  const isToday = i === 0;
                  const isSelected = i === selectedDay;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDay(i)}
                      className={`flex-shrink-0 px-3 py-2 rounded-xl text-center transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-slate-900 shadow-lg shadow-indigo-600/30'
                          : 'bg-white/5 text-slate-500 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-[10px] uppercase tracking-wider opacity-60">
                        {isToday ? 'Today' : f.dayOfWeek?.slice(0, 3)}
                      </div>
                      <div className="text-sm font-bold mt-0.5">
                        {f.targetDate?.split('-').slice(1).join('/')}
                      </div>
                      <div className="text-xs mt-1 font-medium">
                        {formatCurrency(f.forecast?.predictedSales || 0)}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selected && (
                <div className="px-4 py-4 space-y-4">
                  {/* Main Forecast Card */}
                  <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 rounded-2xl p-5 border border-indigo-500/20">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-sm text-slate-500">{selected.dayOfWeek} Forecast</div>
                        <div className="text-3xl font-black tracking-tight">
                          {formatCurrency(selected.forecast?.predictedSales || 0)}
                        </div>
                      </div>
                      <div className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${getConfidenceColor(selected.forecast?.confidence || 'low')}`}>
                        {selected.forecast?.confidence} confidence
                      </div>
                    </div>

                    {/* Baseline comparison */}
                    <div className="grid grid-cols-3 gap-3 mt-4">
                      <div className="bg-white/5 rounded-xl p-3 text-center">
                        <div className="text-[10px] uppercase text-slate-400 tracking-wider">Avg {selected.dayOfWeek}</div>
                        <div className="text-lg font-bold">{formatCurrency(selected.baseline?.avgTotalAmount || 0)}</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 text-center">
                        <div className="text-[10px] uppercase text-slate-400 tracking-wider">Low</div>
                        <div className="text-lg font-bold text-red-400">{formatCurrency(selected.baseline?.minTotalAmount || 0)}</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 text-center">
                        <div className="text-[10px] uppercase text-slate-400 tracking-wider">High</div>
                        <div className="text-lg font-bold text-emerald-400">{formatCurrency(selected.baseline?.maxTotalAmount || 0)}</div>
                      </div>
                    </div>

                    {/* Orders & Per Guest */}
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="bg-white/5 rounded-xl p-3">
                        <div className="text-[10px] uppercase text-slate-400 tracking-wider">Predicted Orders</div>
                        <div className="text-xl font-bold">{selected.forecast?.predictedOrders || 0}</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3">
                        <div className="text-[10px] uppercase text-slate-400 tracking-wider">Avg/Guest</div>
                        <div className="text-xl font-bold">${(selected.baseline?.avgPerGuest || 0).toFixed(2)}</div>
                      </div>
                    </div>

                    {/* Samples */}
                    <div className="text-xs text-slate-900/30 mt-3 text-center">
                      Based on {selected.baseline?.sampleCount || 0} {selected.dayOfWeek}s in last 90 days
                    </div>
                  </div>

                  {/* Adjustment Factors */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Weather Impact */}
                    <div className="bg-white/5 rounded-2xl p-4 border border-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                        {getWeatherIcon(selected.weatherNote || '')}
                        <span className="text-sm font-semibold">Weather</span>
                      </div>
                      {selected.weather ? (
                        <>
                          <div className="text-2xl font-black">
                            {selected.weather.tempMax ? `${Math.round(parseFloat(selected.weather.tempMax))}°F` : '--'}
                          </div>
                          {selected.forecast?.weatherAdjustmentPct !== 0 && (
                            <div className={`text-xs mt-1 font-medium ${(selected.forecast?.weatherAdjustmentPct || 0) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {(selected.forecast?.weatherAdjustmentPct || 0) > 0 ? '+' : ''}{selected.forecast?.weatherAdjustmentPct}% impact
                            </div>
                          )}
                          {selected.weatherNote && (
                            <div className="text-[10px] text-slate-400 mt-1">{selected.weatherNote}</div>
                          )}
                        </>
                      ) : (
                        <div className="text-sm text-slate-900/30">No weather data</div>
                      )}
                    </div>

                    {/* Event Impact */}
                    <div className="bg-white/5 rounded-2xl p-4 border border-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-5 h-5 text-purple-400" />
                        <span className="text-sm font-semibold">Events</span>
                      </div>
                      {(selected.events?.length || 0) > 0 ? (
                        <>
                          <div className="text-2xl font-black">{selected.events.length}</div>
                          <div className="text-xs text-slate-400">nearby events</div>
                          {selected.forecast?.eventAdjustmentPct !== 0 && (
                            <div className="text-xs mt-1 font-medium text-emerald-400">
                              +{selected.forecast?.eventAdjustmentPct}% impact
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-sm text-slate-900/30">No nearby events</div>
                      )}
                    </div>
                  </div>

                  {/* Event Details */}
                  {(selected.eventNotes?.length || 0) > 0 && (
                    <div className="bg-purple-900/20 rounded-2xl p-4 border border-purple-500/20">
                      <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-purple-400" />
                        Event Impact Details
                      </h3>
                      <div className="space-y-2">
                        {selected.eventNotes.map((note: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <ChevronRight className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />
                            <span className="text-slate-600">{note}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category Breakdown */}
                  <div className="bg-white/5 rounded-2xl p-4 border border-slate-200">
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-indigo-400" />
                      Category Trends ({selected.dayOfWeek}s)
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-orange-500/10 rounded-xl p-3 border border-orange-500/20">
                        <div className="text-[10px] uppercase text-orange-300/60 tracking-wider">Food</div>
                        <div className="text-lg font-bold text-orange-300">{formatCurrency(selected.baseline?.avgFoodAmount || 0)}</div>
                      </div>
                      <div className="bg-amber-500/10 rounded-xl p-3 border border-amber-500/20">
                        <div className="text-[10px] uppercase text-amber-300/60 tracking-wider">Beer</div>
                        <div className="text-lg font-bold text-amber-300">{formatCurrency(selected.baseline?.avgBeerAmount || 0)}</div>
                      </div>
                      <div className="bg-purple-500/10 rounded-xl p-3 border border-purple-500/20">
                        <div className="text-[10px] uppercase text-purple-300/60 tracking-wider">Liquor</div>
                        <div className="text-lg font-bold text-purple-300">{formatCurrency(selected.baseline?.avgLiquorAmount || 0)}</div>
                      </div>
                      <div className="bg-cyan-500/10 rounded-xl p-3 border border-cyan-500/20">
                        <div className="text-[10px] uppercase text-cyan-300/60 tracking-wider">Pop</div>
                        <div className="text-lg font-bold text-cyan-300">{formatCurrency(selected.baseline?.avgPopAmount || 0)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Hourly Heatmap */}
                  {hourlyData.length > 0 && (
                    <div className="bg-white/5 rounded-2xl p-4 border border-slate-200">
                      <h3 className="text-sm font-bold mb-3">Hourly Sales Pattern</h3>
                      <div className="space-y-1.5">
                        {hourlyData.map((h: any, i: number) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="w-20 text-[10px] text-slate-400 text-right flex-shrink-0 truncate">{h.hour}</div>
                            <div className="flex-1 h-5 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-purple-500 transition-all"
                                style={{ width: `${Math.max((h.sales / maxHourlySales) * 100, 2)}%` }}
                              />
                            </div>
                            <div className="w-14 text-[10px] text-slate-500 text-right">{formatCurrency(h.sales)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Product Mix Trends */}
                  {(selected.categoryTrends?.length || 0) > 0 && (
                    <div className="bg-white/5 rounded-2xl p-4 border border-slate-200">
                      <h3 className="text-sm font-bold mb-3">Product Mix ({selected.dayOfWeek}s Avg)</h3>
                      <div className="space-y-2">
                        {selected.categoryTrends.map((ct: any, i: number) => (
                          <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                            <span className="text-sm capitalize">{ct.category}</span>
                            <div className="text-right">
                              <span className="text-sm font-bold">{formatCurrency(parseFloat(ct.avgSales || '0'))}</span>
                              <span className="text-[10px] text-slate-400 ml-2">{Math.round(parseFloat(ct.avgQuantity || '0'))} items</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Event Impact History */}
                  {eventHistory.data && eventHistory.data.length > 0 && (
                    <div className="bg-white/5 rounded-2xl p-4 border border-slate-200">
                      <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        Past Event Impact
                      </h3>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {eventHistory.data.slice(0, 10).map((evt: any, i: number) => (
                          <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                            <div>
                              <div className="text-xs font-medium">{evt.eventName}</div>
                              <div className="text-[10px] text-slate-400">{evt.eventDate} · {evt.distance}mi · {evt.category}</div>
                            </div>
                            <div className="text-sm font-bold">
                              {evt.totalAmount ? formatCurrency(parseFloat(evt.totalAmount)) : '--'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* ML PREDICTION TAB */}
      {/* ═══════════════════════════════════════════ */}
      {activeTab === 'ml' && (
        <>
          {mlPrediction.isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full" />
            </div>
          ) : !model || model.error ? (
            <div className="px-4 py-20 text-center">
              <Brain className="w-12 h-12 text-slate-900/20 mx-auto mb-3" />
              <div className="text-slate-400 text-sm">{model?.error || 'No prediction data available'}</div>
            </div>
          ) : (
            <div className="px-4 py-4 space-y-4">

              {/* Range Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Predict:</span>
                {[7, 14, 21, 30].map(d => (
                  <button
                    key={d}
                    onClick={() => setMlDays(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      mlDays === d
                        ? 'bg-purple-600 text-slate-900 shadow-lg shadow-purple-600/30'
                        : 'bg-white/5 text-slate-500 hover:bg-white/10'
                    }`}
                  >
                    {d} days
                  </button>
                ))}
              </div>

              {/* Model Stats Card */}
              <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 rounded-2xl p-5 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-5 h-5 text-purple-400" />
                  <h3 className="text-sm font-bold">ML Model Stats</h3>
                  <div className="ml-auto px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase tracking-wider">
                    Linear Regression
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="text-[10px] uppercase text-slate-400 tracking-wider">Training Data</div>
                    <div className="text-xl font-bold">{model.totalDataPoints}</div>
                    <div className="text-[10px] text-slate-900/30">{model.dateRange?.from} → {model.dateRange?.to}</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="text-[10px] uppercase text-slate-400 tracking-wider">R² Score</div>
                    <div className="text-xl font-bold">{model.timeTrend?.r2}</div>
                    <div className={`text-[10px] font-medium ${model.timeTrend?.r2 >= 0.5 ? 'text-emerald-400' : model.timeTrend?.r2 >= 0.2 ? 'text-amber-400' : 'text-red-400'}`}>
                      {model.timeTrend?.r2 >= 0.5 ? 'Strong fit' : model.timeTrend?.r2 >= 0.2 ? 'Moderate fit' : 'Weak fit'}
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="text-[10px] uppercase text-slate-400 tracking-wider">Trend</div>
                    <div className="flex items-center gap-1.5">
                      <Activity className={`w-4 h-4 ${model.timeTrend?.direction === 'growing' ? 'text-emerald-400' : model.timeTrend?.direction === 'declining' ? 'text-red-400' : 'text-slate-400'}`} />
                      <span className="text-xl font-bold capitalize">{model.timeTrend?.direction}</span>
                    </div>
                    <div className="text-[10px] text-slate-900/30">${model.timeTrend?.dailyChange}/day</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="text-[10px] uppercase text-slate-400 tracking-wider">Avg Daily</div>
                    <div className="text-xl font-bold">{formatCurrency(model.overallAvgSales || 0)}</div>
                    <div className="text-[10px] text-slate-900/30">historical average</div>
                  </div>
                </div>

                {/* Temperature coefficient */}
                {model.tempCoefficient && (
                  <div className="mt-3 bg-white/5 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] uppercase text-slate-400 tracking-wider">Temperature Impact</div>
                        <div className="text-sm font-bold">
                          {model.tempCoefficient.perDegree > 0 ? '+' : ''}{formatCurrency(model.tempCoefficient.perDegree)} per °F
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-900/30">R² {model.tempCoefficient.r2}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Day-of-Week Multipliers */}
              {model.dowMultipliers && (
                <div className="bg-white/5 rounded-2xl p-4 border border-slate-200">
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-indigo-400" />
                    Day-of-Week Multipliers
                  </h3>
                  <div className="grid grid-cols-7 gap-1">
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                      const mult = model.dowMultipliers[day] || 1;
                      const isHigh = mult >= 1.1;
                      const isLow = mult <= 0.9;
                      return (
                        <div key={day} className={`rounded-lg p-2 text-center ${isHigh ? 'bg-emerald-500/10 border border-emerald-500/20' : isLow ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/5 border border-slate-200'}`}>
                          <div className="text-[9px] uppercase tracking-wider text-slate-400">{day.slice(0, 3)}</div>
                          <div className={`text-sm font-bold ${isHigh ? 'text-emerald-400' : isLow ? 'text-red-400' : 'text-slate-600'}`}>
                            {mult.toFixed(2)}x
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-[10px] text-slate-900/30 mt-2 text-center">
                    1.00x = average day · &gt;1.10x = strong day · &lt;0.90x = slow day
                  </div>
                </div>
              )}

              {/* Category Trends (30-day momentum) */}
              {trends && (
                <div className="bg-white/5 rounded-2xl p-4 border border-slate-200">
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-amber-400" />
                    30-Day Category Momentum
                  </h3>
                  <div className="space-y-2">
                    {[
                      { key: 'food', label: 'Food', color: 'orange' },
                      { key: 'beer', label: 'Beer', color: 'amber' },
                      { key: 'liquor', label: 'Liquor', color: 'purple' },
                      { key: 'pop', label: 'Pop', color: 'cyan' },
                    ].map(({ key, label, color }) => {
                      const t = trends[key];
                      if (!t) return null;
                      const changePositive = t.change > 0;
                      return (
                        <div key={key} className={`bg-${color}-500/10 rounded-xl p-3 border border-${color}-500/20`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className={`text-[10px] uppercase text-${color}-300/60 tracking-wider`}>{label}</div>
                              <div className="flex items-baseline gap-2">
                                <span className={`text-lg font-bold text-${color}-300`}>{formatCurrency(t.recent)}</span>
                                <span className="text-[10px] text-slate-900/30">avg/day (last 30d)</span>
                              </div>
                            </div>
                            <div className={`px-2 py-1 rounded-lg text-xs font-bold ${changePositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                              {changePositive ? '+' : ''}{t.change.toFixed(1)}%
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-900/30">Prior 30d: {formatCurrency(t.prior)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Prediction Chart (visual bar chart) */}
              <div className="bg-white/5 rounded-2xl p-4 border border-slate-200">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  {mlDays}-Day Sales Prediction
                </h3>
                <div className="space-y-1">
                  {predictions.map((p: any, i: number) => {
                    const barWidth = maxPredicted > 0 ? (p.predictedSales / maxPredicted) * 100 : 0;
                    const lowWidth = maxPredicted > 0 ? (p.confidenceLow / maxPredicted) * 100 : 0;
                    const highWidth = maxPredicted > 0 ? (p.confidenceHigh / maxPredicted) * 100 : 0;
                    const isWeekend = p.dayOfWeek === 'Friday' || p.dayOfWeek === 'Saturday';
                    return (
                      <div key={i} className="group relative">
                        <div className="flex items-center gap-2">
                          <div className="w-16 text-[10px] text-slate-400 text-right flex-shrink-0">
                            <div className={`${isWeekend ? 'text-amber-400 font-medium' : ''}`}>{p.dayOfWeek?.slice(0, 3)}</div>
                            <div>{p.date?.split('-').slice(1).join('/')}</div>
                          </div>
                          <div className="flex-1 h-6 bg-white/5 rounded-full overflow-hidden relative">
                            {/* Confidence band (low to high) */}
                            <div
                              className="absolute h-full bg-purple-500/10 rounded-full"
                              style={{ left: `${lowWidth}%`, width: `${highWidth - lowWidth}%` }}
                            />
                            {/* Predicted value bar */}
                            <div
                              className={`h-full rounded-full transition-all ${
                                isWeekend
                                  ? 'bg-gradient-to-r from-amber-600 to-orange-500'
                                  : 'bg-gradient-to-r from-purple-600 to-indigo-500'
                              }`}
                              style={{ width: `${Math.max(barWidth, 2)}%` }}
                            />
                          </div>
                          <div className="w-16 text-[10px] text-slate-500 text-right font-medium">
                            {formatCurrency(p.predictedSales)}
                          </div>
                        </div>
                        {/* Tooltip on hover */}
                        <div className="hidden group-hover:block absolute left-20 -top-8 z-10 bg-gray-800 border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] shadow-xl whitespace-nowrap">
                          <span className="text-slate-500">95% CI:</span> {formatCurrency(p.confidenceLow)} — {formatCurrency(p.confidenceHigh)}
                          <span className="ml-2 text-slate-900/30">|</span>
                          <span className={`ml-2 ${getConfidenceColor(p.confidence).split(' ')[0]}`}>{p.confidence}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-900/30">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-2 rounded-sm bg-gradient-to-r from-purple-600 to-indigo-500" />
                    Weekday
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-2 rounded-sm bg-gradient-to-r from-amber-600 to-orange-500" />
                    Weekend
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-2 rounded-sm bg-purple-500/20" />
                    95% Confidence Band
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/5 rounded-xl p-3 text-center border border-slate-200">
                  <div className="text-[10px] uppercase text-slate-400 tracking-wider">Total Predicted</div>
                  <div className="text-lg font-bold text-purple-300">
                    {formatCurrency(predictions.reduce((a: number, p: any) => a + p.predictedSales, 0))}
                  </div>
                  <div className="text-[10px] text-slate-900/30">{mlDays} days</div>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center border border-slate-200">
                  <div className="text-[10px] uppercase text-slate-400 tracking-wider">Best Day</div>
                  <div className="text-lg font-bold text-emerald-400">
                    {formatCurrency(Math.max(...predictions.map((p: any) => p.predictedSales)))}
                  </div>
                  <div className="text-[10px] text-slate-900/30">
                    {predictions.reduce((best: any, p: any) => p.predictedSales > best.predictedSales ? p : best, predictions[0])?.dayOfWeek?.slice(0, 3)}
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center border border-slate-200">
                  <div className="text-[10px] uppercase text-slate-400 tracking-wider">Slowest Day</div>
                  <div className="text-lg font-bold text-red-400">
                    {formatCurrency(Math.min(...predictions.map((p: any) => p.predictedSales)))}
                  </div>
                  <div className="text-[10px] text-slate-900/30">
                    {predictions.reduce((worst: any, p: any) => p.predictedSales < worst.predictedSales ? p : worst, predictions[0])?.dayOfWeek?.slice(0, 3)}
                  </div>
                </div>
              </div>

              {/* Methodology Note */}
              <div className="bg-white/5 rounded-2xl p-4 border border-slate-200">
                <h3 className="text-xs font-bold text-slate-500 mb-2">How This Works</h3>
                <p className="text-[11px] text-slate-900/30 leading-relaxed">
                  This model uses linear regression trained on {model.totalDataPoints} days of actual PDQ sales data. 
                  It combines a time trend (${model.timeTrend?.dailyChange}/day {model.timeTrend?.direction}) with 
                  day-of-week seasonality multipliers to predict future sales. The 95% confidence interval is calculated 
                  from historical variance for each day of the week. Temperature correlation (R²={model.tempCoefficient?.r2}) 
                  and category momentum are tracked but not yet factored into predictions to avoid overfitting.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
