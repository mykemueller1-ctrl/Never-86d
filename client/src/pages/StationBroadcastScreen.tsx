import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, AlertOctagon, Check, Clock, Plus, Radio, History, Bell } from "lucide-react";

interface StationBroadcastScreenProps {
  onBack: () => void;
  staffUser?: { id: number; name: string; role: string } | null;
}

type Tab = 'active' | 'create' | 'history';

const STATIONS = ['kitchen_line', 'pizza_side', 'bar', 'dining_room', 'driver', 'dishwasher', 'management'];
const BROADCAST_TYPES = [
  { value: '86d', label: "86'd", icon: AlertOctagon, color: 'text-red-400', desc: 'Item is out — all stations need to know' },
  { value: 'un86d', label: "Un-86'd", icon: Check, color: 'text-emerald-400', desc: 'Item is back in stock' },
  { value: 'alert', label: 'Alert', icon: Bell, color: 'text-amber-400', desc: 'General station alert' },
];

export default function StationBroadcastScreen({ onBack, staffUser }: StationBroadcastScreenProps) {
  const [tab, setTab] = useState<Tab>('active');
  const [stationFilter, setStationFilter] = useState<string | undefined>(undefined);

  // Create form
  const [broadcastType, setBroadcastType] = useState('86d');
  const [itemName, setItemName] = useState('');
  const [message, setMessage] = useState('');
  const [fromStation, setFromStation] = useState(staffUser?.role === 'bartender' ? 'bar' : staffUser?.role === 'cook' ? 'kitchen_line' : 'management');
  const [targetStations, setTargetStations] = useState<string[]>(['kitchen_line', 'pizza_side', 'bar', 'dining_room']);

  const activeBroadcasts = trpc.broadcasts.active.useQuery({ station: stationFilter });
  const broadcastHistory = trpc.broadcasts.history.useQuery({ limit: 30 });
  const utils = trpc.useUtils();

  const createBroadcast = trpc.broadcasts.create.useMutation({
    onSuccess: () => {
      utils.broadcasts.active.invalidate();
      utils.broadcasts.history.invalidate();
      setItemName('');
      setMessage('');
      setTab('active');
    },
  });
  const acknowledgeBroadcast = trpc.broadcasts.acknowledge.useMutation({
    onSuccess: () => utils.broadcasts.active.invalidate(),
  });
  const resolveBroadcast = trpc.broadcasts.resolve.useMutation({
    onSuccess: () => { utils.broadcasts.active.invalidate(); utils.broadcasts.history.invalidate(); },
  });

  const toggleStation = (s: string) => {
    setTargetStations(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const getTypeConfig = (type: string) => BROADCAST_TYPES.find(t => t.value === type) || BROADCAST_TYPES[0];

  const formatTime = (d: string | Date) => {
    const date = new Date(d);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-900/80 to-orange-900/80 border-b border-white/10">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/10 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Radio className="w-5 h-5 text-red-400" />
              Station Broadcasts
            </h1>
            <p className="text-xs text-white/60">86'd items, alerts, cross-station comms</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5">
        {[
          { key: 'active' as Tab, label: 'Active', count: activeBroadcasts.data?.length || 0 },
          { key: 'create' as Tab, label: '+ Broadcast' },
          { key: 'history' as Tab, label: 'History' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
              tab === t.key ? 'text-red-400 border-b-2 border-red-400' : 'text-white/40'
            }`}
          >
            {t.label}
            {'count' in t && (t.count ?? 0) > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        {tab === 'active' && (
          <div className="space-y-3">
            {/* Station filter */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setStationFilter(undefined)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  !stationFilter ? 'bg-red-600 text-white' : 'bg-white/5 text-white/40'
                }`}
              >
                All
              </button>
              {STATIONS.map(s => (
                <button
                  key={s}
                  onClick={() => setStationFilter(s)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                    stationFilter === s ? 'bg-red-600 text-white' : 'bg-white/5 text-white/40'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {activeBroadcasts.isLoading ? (
              <div className="text-center py-10 text-white/30">Loading...</div>
            ) : (activeBroadcasts.data?.length || 0) === 0 ? (
              <div className="text-center py-10">
                <Check className="w-12 h-12 text-emerald-500/20 mx-auto mb-3" />
                <p className="text-white/30 text-sm">All clear — no active broadcasts</p>
              </div>
            ) : (
              activeBroadcasts.data?.map((b: any) => {
                const typeConfig = getTypeConfig(b.broadcastType);
                const TypeIcon = typeConfig.icon;
                const acknowledged = b.acknowledgedBy ? JSON.parse(b.acknowledgedBy || '[]') : [];
                const targets = b.targetStations ? JSON.parse(b.targetStations) : [];

                return (
                  <div key={b.id} className={`rounded-2xl border overflow-hidden ${
                    b.broadcastType === '86d' ? 'bg-red-900/20 border-red-500/30' :
                    b.broadcastType === 'un86d' ? 'bg-emerald-900/20 border-emerald-500/30' :
                    'bg-amber-900/20 border-amber-500/30'
                  }`}>
                    <div className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <TypeIcon className={`w-6 h-6 mt-0.5 ${typeConfig.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black uppercase tracking-wide">{b.itemName}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              b.broadcastType === '86d' ? 'bg-red-500/20 text-red-300' :
                              b.broadcastType === 'un86d' ? 'bg-emerald-500/20 text-emerald-300' :
                              'bg-amber-500/20 text-amber-300'
                            }`}>
                              {typeConfig.label}
                            </span>
                          </div>
                          {b.message && <p className="text-xs text-white/50 mt-1">{b.message}</p>}
                          <div className="flex items-center gap-2 mt-2 text-[10px] text-white/30">
                            <span>From: {b.fromStation}</span>
                            <span>·</span>
                            <span>To: {targets.join(', ')}</span>
                            <span>·</span>
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(b.createdAt)}</span>
                          </div>
                          {b.createdByName && (
                            <div className="text-[10px] text-white/20 mt-1">By: {b.createdByName}</div>
                          )}
                        </div>
                      </div>

                      {/* Acknowledgments */}
                      {acknowledged.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {acknowledged.map((ack: any, i: number) => (
                            <span key={i} className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-white/40">
                              ✓ {ack.name || `Staff #${ack.staffId}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="px-4 py-2 bg-white/[0.02] border-t border-white/5 flex gap-2">
                      {staffUser && (
                        <button
                          onClick={() => acknowledgeBroadcast.mutate({ broadcastId: b.id, staffId: staffUser.id })}
                          className="flex-1 bg-white/5 hover:bg-white/10 rounded-lg py-2 text-xs font-medium transition-colors"
                        >
                          ✓ Acknowledge
                        </button>
                      )}
                      <button
                        onClick={() => resolveBroadcast.mutate({ broadcastId: b.id })}
                        className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-lg py-2 text-xs font-medium transition-colors"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === 'create' && (
          <div className="space-y-4">
            {/* Broadcast Type */}
            <div>
              <label className="text-xs font-semibold text-white/40 mb-2 block">Type</label>
              <div className="grid grid-cols-3 gap-2">
                {BROADCAST_TYPES.map(t => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.value}
                      onClick={() => setBroadcastType(t.value)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        broadcastType === t.value
                          ? `${t.value === '86d' ? 'bg-red-600/20 border-red-500/40' : t.value === 'un86d' ? 'bg-emerald-600/20 border-emerald-500/40' : 'bg-amber-600/20 border-amber-500/40'}`
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mx-auto ${t.color}`} />
                      <div className="text-xs font-bold mt-1">{t.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Item Name */}
            <div>
              <label className="text-xs font-semibold text-white/40 mb-2 block">Item Name</label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm"
                placeholder="e.g., Wings, Bud Light, Tater Tots"
                value={itemName}
                onChange={e => setItemName(e.target.value)}
              />
            </div>

            {/* Message */}
            <div>
              <label className="text-xs font-semibold text-white/40 mb-2 block">Message (optional)</label>
              <textarea
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm resize-none"
                rows={2}
                placeholder="Additional details..."
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
            </div>

            {/* From Station */}
            <div>
              <label className="text-xs font-semibold text-white/40 mb-2 block">From Station</label>
              <div className="flex gap-2 flex-wrap">
                {STATIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => setFromStation(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                      fromStation === s ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/40'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Stations */}
            <div>
              <label className="text-xs font-semibold text-white/40 mb-2 block">Notify Stations</label>
              <div className="flex gap-2 flex-wrap">
                {STATIONS.filter(s => s !== fromStation).map(s => (
                  <button
                    key={s}
                    onClick={() => toggleStation(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                      targetStations.includes(s) ? 'bg-red-600 text-white' : 'bg-white/5 text-white/40'
                    }`}
                  >
                    {targetStations.includes(s) ? '✓ ' : ''}{s}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                if (!itemName) return;
                createBroadcast.mutate({
                  broadcastType,
                  itemName,
                  message: message || undefined,
                  fromStation,
                  targetStations,
                  createdByStaffId: staffUser?.id,
                  createdByName: staffUser?.name,
                });
              }}
              disabled={createBroadcast.isPending || !itemName}
              className={`w-full rounded-xl py-3.5 text-sm font-bold transition-colors ${
                broadcastType === '86d'
                  ? 'bg-red-600 hover:bg-red-500'
                  : broadcastType === 'un86d'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-amber-600 hover:bg-amber-500'
              } disabled:opacity-50`}
            >
              {createBroadcast.isPending ? 'Broadcasting...' : `Broadcast ${getTypeConfig(broadcastType).label}`}
            </button>
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-2">
            {broadcastHistory.isLoading ? (
              <div className="text-center py-10 text-white/30">Loading...</div>
            ) : (broadcastHistory.data?.length || 0) === 0 ? (
              <div className="text-center py-10 text-white/30 text-sm">No broadcast history</div>
            ) : (
              broadcastHistory.data?.map((b: any) => {
                const typeConfig = getTypeConfig(b.broadcastType);
                return (
                  <div key={b.id} className="bg-white/5 rounded-xl px-4 py-3 border border-white/5 flex items-center gap-3">
                    <typeConfig.icon className={`w-5 h-5 flex-shrink-0 ${typeConfig.color} ${b.status === 'resolved' ? 'opacity-40' : ''}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {b.itemName}
                        {b.status === 'resolved' && <span className="text-[10px] text-emerald-400 ml-2">RESOLVED</span>}
                      </div>
                      <div className="text-[10px] text-white/30">
                        {b.fromStation} → {b.targetStations ? JSON.parse(b.targetStations).join(', ') : 'all'} · {formatTime(b.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
