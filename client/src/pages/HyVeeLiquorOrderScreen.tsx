import { ChevronLeft, Lock, Mail, ClipboardCopy, Minus, Plus, Send, Loader2, Database, Wine, DollarSign } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { SafeStaff } from "../../../shared/types";

type Props = {
  staffUser: SafeStaff;
  onBack: () => void;
};

type ProductCategory = "liquor" | "wine" | "soda";
type ProductSource = "invoice_16484" | "email_order_2026_05_26";

type HyVeeProduct = {
  sku: string;
  productName: string;
  size: string;
  category: ProductCategory;
  lastPrice: string | null;
  parLevel: number;
  source: ProductSource;
};

const MANAGER_ROLES = ["owner", "key_manager", "kitchen_manager", "bar_manager"];
const VENDOR_NAME = "Hy-Vee Wine & Spirits";
const ORDER_EMAIL = "1192winespiritsmgr@hy-vee.com";
const FROM_EMAIL = "communitypizza2026@gmail.com";
const LAST_INVOICE_NUMBER = "16484";
const LAST_INVOICE_TOTAL_COUNT = 63;

function isManagerOrOwner(staffUser: SafeStaff | null): boolean {
  return !!staffUser && MANAGER_ROLES.includes(staffUser.jobRole);
}

