import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Package, TrendingUp, TrendingDown, AlertTriangle, Plus, Search, Filter } from "lucide-react";

interface SKUTrackerScreenProps {
  onBack: () => void;
  staffUser?: { id: number; name: string; role: string } | null;
}

type Tab = 'catalog' | 'price-alerts' | 'compare' | 'wow' | 'add';

export default function SKUTrackerScreen({ onBack }: SKUTrackerScreenProps) {
  const [tab, setTab] = useState<Tab>('catalog');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [vendorFilter, setVendorFilter] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');

  // Add SKU form
  const [newSku, setNewSku] = useState({
    productName: '', vendorName: '', vendorSku: '', category: 'food',
    unitSize: '', unitOfMeasure: 'ea', currentPrice: '', caseSize: '',
  });

  const skus = trpc.skus.list.useQuery();
  const priceAlerts = trpc.priceAlerts.pending.useQuery();
  const utils = trpc.useUtils();

  const createSku = trpc.skus.create.useMutation({
    onSuccess: () => {
      utils.skus.list.invalidate();
      setNewSku({ productName: '', vendorName: '', vendorSku: '', category: 'food', unitSize: '', unitOfMeasure: 'ea', currentPrice: '', caseSize: '' });
      setTab('catalog');
    },
  });
  const reviewAlert = trpc.priceAlerts.review.useMutation({
    onSuccess: () => utils.priceAlerts.pending.invalidate(),
  });
  const scanPrices = trpc.priceAlerts.scan.useMutation({
    onSuccess: () => utils.priceAlerts.pending.invalidate(),
  });

  const formatCurrency = (n: string | number | null) => {
    const val = typeof n === 'string' ? parseFloat(n) : (n || 0);
    return `$${val.toFixed(2)}`;
  };

  // Filter SKUs
  const filteredSkus = (skus.data || []).filter((s: any) => {
    if (categoryFilter && s.category !== categoryFilter) return false;
    if (vendorFilter && s.vendorName !== vendorFilter) return false;
    if (searchTerm && !s.productName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Get unique vendors and categories
  const vendors = Array.from(new Set((skus.data || []).map((s: any) => s.vendorName))).filter(Boolean);
  const categories = Array.from(new Set((skus.data || []).map((s: any) => s.category))).filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-900/80 to-cyan-900/80 border-b border-slate-200">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/10 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Package className="w-5 h-5 text-teal-400" />
              SKU Tracker
            </h1>
            <p className="text-xs text-slate-500">Products, prices, vendor comparison</p>
          </div>
          <button
            onClick={() => scanPrices.mutate()}
            disabled={scanPrices.isPending}
            className="px-3 py-1.5 bg-teal-600/20 text-teal-300 rounded-lg text-xs font-medium hover:bg-teal-600/30 transition-colors"
          >
            {scanPrices.isPending ? 'Scanning...' : 'Scan Prices'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {[
          { key: 'catalog' as Tab, label: 'Catalog' },
          { key: 'price-alerts' as Tab, label: 'Price Alerts', count: (priceAlerts.data || []).filter((a: any) => a.status === 'pending').length },
          { key: 'compare' as Tab, label: 'Compare' },
          { key: 'wow' as Tab, label: 'WoW Δ' },
          { key: 'add' as Tab, label: '+ Add' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
              tab === t.key ? 'text-teal-400 border-b-2 border-teal-400' : 'text-slate-400'
            }`}
          >
            {t.label}
            {'count' in t && (t.count ?? 0) > 0 && (
              <span className="bg-amber-500 text-slate-900 text-[9px] px-1.5 py-0.5 rounded-full font-bold">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        {tab === 'catalog' && (
          <div className="space-y-3">
            {/* Search & Filters */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-900/30" />
                <input
                  className="w-full bg-white/5 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Category pills */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setCategoryFilter(undefined)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${!categoryFilter ? 'bg-teal-600 text-slate-900' : 'bg-white/5 text-slate-400'}`}
              >
                All
              </button>
              {categories.map(c => (
                <button
                  key={c as string}
                  onClick={() => setCategoryFilter(c as string)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium capitalize ${categoryFilter === c ? 'bg-teal-600 text-slate-900' : 'bg-white/5 text-slate-400'}`}
                >
                  {c as string}
                </button>
              ))}
            </div>

            {/* Vendor pills */}
            {vendors.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                <Filter className="w-3 h-3 text-slate-900/20 flex-shrink-0 mt-1" />
                <button
                  onClick={() => setVendorFilter(undefined)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${!vendorFilter ? 'bg-white/10 text-slate-500' : 'bg-white/5 text-slate-900/30'}`}
                >
                  All vendors
                </button>
                {vendors.map(v => (
                  <button
                    key={v as string}
                    onClick={() => setVendorFilter(v as string)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${vendorFilter === v ? 'bg-white/10 text-slate-500' : 'bg-white/5 text-slate-900/30'}`}
                  >
                    {v as string}
                  </button>
                ))}
              </div>
            )}

            {/* SKU List */}
            {skus.isLoading ? (
              <div className="text-center py-10 text-slate-900/30">Loading...</div>
            ) : filteredSkus.length === 0 ? (
              <div className="text-center py-10">
                <Package className="w-12 h-12 text-slate-900/10 mx-auto mb-3" />
                <p className="text-slate-900/30 text-sm">No products found</p>
                <button onClick={() => setTab('add')} className="mt-3 text-teal-400 text-sm font-medium">+ Add product</button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSkus.map((s: any) => (
                  <div key={s.id} className="bg-white/5 rounded-xl px-4 py-3 border border-slate-200 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{s.productName}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-900/30">{s.vendorName}</span>
                        {s.vendorSku && <span className="text-[10px] text-slate-900/20">SKU: {s.vendorSku}</span>}
                        {s.unitSize && <span className="text-[10px] text-slate-900/20">{s.unitSize} {s.unitOfMeasure}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{formatCurrency(s.currentPrice)}</div>
                      <div className="text-[10px] text-slate-900/30 capitalize">{s.category}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'price-alerts' && (
          <div className="space-y-3">
            {priceAlerts.isLoading ? (
              <div className="text-center py-10 text-slate-900/30">Loading...</div>
            ) : (priceAlerts.data?.length || 0) === 0 ? (
              <div className="text-center py-10">
                <AlertTriangle className="w-12 h-12 text-slate-900/10 mx-auto mb-3" />
                <p className="text-slate-900/30 text-sm">No price alerts</p>
                <p className="text-slate-900/20 text-xs mt-1">Run "Scan Prices" to check for changes</p>
              </div>
            ) : (
              priceAlerts.data?.map((alert: any) => {
                const oldPrice = parseFloat(alert.oldPrice || '0');
                const newPrice = parseFloat(alert.newPrice || '0');
                const changePct = parseFloat(alert.changePercent || '0');
                const isIncrease = newPrice > oldPrice;

                return (
                  <div key={alert.id} className={`rounded-2xl border overflow-hidden ${
                    alert.status === 'pending'
                      ? isIncrease ? 'bg-red-900/20 border-red-500/20' : 'bg-emerald-900/20 border-emerald-500/20'
                      : 'bg-white/5 border-slate-200 opacity-60'
                  }`}>
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {isIncrease ? (
                          <TrendingUp className="w-5 h-5 text-red-400 flex-shrink-0" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{alert.productName}</div>
                          <div className="text-[10px] text-slate-900/30">{alert.vendorName}</div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 line-through">{formatCurrency(oldPrice)}</span>
                            <span className={`text-sm font-bold ${isIncrease ? 'text-red-400' : 'text-emerald-400'}`}>
                              {formatCurrency(newPrice)}
                            </span>
                          </div>
                          <div className={`text-[10px] font-medium ${isIncrease ? 'text-red-400' : 'text-emerald-400'}`}>
                            {isIncrease ? '+' : ''}{changePct.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>
                    {alert.status === 'pending' && (
                      <div className="px-4 py-2 bg-white/[0.02] border-t border-slate-200 flex gap-2">
                        <button
                          onClick={() => reviewAlert.mutate({ id: alert.id, reviewedBy: 0, notes: 'acknowledged' })}
                          className="flex-1 bg-white/5 hover:bg-white/10 rounded-lg py-1.5 text-xs font-medium"
                        >
                          Acknowledge
                        </button>
                        <button
                          onClick={() => reviewAlert.mutate({ id: alert.id, reviewedBy: 0, notes: 'dismissed' })}
                          className="bg-white/5 hover:bg-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-400"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === 'compare' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-teal-900/30 to-cyan-900/30 rounded-2xl p-5 border border-teal-500/20 text-center">
              <Package className="w-10 h-10 text-teal-400/40 mx-auto mb-2" />
              <h3 className="text-sm font-bold">Cross-Vendor Price Comparison</h3>
              <p className="text-xs text-slate-400 mt-1">
                Products from multiple vendors are compared automatically. Check the Price Alerts tab for flagged changes.
              </p>
              <p className="text-xs text-slate-900/30 mt-2">
                As you add more SKUs from different vendors (Sawyer's, Hughes, Fort Dodge, Confluence), the system will identify where you can save money by switching vendors.
              </p>
            </div>

            {/* Show products available from multiple vendors */}
            {skus.data && (() => {
              const byProduct: Record<string, any[]> = {};
              (skus.data as any[]).forEach((s: any) => {
                const key = s.productName.toLowerCase();
                if (!byProduct[key]) byProduct[key] = [];
                byProduct[key].push(s);
              });
              const multiVendor = Object.entries(byProduct).filter(([, items]) => items.length > 1);

              if (multiVendor.length === 0) {
                return (
                  <div className="text-center py-6 text-slate-900/30 text-xs">
                    No products found from multiple vendors yet. Add the same product from different vendors to compare.
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {multiVendor.map(([name, items]) => {
                    const sorted = items.sort((a: any, b: any) => parseFloat(a.currentPrice || '0') - parseFloat(b.currentPrice || '0'));
                    return (
                      <div key={name} className="bg-white/5 rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-4 py-2 border-b border-slate-200">
                          <span className="text-sm font-bold capitalize">{name}</span>
                        </div>
                        <div className="divide-y divide-white/5">
                          {sorted.map((s: any, i: number) => (
                            <div key={s.id} className={`px-4 py-2 flex items-center justify-between ${i === 0 ? 'bg-emerald-500/5' : ''}`}>
                              <div>
                                <span className="text-xs">{s.vendorName}</span>
                                {i === 0 && <span className="text-[10px] text-emerald-400 ml-2">BEST PRICE</span>}
                              </div>
                              <span className={`text-sm font-bold ${i === 0 ? 'text-emerald-400' : ''}`}>
                                {formatCurrency(s.currentPrice)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {tab === 'wow' && (() => {
          const wow = trpc.skus.weekOverWeek.useQuery();
          const items = (wow.data || []) as any[];
          const movers = items.filter((i: any) => i.direction !== 'stable');
          const stable = items.filter((i: any) => i.direction === 'stable');
          return (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-amber-900/30 to-orange-900/30 rounded-2xl p-4 border border-amber-500/20">
                <h3 className="text-sm font-bold">Week-over-Week Price Changes</h3>
                <p className="text-xs text-slate-400 mt-1">Compares this week's average price vs last week for all tracked SKUs</p>
                <div className="flex gap-4 mt-3">
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-400">{movers.filter((m: any) => m.direction === 'up').length}</div>
                    <div className="text-[10px] text-slate-900/30">Price Up</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-emerald-400">{movers.filter((m: any) => m.direction === 'down').length}</div>
                    <div className="text-[10px] text-slate-900/30">Price Down</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-slate-400">{stable.length}</div>
                    <div className="text-[10px] text-slate-900/30">Stable</div>
                  </div>
                </div>
              </div>
              {wow.isLoading && <div className="text-center py-8 text-slate-900/30 text-xs">Loading price data...</div>}
              {movers.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase">Price Movers</h4>
                  {movers.map((item: any) => (
                    <div key={item.skuId} className={`bg-white/5 rounded-xl p-3 border ${item.direction === 'up' ? 'border-red-500/20' : 'border-emerald-500/20'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold">{item.productName}</div>
                          <div className="text-[10px] text-slate-900/30">{item.vendorName} {item.unitSize ? `· ${item.unitSize}` : ''}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-bold flex items-center gap-1 ${item.direction === 'up' ? 'text-red-400' : 'text-emerald-400'}`}>
                            {item.direction === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {item.deltaPct > 0 ? '+' : ''}{item.deltaPct}%
                          </div>
                          <div className="text-[10px] text-slate-900/30">
                            ${item.priorWeekAvg.toFixed(2)} → ${item.currentWeekAvg.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {stable.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase">Stable Prices ({stable.length})</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {stable.slice(0, 10).map((item: any) => (
                      <div key={item.skuId} className="bg-white/5 rounded-lg p-2 text-xs">
                        <div className="font-medium truncate">{item.productName}</div>
                        <div className="text-slate-900/30">{item.vendorName} · ${item.currentWeekAvg.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!wow.isLoading && items.length === 0 && (
                <div className="text-center py-8 text-slate-900/30 text-xs">No price history data yet. Add SKUs and log prices from invoices to see week-over-week trends.</div>
              )}
            </div>
          );
        })()}

        {tab === 'add' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold">Add Product SKU</h3>
            <input
              className="w-full bg-white/5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
              placeholder="Product name"
              value={newSku.productName}
              onChange={e => setNewSku(p => ({ ...p, productName: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                className="bg-white/5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
                placeholder="Vendor name"
                value={newSku.vendorName}
                onChange={e => setNewSku(p => ({ ...p, vendorName: e.target.value }))}
              />
              <input
                className="bg-white/5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
                placeholder="Vendor SKU #"
                value={newSku.vendorSku}
                onChange={e => setNewSku(p => ({ ...p, vendorSku: e.target.value }))}
              />
            </div>
            <select
              className="w-full bg-white/5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
              value={newSku.category}
              onChange={e => setNewSku(p => ({ ...p, category: e.target.value }))}
            >
              <option value="food">Food</option>
              <option value="beer">Beer</option>
              <option value="liquor">Liquor</option>
              <option value="pop">Pop</option>
              <option value="supplies">Supplies</option>
              <option value="paper">Paper Goods</option>
            </select>
            <div className="grid grid-cols-3 gap-3">
              <input
                className="bg-white/5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
                placeholder="Unit size"
                value={newSku.unitSize}
                onChange={e => setNewSku(p => ({ ...p, unitSize: e.target.value }))}
              />
              <select
                className="bg-white/5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
                value={newSku.unitOfMeasure}
                onChange={e => setNewSku(p => ({ ...p, unitOfMeasure: e.target.value }))}
              >
                <option value="ea">Each</option>
                <option value="lb">Pound</option>
                <option value="oz">Ounce</option>
                <option value="gal">Gallon</option>
                <option value="case">Case</option>
              </select>
              <input
                className="bg-white/5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
                placeholder="Case size"
                value={newSku.caseSize}
                onChange={e => setNewSku(p => ({ ...p, caseSize: e.target.value }))}
              />
            </div>
            <input
              className="w-full bg-white/5 border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
              placeholder="Current price ($)"
              value={newSku.currentPrice}
              onChange={e => setNewSku(p => ({ ...p, currentPrice: e.target.value }))}
            />
            <button
              onClick={() => {
                if (!newSku.productName || !newSku.vendorName) return;
                createSku.mutate(newSku);
              }}
              disabled={createSku.isPending || !newSku.productName}
              className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-50 rounded-xl py-3 text-sm font-bold transition-colors"
            >
              {createSku.isPending ? 'Adding...' : 'Add Product'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
