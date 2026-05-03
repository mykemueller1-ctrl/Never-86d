import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Trash2, Plus, BarChart3, AlertTriangle } from "lucide-react";

interface WasteLogScreenProps {
  onBack: () => void;
  staffUser?: { id: number; name: string; role: string } | null;
}

const WASTE_TYPES = [
  { value: 'expired', label: 'Expired', color: 'bg-red-500/10 text-red-300 border-red-500/20' },
  { value: 'dropped', label: 'Dropped', color: 'bg-orange-500/10 text-orange-300 border-orange-500/20' },
  { value: 'overportioned', label: 'Over-portioned', color: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
  { value: 'returned', label: 'Returned', color: 'bg-purple-500/10 text-purple-300 border-purple-500/20' },
  { value: 'trim_loss', label: 'Trim Loss', color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' },
  { value: 'cooking_loss', label: 'Cooking Loss', color: 'bg-blue-500/10 text-blue-300 border-blue-500/20' },
  { value: 'other', label: 'Other', color: 'bg-white/5 text-white/60 border-white/10' },
];

type Tab = 'log' | 'report' | 'summary';

export default function WasteLogScreen({ onBack, staffUser }: WasteLogScreenProps) {
  const [tab, setTab] = useState<Tab>('report');
  const [days, setDays] = useState(7);

  // Report form
  const [itemName, setItemName] = useState('');
  const [wasteType, setWasteType] = useState('dropped');
  const [quantity, setQuantity] = useState('');
  const [unitOfMeasure, setUnitOfMeasure] = useState('ea');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [reason, setReason] = useState('');
  const [preventable, setPreventable] = useState(true);

  const wasteLog = trpc.waste.list.useQuery({ days });
  const wasteSummary = trpc.waste.summary.useQuery({ days });
  const utils = trpc.useUtils();

  const createWaste = trpc.waste.create.useMutation({
    onSuccess: () => {
      utils.waste.list.invalidate();
      utils.waste.summary.invalidate();
      setItemName('');
      setQuantity('');
      setEstimatedCost('');
      setReason('');
      setTab('log');
    },
  });

  const formatCurrency = (n: string | number | null) => {
    const val = typeof n === 'string' ? parseFloat(n) : (n || 0);
    return `$${val.toFixed(2)}`;
  };

  const getWasteTypeConfig = (type: string) => WASTE_TYPES.find(t => t.value === type) || WASTE_TYPES[6];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-900/80 to-pink-900/80 border-b border-white/10">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/10 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              Waste Tracker
            </h1>
            <p className="text-xs text-white/60">Log waste, track patterns, reduce costs</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5">
        {[
          { key: 'report' as Tab, label: '+ Report' },
          { key: 'log' as Tab, label: 'Log' },
          { key: 'summary' as Tab, label: 'Summary' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === t.key ? 'text-red-400 border-b-2 border-red-400' : 'text-white/40'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        {tab === 'report' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold">Report Waste</h3>

            <input
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm"
              placeholder="Item name (e.g., Wings, Bud Light)"
              value={itemName}
              onChange={e => setItemName(e.target.value)}
            />

            {/* Waste Type */}
            <div>
              <label className="text-xs font-semibold text-white/40 mb-2 block">Waste Type</label>
              <div className="grid grid-cols-2 gap-2">
                {WASTE_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setWasteType(t.value)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      wasteType === t.value ? t.color : 'bg-white/5 text-white/30 border-white/5'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm"
                placeholder="Quantity"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
              />
              <select
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm"
                value={unitOfMeasure}
                onChange={e => setUnitOfMeasure(e.target.value)}
              >
                <option value="ea">Each</option>
                <option value="oz">Ounces</option>
                <option value="lb">Pounds</option>
                <option value="cups">Cups</option>
                <option value="portions">Portions</option>
              </select>
            </div>

            <input
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm"
              placeholder="Estimated cost ($)"
              value={estimatedCost}
              onChange={e => setEstimatedCost(e.target.value)}
            />

            <textarea
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm resize-none"
              rows={2}
              placeholder="Reason / notes"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />

            <div className="flex items-center gap-3">
              <button
                onClick={() => setPreventable(!preventable)}
                className={`px-4 py-2 rounded-lg text-xs font-medium border transition-all ${
                  preventable ? 'bg-red-500/10 text-red-300 border-red-500/20' : 'bg-white/5 text-white/30 border-white/5'
                }`}
              >
                {preventable ? '⚠ Preventable' : '✓ Not Preventable'}
              </button>
            </div>

            <button
              onClick={() => {
                if (!itemName || !quantity) return;
                createWaste.mutate({
                  staffId: staffUser?.id,
                  date: new Date().toISOString(),
                  itemName,
                  wasteType,
                  quantity,
                  unitOfMeasure,
                  estimatedCost: estimatedCost || undefined,
                  reason: reason || undefined,
                  preventable,
                });
              }}
              disabled={createWaste.isPending || !itemName || !quantity}
              className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl py-3 text-sm font-bold transition-colors"
            >
              {createWaste.isPending ? 'Logging...' : 'Log Waste'}
            </button>
          </div>
        )}

        {tab === 'log' && (
          <div className="space-y-3">
            {/* Days filter */}
            <div className="flex gap-2">
              {[1, 7, 14, 30].map(d => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    days === d ? 'bg-red-600 text-white' : 'bg-white/5 text-white/40'
                  }`}
                >
                  {d === 1 ? 'Today' : `${d}d`}
                </button>
              ))}
            </div>

            {wasteLog.isLoading ? (
              <div className="text-center py-10 text-white/30">Loading...</div>
            ) : (wasteLog.data?.length || 0) === 0 ? (
              <div className="text-center py-10">
                <Trash2 className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm">No waste logged in this period</p>
              </div>
            ) : (
              wasteLog.data?.map((w: any) => {
                const typeConfig = getWasteTypeConfig(w.wasteType);
                return (
                  <div key={w.id} className="bg-white/5 rounded-xl px-4 py-3 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{w.itemName}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${typeConfig.color}`}>
                            {typeConfig.label}
                          </span>
                          <span className="text-[10px] text-white/30">{w.quantity} {w.unitOfMeasure}</span>
                          {w.preventable && (
                            <span className="text-[10px] text-red-400 flex items-center gap-0.5">
                              <AlertTriangle className="w-3 h-3" /> Preventable
                            </span>
                          )}
                        </div>
                        {w.reason && <p className="text-[10px] text-white/30 mt-1">{w.reason}</p>}
                      </div>
                      <div className="text-right">
                        {w.estimatedCost && (
                          <div className="text-sm font-bold text-red-400">{formatCurrency(w.estimatedCost)}</div>
                        )}
                        <div className="text-[10px] text-white/20">
                          {new Date(w.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === 'summary' && (
          <div className="space-y-4">
            {wasteSummary.isLoading ? (
              <div className="text-center py-10 text-white/30">Loading...</div>
            ) : !wasteSummary.data ? (
              <div className="text-center py-10 text-white/30 text-sm">No data</div>
            ) : (
              <>
                {/* Total */}
                <div className="bg-gradient-to-br from-red-900/30 to-pink-900/30 rounded-2xl p-5 border border-red-500/20 text-center">
                  <div className="text-sm text-white/50">Total Waste ({days} days)</div>
                  <div className="text-3xl font-black text-red-400 mt-1">
                    {formatCurrency((wasteSummary.data as any).totalCost || 0)}
                  </div>
                  <div className="text-xs text-white/30 mt-1">
                    {(wasteSummary.data as any).totalEntries || 0} entries · {(wasteSummary.data as any).preventableCount || 0} preventable
                  </div>
                </div>

                {/* By Type */}
                {(wasteSummary.data as any).byType && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-red-400" />
                      By Type
                    </h3>
                    <div className="space-y-2">
                      {((wasteSummary.data as any).byType as any[]).map((t: any, i: number) => {
                        const typeConfig = getWasteTypeConfig(t.wasteType);
                        return (
                          <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${typeConfig.color}`}>
                              {typeConfig.label}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-white/40">{t.count} entries</span>
                              <span className="text-sm font-bold text-red-300">{formatCurrency(t.totalCost)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Top Items */}
                {(wasteSummary.data as any).topItems && (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <h3 className="text-sm font-bold mb-3">Top Wasted Items</h3>
                    <div className="space-y-2">
                      {((wasteSummary.data as any).topItems as any[]).map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                          <span className="text-sm">{item.itemName}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-white/40">{item.count}x</span>
                            <span className="text-sm font-bold text-red-300">{formatCurrency(item.totalCost)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
