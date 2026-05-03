import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, TrendingUp, Cloud, Calendar, ChevronRight, AlertTriangle, Sun, CloudRain, Snowflake, Wind, BarChart3 } from "lucide-react";

interface ForecastScreenProps {
  onBack: () => void;
  staffUser?: { id: number; name: string; role: string } | null;
}

export default function ForecastScreen({ onBack }: ForecastScreenProps) {
  const [selectedDay, setSelectedDay] = useState(0);
  const weekForecast = trpc.forecast.weekAhead.useQuery();
  const eventHistory = trpc.forecast.eventImpactHistory.useQuery();

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

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900/80 to-purple-900/80 border-b border-white/10">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              Sales Forecast
            </h1>
            <p className="text-xs text-white/60">Weather + Events + Historical Patterns</p>
          </div>
        </div>
      </div>

      {/* Day Selector */}
      {weekForecast.isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          <div className="flex overflow-x-auto gap-2 px-4 py-3 border-b border-white/5">
            {forecasts.map((f: any, i: number) => {
              const isToday = i === 0;
              const isSelected = i === selectedDay;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(i)}
                  className={`flex-shrink-0 px-3 py-2 rounded-xl text-center transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
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
                    <div className="text-sm text-white/50">{selected.dayOfWeek} Forecast</div>
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
                    <div className="text-[10px] uppercase text-white/40 tracking-wider">Avg {selected.dayOfWeek}</div>
                    <div className="text-lg font-bold">{formatCurrency(selected.baseline?.avgTotalAmount || 0)}</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <div className="text-[10px] uppercase text-white/40 tracking-wider">Low</div>
                    <div className="text-lg font-bold text-red-400">{formatCurrency(selected.baseline?.minTotalAmount || 0)}</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <div className="text-[10px] uppercase text-white/40 tracking-wider">High</div>
                    <div className="text-lg font-bold text-emerald-400">{formatCurrency(selected.baseline?.maxTotalAmount || 0)}</div>
                  </div>
                </div>

                {/* Orders & Per Guest */}
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="text-[10px] uppercase text-white/40 tracking-wider">Predicted Orders</div>
                    <div className="text-xl font-bold">{selected.forecast?.predictedOrders || 0}</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="text-[10px] uppercase text-white/40 tracking-wider">Avg/Guest</div>
                    <div className="text-xl font-bold">${(selected.baseline?.avgPerGuest || 0).toFixed(2)}</div>
                  </div>
                </div>

                {/* Samples */}
                <div className="text-xs text-white/30 mt-3 text-center">
                  Based on {selected.baseline?.sampleCount || 0} {selected.dayOfWeek}s in last 90 days
                </div>
              </div>

              {/* Adjustment Factors */}
              <div className="grid grid-cols-2 gap-3">
                {/* Weather Impact */}
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
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
                        <div className="text-[10px] text-white/40 mt-1">{selected.weatherNote}</div>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-white/30">No weather data</div>
                  )}
                </div>

                {/* Event Impact */}
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    <span className="text-sm font-semibold">Events</span>
                  </div>
                  {(selected.events?.length || 0) > 0 ? (
                    <>
                      <div className="text-2xl font-black">{selected.events.length}</div>
                      <div className="text-xs text-white/40">nearby events</div>
                      {selected.forecast?.eventAdjustmentPct !== 0 && (
                        <div className="text-xs mt-1 font-medium text-emerald-400">
                          +{selected.forecast?.eventAdjustmentPct}% impact
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-white/30">No nearby events</div>
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
                        <span className="text-white/70">{note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category Breakdown */}
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
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
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <h3 className="text-sm font-bold mb-3">Hourly Sales Pattern</h3>
                  <div className="space-y-1.5">
                    {hourlyData.map((h: any, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-20 text-[10px] text-white/40 text-right flex-shrink-0 truncate">{h.hour}</div>
                        <div className="flex-1 h-5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-purple-500 transition-all"
                            style={{ width: `${Math.max((h.sales / maxHourlySales) * 100, 2)}%` }}
                          />
                        </div>
                        <div className="w-14 text-[10px] text-white/50 text-right">{formatCurrency(h.sales)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Mix Trends */}
              {(selected.categoryTrends?.length || 0) > 0 && (
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <h3 className="text-sm font-bold mb-3">Product Mix ({selected.dayOfWeek}s Avg)</h3>
                  <div className="space-y-2">
                    {selected.categoryTrends.map((ct: any, i: number) => (
                      <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                        <span className="text-sm capitalize">{ct.category}</span>
                        <div className="text-right">
                          <span className="text-sm font-bold">{formatCurrency(parseFloat(ct.avgSales || '0'))}</span>
                          <span className="text-[10px] text-white/40 ml-2">{Math.round(parseFloat(ct.avgQuantity || '0'))} items</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Event Impact History */}
              {eventHistory.data && eventHistory.data.length > 0 && (
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Past Event Impact
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {eventHistory.data.slice(0, 10).map((evt: any, i: number) => (
                      <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                        <div>
                          <div className="text-xs font-medium">{evt.eventName}</div>
                          <div className="text-[10px] text-white/40">{evt.eventDate} · {evt.distance}mi · {evt.category}</div>
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
    </div>
  );
}
