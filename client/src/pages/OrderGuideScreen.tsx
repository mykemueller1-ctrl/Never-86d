/**
 * Order Guide Screen — Dynamic vendor product browser with price intelligence
 * 
 * Manager-only. Shows vendor products grouped by vendor with:
 * - Price change indicators (up/down/new) from OCR pipeline
 * - Par level tracking with AI-powered suggestions
 * - Category filtering
 * - Tom's food guide (PFG/Sysco/Sawyer's) and Ashley's bar guide (Hy-Vee/distributors)
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  ChevronLeft, TrendingUp, TrendingDown, Minus,
  Package, Search, Loader2, AlertTriangle,
  Sparkles, ShoppingCart, ArrowUpDown, BarChart3
} from "lucide-react";
import type { SafeStaff } from "../../../shared/types";

type Props = {
  staffUser: SafeStaff;
  onBack: () => void;
};

const VENDOR_GROUPS = {
  food: {
    label: "Food & Supplies",
    desc: "Tom's Order Guide",
    vendors: ["Sawyer's Meats", "PFG/RFS", "Sysco", "Fareway", "Hy-Vee"],
    color: "amber",
  },
  bar: {
    label: "Bar & Beverage",
    desc: "Ashley's Order Guide",
    vendors: ["Hughes Distributing", "Fort Dodge Distributing", "Confluence Brewing"],
    color: "purple",
  },
  other: {
    label: "Other Vendors",
    desc: "Misc supplies",
    vendors: ["Dollar General"],
    color: "zinc",
  },
};

type VendorGroup = keyof typeof VENDOR_GROUPS;
type ViewMode = "products" | "par-suggestions";

function PriceChangeIndicator({ changePercent }: { changePercent: string | null }) {
  if (!changePercent) return null;
  const pct = parseFloat(changePercent);
  if (Math.abs(pct) < 0.5) return (
    <span className="flex items-center gap-0.5 text-zinc-500 text-[9px]">
      <Minus size={8} /> flat
    </span>
  );
  if (pct > 0) return (
    <span className="flex items-center gap-0.5 text-red-400 text-[9px] font-semibold">
      <TrendingUp size={10} /> +{pct.toFixed(1)}%
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-green-400 text-[9px] font-semibold">
      <TrendingDown size={10} /> {pct.toFixed(1)}%
    </span>
  );
}

function ParLevelBar({ current, par }: { current?: number; par?: number | null }) {
  if (!par) return null;
  return (
    <div className="flex items-center gap-1">
      <span className="text-zinc-500 text-[9px]">Par: {par}</span>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: "high" | "medium" | "low" }) {
  const colors = {
    high: "bg-green-500/10 text-green-400 border-green-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    low: "bg-zinc-700/30 text-zinc-400 border-zinc-700/40",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[7px] font-bold border ${colors[confidence]}`}>
      {confidence.toUpperCase()}
    </span>
  );
}

function ParSuggestionsView() {
  const suggestionsQuery = trpc.vendorProducts.parSuggestions.useQuery(undefined, { staleTime: 60_000 });
  const suggestions = suggestionsQuery.data || [];

  // Only show items where suggestion differs from current par
  const actionable = useMemo(() => {
    return suggestions.filter(s => s.suggestedPar !== s.currentPar);
  }, [suggestions]);

  const aligned = useMemo(() => {
    return suggestions.filter(s => s.suggestedPar === s.currentPar && s.confidence === "high");
  }, [suggestions]);

  if (suggestionsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="text-amber-500 animate-spin" />
        <span className="text-zinc-500 text-xs ml-2">Analyzing sales patterns...</span>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-12">
        <BarChart3 size={32} className="text-zinc-700 mx-auto mb-3" />
        <p className="text-zinc-500 text-sm">No par level data yet</p>
        <p className="text-zinc-600 text-xs mt-1">Par suggestions appear after invoice scans populate vendor products</p>
      </div>
    );
  }

  return (
    <div className="px-3 space-y-3">
      {/* Summary */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={14} className="text-amber-400" />
          <span className="text-white text-xs font-bold">Par Level Intelligence</span>
        </div>
        <p className="text-zinc-400 text-[10px] leading-relaxed">
          Based on {suggestions.length} products analyzed against 196 days of sales data.
          Peak day patterns, category velocity, and order frequency are factored in.
        </p>
        <div className="flex gap-3 mt-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-zinc-400 text-[9px]">{actionable.length} adjustments suggested</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-zinc-400 text-[9px]">{aligned.length} on target</span>
          </div>
        </div>
      </div>

      {/* Actionable Suggestions */}
      {actionable.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-amber-500/20 overflow-hidden">
          <div className="p-3 border-b border-zinc-800 flex items-center gap-2">
            <ArrowUpDown size={12} className="text-amber-400" />
            <span className="text-amber-400 text-xs font-bold">Suggested Adjustments</span>
            <span className="text-zinc-500 text-[9px]">({actionable.length})</span>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {actionable.map(item => {
              const isIncrease = item.suggestedPar > item.currentPar;
              return (
                <div key={item.id} className="px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white text-xs font-medium truncate">{item.productName}</span>
                        <ConfidenceBadge confidence={item.confidence} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-zinc-500 text-[9px]">{item.vendorName}</span>
                        <span className="text-zinc-600 text-[9px]">· {(item.category || "").replace(/_/g, " ")}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-500 text-xs">{item.currentPar}</span>
                        <span className={`text-xs font-bold ${isIncrease ? 'text-amber-400' : 'text-blue-400'}`}>
                          → {item.suggestedPar}
                        </span>
                      </div>
                      {item.lastPrice && (
                        <span className="text-zinc-600 text-[8px]">${parseFloat(item.lastPrice).toFixed(2)}/{item.unit || "ea"}</span>
                      )}
                    </div>
                  </div>
                  <p className="text-zinc-500 text-[9px] mt-1 leading-relaxed">{item.reason}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* On-Target Items */}
      {aligned.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-green-500/10 overflow-hidden">
          <div className="p-3 border-b border-zinc-800 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-green-400 text-xs font-bold">On Target</span>
            <span className="text-zinc-500 text-[9px]">({aligned.length} products)</span>
          </div>
          <div className="px-3 py-2">
            <div className="flex flex-wrap gap-1">
              {aligned.slice(0, 12).map(item => (
                <span key={item.id} className="px-2 py-1 rounded-lg bg-zinc-800 text-zinc-400 text-[9px]">
                  {item.productName} <span className="text-green-400/60">✓</span>
                </span>
              ))}
              {aligned.length > 12 && (
                <span className="px-2 py-1 rounded-lg bg-zinc-800 text-zinc-500 text-[9px]">
                  +{aligned.length - 12} more
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrderGuideScreen({ staffUser, onBack }: Props) {
  const [activeGroup, setActiveGroup] = useState<VendorGroup>("food");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("products");

  const productsQuery = trpc.vendorProducts.list.useQuery(undefined, { staleTime: 30_000 });
  const allProducts = productsQuery.data || [];

  const groupConfig = VENDOR_GROUPS[activeGroup];
  const vendorSet = new Set(groupConfig.vendors);

  // Filter products by vendor group, search, and category
  const filteredProducts = useMemo(() => {
    let products = allProducts.filter(p => vendorSet.has(p.vendorName));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      products = products.filter(p =>
        p.productName.toLowerCase().includes(q) ||
        p.vendorName.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }
    if (categoryFilter) {
      products = products.filter(p => p.category === categoryFilter);
    }
    return products;
  }, [allProducts, activeGroup, searchQuery, categoryFilter]);

  // Group by vendor
  const byVendor = useMemo(() => {
    const map = new Map<string, typeof filteredProducts>();
    for (const p of filteredProducts) {
      const list = map.get(p.vendorName) || [];
      list.push(p);
      map.set(p.vendorName, list);
    }
    return Array.from(map.entries());
  }, [filteredProducts]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set(allProducts.filter(p => vendorSet.has(p.vendorName)).map(p => p.category));
    return Array.from(cats).sort();
  }, [allProducts, activeGroup]);

  // Price alert count — products with >5% increase
  const priceAlerts = useMemo(() => {
    return allProducts.filter(p =>
      vendorSet.has(p.vendorName) &&
      p.priceChangePercent &&
      parseFloat(p.priceChangePercent) > 5
    ).length;
  }, [allProducts, activeGroup]);

  return (
    <div className="h-screen bg-black flex flex-col overflow-y-auto pb-20">
      {/* Header */}
      <div className="p-3 border-b border-zinc-900 flex items-center gap-2">
        <button onClick={onBack} className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center">
          <ChevronLeft size={14} className="text-zinc-400" />
        </button>
        <div className="flex-1">
          <h2 className="text-white font-black text-sm" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.04em" }}>
            ORDER GUIDES
          </h2>
          <p className="text-zinc-500 text-[9px]">
            {viewMode === "products"
              ? `${filteredProducts.length} products · ${byVendor.length} vendors`
              : "AI-powered par level analysis"}
          </p>
        </div>
        {priceAlerts > 0 && viewMode === "products" && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={10} className="text-red-400" />
            <span className="text-red-400 text-[9px] font-bold">{priceAlerts} price alerts</span>
          </div>
        )}
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-1 px-3 py-2 border-b border-zinc-900">
        <button
          onClick={() => setViewMode("products")}
          className={`flex-1 py-2 px-3 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 ${
            viewMode === "products"
              ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-500'
          }`}
        >
          <ShoppingCart size={12} />
          <span className="text-[10px] font-bold">Products</span>
        </button>
        <button
          onClick={() => setViewMode("par-suggestions")}
          className={`flex-1 py-2 px-3 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 ${
            viewMode === "par-suggestions"
              ? 'bg-purple-500/20 border border-purple-500/40 text-purple-400'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-500'
          }`}
        >
          <Sparkles size={12} />
          <span className="text-[10px] font-bold">Par Suggestions</span>
        </button>
      </div>

      {viewMode === "par-suggestions" ? (
        <ParSuggestionsView />
      ) : (
        <>
          {/* Group Tabs */}
          <div className="flex gap-1 px-3 py-2 border-b border-zinc-900">
            {(Object.entries(VENDOR_GROUPS) as [VendorGroup, typeof VENDOR_GROUPS.food][]).map(([key, group]) => (
              <button
                key={key}
                onClick={() => { setActiveGroup(key); setCategoryFilter(null); }}
                className={`flex-1 py-2 px-2 rounded-lg text-center transition-all ${
                  activeGroup === key
                    ? `bg-${group.color}-500/20 border border-${group.color}-500/40 text-${group.color}-400`
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-500'
                }`}
              >
                <span className="text-[10px] font-bold block">{group.label}</span>
                <span className="text-[8px] opacity-60">{group.desc}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="px-3 py-2">
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 pl-8 pr-3 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          {categories.length > 1 && (
            <div className="flex gap-1 px-3 pb-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setCategoryFilter(null)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[9px] font-medium transition-all ${
                  !categoryFilter ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                }`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[9px] font-medium capitalize transition-all ${
                    categoryFilter === cat ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                  }`}
                >
                  {cat.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          )}

          {/* Product List */}
          <div className="px-3 space-y-3 flex-1">
            {productsQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="text-amber-500 animate-spin" />
              </div>
            ) : byVendor.length === 0 ? (
              <div className="text-center py-12">
                <Package size={32} className="text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">No products found</p>
                <p className="text-zinc-600 text-xs mt-1">Products appear here after invoice OCR scans</p>
              </div>
            ) : (
              byVendor.map(([vendor, products]) => (
                <div key={vendor} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                  {/* Vendor Header */}
                  <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-bold text-sm">{vendor}</h3>
                      <p className="text-zinc-500 text-[9px]">{products.length} products</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {products.some(p => p.priceChangePercent && parseFloat(p.priceChangePercent) > 5) && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 text-[8px] font-bold">
                          <TrendingUp size={8} /> Price alerts
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Product Rows */}
                  <div className="divide-y divide-zinc-800/50">
                    {products.map(product => (
                      <div key={product.id} className="px-3 py-2.5 flex items-center gap-3">
                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-white text-xs font-medium truncate">{product.productName}</span>
                            {!product.previousPrice && product.lastPrice && (
                              <span className="shrink-0 px-1 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[7px] font-bold">NEW</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-zinc-500 text-[9px] capitalize">{product.category.replace(/_/g, " ")}</span>
                            {product.unit && <span className="text-zinc-600 text-[9px]">· {product.unit}</span>}
                            <ParLevelBar par={product.parLevel} />
                          </div>
                        </div>

                        {/* Price Column */}
                        <div className="text-right shrink-0">
                          {product.lastPrice ? (
                            <>
                              <span className="text-white text-sm font-bold">${parseFloat(product.lastPrice).toFixed(2)}</span>
                              {product.unit && <span className="text-zinc-500 text-[8px] block">/{product.unit}</span>}
                              <PriceChangeIndicator changePercent={product.priceChangePercent} />
                              {product.previousPrice && (
                                <span className="text-zinc-600 text-[8px] line-through block">
                                  ${parseFloat(product.previousPrice).toFixed(2)}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-zinc-600 text-xs">No price</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