const HYVEE_PRODUCTS: HyVeeProduct[] = [
  { sku: "10807", productName: "Crown Royal Regal Apple", size: "750 ml", category: "liquor", lastPrice: "28.62", parLevel: 4, source: "invoice_16484" },
  { sku: "11297", productName: "Crown Royal Canadian Whisky", size: "1 L", category: "liquor", lastPrice: "33.53", parLevel: 1, source: "invoice_16484" },
  { sku: "11777", productName: "Black Velvet", size: "1 L", category: "liquor", lastPrice: "11.47", parLevel: 3, source: "invoice_16484" },
  { sku: "15627", productName: "Jameson", size: "1 L", category: "liquor", lastPrice: "34.32", parLevel: 1, source: "invoice_16484" },
  { sku: "25607", productName: "Seagrams 7 Crown Bl Whiskey", size: "1 L", category: "liquor", lastPrice: "12.27", parLevel: 1, source: "invoice_16484" },
  { sku: "26827", productName: "Jack Daniels Old #7 Black Lbl", size: "1 L", category: "liquor", lastPrice: "33.17", parLevel: 1, source: "invoice_16484" },
  { sku: "36307", productName: "Hawkeye Vodka", size: "1 L", category: "liquor", lastPrice: "33.17", parLevel: 8, source: "invoice_16484" },
  { sku: "38177", productName: "Tito's Handmade Vodka", size: "1 L", category: "liquor", lastPrice: "7.14", parLevel: 9, source: "invoice_16484" },
  { sku: "41694", productName: "UV Blue Raspberry Vodka", size: "1 L", category: "liquor", lastPrice: "21.56", parLevel: 1, source: "invoice_16484" },
  { sku: "42717", productName: "Malibu Coconut Rum", size: "1 L", category: "liquor", lastPrice: "12.28", parLevel: 2, source: "invoice_16484" },
  { sku: "43127", productName: "Bacardi Superior Rum", size: "1 L", category: "liquor", lastPrice: "18.81", parLevel: 1, source: "invoice_16484" },
  { sku: "43337", productName: "Captain Morgan Spiced Rum", size: "1 L", category: "liquor", lastPrice: "15.55", parLevel: 8, source: "invoice_16484" },
  { sku: "46351", productName: "Hawkeye Light Rum", size: "1 L", category: "liquor", lastPrice: "21.27", parLevel: 1, source: "invoice_16484" },
  { sku: "64904", productName: "Fireball PET", size: "1.75 L", category: "liquor", lastPrice: "7.38", parLevel: 3, source: "invoice_16484" },
  { sku: "65257", productName: "Jagermeister Liqueur", size: "1 L", category: "liquor", lastPrice: "26.18", parLevel: 2, source: "invoice_16484" },
  { sku: "65427", productName: "Licor 43 Original Liqueur", size: "1 L", category: "liquor", lastPrice: "28.50", parLevel: 4, source: "invoice_16484" },
  { sku: "67527", productName: "Kahlua Coffee Liqueur", size: "1 L", category: "liquor", lastPrice: "31.89", parLevel: 1, source: "invoice_16484" },
  { sku: "69637", productName: "Dr. McGillicuddy's Cherry Schnapps", size: "1 L", category: "liquor", lastPrice: "18.42", parLevel: 1, source: "invoice_16484" },
  { sku: "76501", productName: "The Original Pickle Shot Dill Pickle Vodka", size: "750 ml", category: "liquor", lastPrice: "13.66", parLevel: 1, source: "invoice_16484" },
  { sku: "76843", productName: "The Original Pickle Shot Spicy Pickle Vodka", size: "750 ml", category: "liquor", lastPrice: "13.66", parLevel: 1, source: "invoice_16484" },
  { sku: "77709", productName: "Smirnoff Peach", size: "750 ml", category: "liquor", lastPrice: "13.52", parLevel: 2, source: "invoice_16484" },
  { sku: "77847", productName: "Smirnoff Vanilla", size: "750 ml", category: "liquor", lastPrice: "13.52", parLevel: 1, source: "invoice_16484" },
  { sku: "81208", productName: "Paramount Peppermint Schnapps", size: "1.75 L", category: "liquor", lastPrice: "13.10", parLevel: 2, source: "invoice_16484" },
  { sku: "82847", productName: "Dekuyper Peachtree", size: "1 L", category: "liquor", lastPrice: "12.89", parLevel: 1, source: "invoice_16484" },
  { sku: "82867", productName: "Dekuyper Watermelon Pucker", size: "1 L", category: "liquor", lastPrice: "12.89", parLevel: 1, source: "invoice_16484" },
  { sku: "86251", productName: "Juarez Triple Sec", size: "1 L", category: "liquor", lastPrice: "4.11", parLevel: 1, source: "invoice_16484" },
  { sku: "86887", productName: "Southern Comfort", size: "1 L", category: "liquor", lastPrice: "21.23", parLevel: 1, source: "invoice_16484" },
  { sku: "87937", productName: "Juarez Tequila Silver", size: "1 L", category: "liquor", lastPrice: "14.74", parLevel: 1, source: "invoice_16484" },
  { sku: "88296", productName: "Patron Tequila Silver", size: "750 ml", category: "liquor", lastPrice: "40.89", parLevel: 2, source: "invoice_16484" },
  { sku: "89197", productName: "Jose Cuervo Especial Reposado Tequila", size: "1 L", category: "liquor", lastPrice: "24.55", parLevel: 1, source: "invoice_16484" },
  { sku: "HYV-LUCCIO-MOSCATO-750", productName: "Luccio Moscato", size: "750 ml", category: "wine", lastPrice: null, parLevel: 1, source: "email_order_2026_05_26" },
  { sku: "HYV-SUTTER-WZ-1500", productName: "Sutter Home White Zinfandel", size: "1.5 L", category: "wine", lastPrice: null, parLevel: 1, source: "email_order_2026_05_26" },
  { sku: "HYV-SUTTER-CHARD-1500", productName: "Sutter Home Chardonnay", size: "1.5 L", category: "wine", lastPrice: null, parLevel: 1, source: "email_order_2026_05_26" },
  { sku: "HYV-SUTTER-MERLOT-1500", productName: "Sutter Home Merlot", size: "1.5 L", category: "wine", lastPrice: null, parLevel: 1, source: "email_order_2026_05_26" },
  { sku: "HYV-BERINGER-PG-750", productName: "Beringer Pinot Grigio", size: "750 ml", category: "wine", lastPrice: null, parLevel: 3, source: "email_order_2026_05_26" },
  { sku: "HYV-BLACKBERRY-BRANDY", productName: "Blackberry Brandy", size: "1 L", category: "liquor", lastPrice: null, parLevel: 2, source: "email_order_2026_05_26" },
  { sku: "HYV-HAWKEYE-GIN", productName: "Hawkeye Gin", size: "1 L", category: "liquor", lastPrice: null, parLevel: 2, source: "email_order_2026_05_26" },
  { sku: "HYV-BACARDI-LIMON", productName: "Bacardi Limon", size: "1 L", category: "liquor", lastPrice: null, parLevel: 1, source: "email_order_2026_05_26" },
  { sku: "HYV-ABSOLUT", productName: "Absolut Vodka", size: "1 L", category: "liquor", lastPrice: null, parLevel: 1, source: "email_order_2026_05_26" },
  { sku: "HYV-SMIRNOFF-RASPBERRY", productName: "Smirnoff Raspberry", size: "750 ml", category: "liquor", lastPrice: null, parLevel: 1, source: "email_order_2026_05_26" },
  { sku: "HYV-CANADIAN-CLUB", productName: "Canadian Club", size: "1 L", category: "liquor", lastPrice: null, parLevel: 1, source: "email_order_2026_05_26" },
  { sku: "HYV-JACK-HONEY", productName: "Jack Daniel's Tennessee Honey", size: "1 L", category: "liquor", lastPrice: null, parLevel: 1, source: "email_order_2026_05_26" },
  { sku: "HYV-OLE-SMOKY-COOKIE-DOUGH", productName: "Ole Smoky Cookie Dough", size: "750 ml", category: "liquor", lastPrice: null, parLevel: 2, source: "email_order_2026_05_26" },
  { sku: "HYV-CROWN-PEACH", productName: "Crown Royal Peach", size: "750 ml", category: "liquor", lastPrice: null, parLevel: 1, source: "email_order_2026_05_26" },
  { sku: "HYV-AMARETTO", productName: "Amaretto", size: "1 L", category: "liquor", lastPrice: null, parLevel: 1, source: "email_order_2026_05_26" },
  { sku: "HYV-BALLATORE-CHAMPAGNE", productName: "Ballatore Champagne", size: "750 ml", category: "wine", lastPrice: null, parLevel: 5, source: "email_order_2026_05_26" },
  { sku: "HYV-TONIC-WATER", productName: "Hy-Vee Tonic Water", size: "bottle", category: "soda", lastPrice: null, parLevel: 3, source: "email_order_2026_05_26" },
  { sku: "HYV-GINGER-BEER-BOX", productName: "Ginger Beer", size: "box", category: "soda", lastPrice: null, parLevel: 1, source: "email_order_2026_05_26" },
];

