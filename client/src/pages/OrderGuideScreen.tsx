/**
 * Order Guide Screen — Dynamic vendor product browser with price intelligence
 * 
 * Manager-only. Shows vendor products grouped by vendor with:
 * - Price change indicators (up/down/new) from OCR pipeline
 * - Par level tracking
 * - Category filtering
 * - Tom's food guide (PFG/Sysco/Sawyer's) and Ashley's bar guide (Hy-Vee/distributors)
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  ChevronLeft, TrendingUp, TrendingDown, Minus,
  Package, Search, Filter, Loader2, AlertTriangle,
  Sparkles, ShoppingCart
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
  // Without actual inventory count, show par level as target
  return (
    <div className="flex items-center gap-1">
      <span className="text-zinc-500 text-[9px]">Par: {par}</span>
    </div>
  );
}

export default function OrderGuideScreen({ staffUser, onBack }: Props) {
  const [activeGroup, setActiveGroup] = useState<VendorGroup>("food");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

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
          <p className="text-zinc-500 text-[9px]">{filteredProducts.length} products · {byVendor.length} vendors</p>
        </div>
        {priceAlerts > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={10} className="text-red-400" />
            <span className="text-red-400 text-[9px] font-bold">{priceAlerts} price alerts</span>
          </div>
        )}
      </div>

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
    </div>
  );
}