function formatMoney(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function buildInitialQuantities(): Record<string, number> {
  return HYVEE_PRODUCTS.reduce<Record<string, number>>((accumulator, product) => {
    accumulator[product.sku] = product.parLevel;
    return accumulator;
  }, {});
}

function buildEmailBody(quantities: Record<string, number>): string {
  const lines = HYVEE_PRODUCTS
    .map(product => ({ product, quantity: quantities[product.sku] ?? 0 }))
    .filter(line => line.quantity > 0)
    .map(line => `${line.quantity}-${line.product.size} ${line.product.productName}`);

  return [
    "Order for Community Tap",
    "",
    `From: ${FROM_EMAIL}`,
    `To: ${ORDER_EMAIL}`,
    "",
    ...lines,
    "",
    "Please confirm availability and delivery timing. Invoice should be emailed back when possible; we will also capture a photo backup on delivery.",
    "",
    "Community Tap & Pizza",
    "2026 5th Ave S",
    "Fort Dodge, IA 50501",
  ].join("\n");
}

function AccessDenied({ onBack }: { onBack: () => void }) {
  return (
    <div className="h-screen bg-slate-50 flex flex-col items-center justify-center px-8">
      <Lock size={32} className="text-zinc-700 mb-4" />
      <p className="text-slate-600 text-sm font-bold">Manager Access Required</p>
      <p className="text-zinc-600 text-xs text-center mt-2">Liquor ordering is manager-only.</p>
      <button onClick={onBack} className="mt-6 px-5 py-2.5 rounded-xl bg-white text-slate-600 text-xs font-semibold border border-slate-200">Back</button>
    </div>
  );
}

export default function HyVeeLiquorOrderScreen({ staffUser, onBack }: Props) {
  const [quantities, setQuantities] = useState<Record<string, number>>(buildInitialQuantities);
  const [activeCategory, setActiveCategory] = useState<ProductCategory | "all">("all");
  const productsQuery = trpc.vendorProducts.list.useQuery({ vendorName: VENDOR_NAME }, { enabled: isManagerOrOwner(staffUser), staleTime: 30_000 });
  const createProduct = trpc.vendorProducts.create.useMutation();
  const utils = trpc.useUtils();

  const filteredProducts = useMemo(() => HYVEE_PRODUCTS.filter(product => activeCategory === "all" || product.category === activeCategory), [activeCategory]);
  const orderLines = useMemo(() => HYVEE_PRODUCTS.filter(product => (quantities[product.sku] ?? 0) > 0), [quantities]);
  const knownEstimate = useMemo(() => orderLines.reduce((sum, product) => {
    const price = product.lastPrice ? Number(product.lastPrice) : 0;
    return sum + price * (quantities[product.sku] ?? 0);
  }, 0), [orderLines, quantities]);
  const existingNames = useMemo(() => new Set((productsQuery.data ?? []).map(product => product.productName.toLowerCase())), [productsQuery.data]);
  const missingProducts = useMemo(() => HYVEE_PRODUCTS.filter(product => !existingNames.has(product.productName.toLowerCase())), [existingNames]);

  if (!isManagerOrOwner(staffUser)) return <AccessDenied onBack={onBack} />;

  const updateQuantity = (sku: string, nextQuantity: number) => {
    setQuantities(current => ({ ...current, [sku]: Math.max(0, Math.min(99, nextQuantity)) }));
  };

  const emailBody = buildEmailBody(quantities);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(emailBody);
      toast.success("Hy-Vee order copied");
    } catch {
      toast.error("Could not copy order text");
    }
  };

  const openEmail = () => {
    const subject = encodeURIComponent("Order for community tap");
    const body = encodeURIComponent(emailBody);
    window.location.href = `mailto:${ORDER_EMAIL}?subject=${subject}&body=${body}`;
  };

  const seedMissingProducts = async () => {
    if (missingProducts.length === 0) {
      toast.success("Hy-Vee order guide products already exist");
      return;
    }
    try {
      for (const product of missingProducts) {
        await createProduct.mutateAsync({
          vendorName: VENDOR_NAME,
          sku: product.sku,
          productName: product.productName,
          category: product.category,
          unit: product.size,
          lastPrice: product.lastPrice ?? undefined,
          parLevel: product.parLevel,
          orderFrequency: "weekly",
          notes: `Hy-Vee liquor order guide. Source: ${product.source === "invoice_16484" ? `invoice ${LAST_INVOICE_NUMBER}` : "May 26 emailed order"}.`,
        });
      }
      await utils.vendorProducts.list.invalidate({ vendorName: VENDOR_NAME });
      toast.success(`Seeded ${missingProducts.length} Hy-Vee products`);
    } catch {
      toast.error("Could not seed every Hy-Vee product");
    }
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-y-auto pb-24">
      <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur border-b border-zinc-900 p-3 flex items-center gap-2">
        <button onClick={onBack} className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-slate-200">
          <ChevronLeft size={15} className="text-slate-500" />
        </button>
        <div className="flex-1">
          <h2 className="text-slate-900 font-black text-sm tracking-[0.08em]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>HY-VEE LIQUOR ORDER</h2>
          <p className="text-slate-500 text-[10px]">Sunday email workflow · invoice #{LAST_INVOICE_NUMBER} · {LAST_INVOICE_TOTAL_COUNT} invoice items</p>
        </div>
      </div>

      <div className="p-3 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl border border-slate-200 p-3">
            <p className="text-slate-500 text-[9px] uppercase tracking-wide">Lines</p>
            <p className="text-slate-900 text-lg font-bold">{orderLines.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3">
            <p className="text-slate-500 text-[9px] uppercase tracking-wide">Units</p>
            <p className="text-amber-400 text-lg font-bold">{Object.values(quantities).reduce((sum, qty) => sum + qty, 0)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3">
            <p className="text-slate-500 text-[9px] uppercase tracking-wide">Known $</p>
            <p className="text-green-400 text-sm font-bold mt-1">{formatMoney(knownEstimate)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-3">
          <div className="flex items-start gap-2">
            <Mail size={14} className="text-amber-400 mt-0.5" />
            <div>
              <p className="text-slate-900 text-xs font-bold">Email recipient</p>
              <p className="text-slate-500 text-[10px]">{ORDER_EMAIL}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={copyEmail} className="rounded-lg bg-slate-50 border border-slate-200 py-2.5 text-slate-700 text-[10px] font-bold flex items-center justify-center gap-1.5">
              <ClipboardCopy size={12} /> Copy Order
            </button>
            <button onClick={openEmail} className="rounded-lg bg-amber-500 text-black py-2.5 text-[10px] font-black flex items-center justify-center gap-1.5">
              <Send size={12} /> Open Email
            </button>
          </div>
        </div>

        <button
          onClick={seedMissingProducts}
          disabled={createProduct.isPending || productsQuery.isLoading}
          className="w-full rounded-xl bg-blue-500/10 border border-blue-500/20 py-3 text-blue-200 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {createProduct.isPending ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
          {missingProducts.length === 0 ? "Hy-Vee Product Seed Complete" : `Seed ${missingProducts.length} Missing Products to Vendor Products`}
        </button>

        <div className="grid grid-cols-4 gap-1">
          {(["all", "liquor", "wine", "soda"] as Array<ProductCategory | "all">).map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`rounded-lg px-2 py-2 text-[9px] font-bold border capitalize ${activeCategory === category ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-white text-slate-500 border-slate-200"}`}
            >
              {category === "all" ? "All" : category}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filteredProducts.map(product => {
            const quantity = quantities[product.sku] ?? 0;
            return (
              <div key={product.sku} className="bg-white rounded-xl border border-slate-200 p-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    {product.category === "wine" ? <Wine size={14} className="text-amber-400" /> : <DollarSign size={14} className="text-amber-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-900 text-xs font-semibold truncate">{product.productName}</p>
                    <p className="text-slate-500 text-[9px]">{product.size} · {product.sku} · par {product.parLevel}{product.lastPrice ? ` · $${product.lastPrice}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => updateQuantity(product.sku, quantity - 1)} className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
                      <Minus size={12} className="text-slate-500" />
                    </button>
                    <input
                      value={quantity}
                      onChange={event => updateQuantity(product.sku, Number(event.target.value) || 0)}
                      className="w-10 h-7 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs text-center font-bold"
                      inputMode="numeric"
                    />
                    <button onClick={() => updateQuantity(product.sku, quantity + 1)} className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
                      <Plus size={12} className="text-amber-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
