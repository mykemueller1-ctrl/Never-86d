import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Shield,
  Thermometer,
  DollarSign,
  Scale,
  TrendingUp,
  Beer,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Props {
  onBack: () => void;
  staffRole?: string;
}

type Tab = "food-safety" | "labor" | "commodity" | "benchmarks" | "liquor";

export default function ComplianceIntelScreen({ onBack, staffRole }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("food-safety");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isManager = staffRole === "manager" || staffRole === "owner";

  const tabs: { id: Tab; label: string; icon: React.ReactNode; managerOnly?: boolean }[] = [
    { id: "food-safety", label: "Food Safety", icon: <Thermometer className="w-4 h-4" /> },
    { id: "labor", label: "Labor Law", icon: <Scale className="w-4 h-4" /> },
    { id: "commodity", label: "Commodity Trends", icon: <TrendingUp className="w-4 h-4" />, managerOnly: true },
    { id: "benchmarks", label: "Cost Benchmarks", icon: <DollarSign className="w-4 h-4" />, managerOnly: true },
    { id: "liquor", label: "Liquor Law", icon: <Beer className="w-4 h-4" /> },
  ];

  const visibleTabs = tabs.filter((t) => !t.managerOnly || isManager);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-zinc-900 to-black border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-zinc-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-500" />
              Compliance & Intel
            </h1>
            <p className="text-xs text-zinc-500">Iowa Laws · Commodity Trends · Cost Benchmarks</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-3 py-2 overflow-x-auto border-b border-zinc-800">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 pb-24">
        {activeTab === "food-safety" && <FoodSafetyTab expandedSections={expandedSections} toggleSection={toggleSection} />}
        {activeTab === "labor" && <LaborLawTab expandedSections={expandedSections} toggleSection={toggleSection} />}
        {activeTab === "commodity" && <CommodityTrendsTab />}
        {activeTab === "benchmarks" && <CostBenchmarksTab />}
        {activeTab === "liquor" && <LiquorLawTab expandedSections={expandedSections} toggleSection={toggleSection} />}
      </div>
    </div>
  );
}

/* ─── FOOD SAFETY TAB ─── */
function FoodSafetyTab({
  expandedSections,
  toggleSection,
}: {
  expandedSections: Set<string>;
  toggleSection: (id: string) => void;
}) {
  const tempRequirements = [
    { item: "Cold Holding (cheese, meats, tomatoes)", temp: "41°F or below", critical: true },
    { item: "Hot Holding (all hot TCS foods)", temp: "135°F or above", critical: true },
    { item: "Poultry Cooking", temp: "165°F (<1 sec)", critical: true },
    { item: "Ground Meats (sausage for pizza)", temp: "155°F (17 sec)", critical: true },
    { item: "Pork / Whole Muscle", temp: "145°F (15 sec)", critical: true },
    { item: "Cooling: Step 1", temp: "135°F → 70°F in 2 hrs", critical: true },
    { item: "Cooling: Step 2", temp: "70°F → 41°F in 4 hrs", critical: true },
    { item: "Handwashing Water", temp: "100°F minimum", critical: false },
    { item: "Sanitizing Water", temp: "171°F minimum", critical: false },
  ];

  return (
    <div className="space-y-4">
      {/* Quick Reference Card */}
      <Card className="bg-red-500/10 border-red-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Iowa Food Code — Critical Temperatures
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {tempRequirements.map((t, i) => (
            <div key={i} className="flex justify-between items-center py-1.5 border-b border-zinc-800/50 last:border-0">
              <span className="text-xs text-zinc-300">{t.item}</span>
              <span className={`text-xs font-mono font-bold ${t.critical ? "text-red-400" : "text-yellow-400"}`}>
                {t.temp}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Certification */}
      <CollapsibleCard
        id="cfpm"
        title="Certification Requirements"
        icon={<CheckCircle className="w-4 h-4 text-green-400" />}
        expanded={expandedSections.has("cfpm")}
        onToggle={() => toggleSection("cfpm")}
      >
        <div className="space-y-2 text-xs text-zinc-300">
          <p>
            <strong className="text-white">CFPM Required:</strong> At least one Certified Food Protection Manager per establishment
            (FDA Food Code 2-102.12).
          </p>
          <p>
            <strong className="text-white">Accredited Programs:</strong> ServSafe (Iowa Restaurant Association), 360training, Inc.
          </p>
          <p>
            <strong className="text-white">All Staff:</strong> General food handler training recommended for all employees.
          </p>
        </div>
      </CollapsibleCard>

      {/* Violations */}
      <CollapsibleCard
        id="violations"
        title="Violation Penalties"
        icon={<AlertTriangle className="w-4 h-4 text-yellow-400" />}
        expanded={expandedSections.has("violations")}
        onToggle={() => toggleSection("violations")}
      >
        <div className="space-y-2 text-xs text-zinc-300">
          <div className="flex justify-between py-1 border-b border-zinc-800">
            <span>Civil Penalty</span>
            <span className="text-red-400 font-bold">Up to $1,000/day</span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-800">
            <span>Risk Factor Violations</span>
            <span className="text-yellow-400 font-bold">Correct within 10 days</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Good Retail Practice</span>
            <span className="text-zinc-400 font-bold">90-day correction</span>
          </div>
        </div>
      </CollapsibleCard>

      {/* Inspection Database */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="py-3">
          <a
            href="https://iowa.safefoodinspection.com/Inspection/PublicInspectionSearch.aspx"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between text-xs"
          >
            <span className="text-zinc-300">Iowa Public Inspection Database</span>
            <ExternalLink className="w-3.5 h-3.5 text-orange-400" />
          </a>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── LABOR LAW TAB ─── */
function LaborLawTab({
  expandedSections,
  toggleSection,
}: {
  expandedSections: Set<string>;
  toggleSection: (id: string) => void;
}) {
  const wageData = [
    { label: "Iowa Minimum Wage", value: "$7.25/hr", note: "Same as federal" },
    { label: "Tipped Minimum Wage", value: "$4.35/hr", note: "Cash wage" },
    { label: "Tip Credit", value: "$2.90/hr", note: "40% of min wage" },
    { label: "Tipped Threshold", value: "$30+/month", note: "In tips to qualify" },
    { label: "Overtime Threshold", value: "40 hrs/week", note: "" },
    { label: "Overtime Rate", value: "1.5x $7.25", note: "Based on FULL min wage" },
  ];

  return (
    <div className="space-y-4">
      {/* Wage Quick Reference */}
      <Card className="bg-blue-500/10 border-blue-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-blue-400 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Iowa Wage Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {wageData.map((w, i) => (
            <div key={i} className="flex justify-between items-center py-1.5 border-b border-zinc-800/50 last:border-0">
              <div>
                <span className="text-xs text-zinc-300">{w.label}</span>
                {w.note && <span className="text-[10px] text-zinc-500 ml-2">({w.note})</span>}
              </div>
              <span className="text-xs font-mono font-bold text-blue-400">{w.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Key Rules */}
      <CollapsibleCard
        id="labor-rules"
        title="Key Iowa Labor Rules"
        icon={<Scale className="w-4 h-4 text-blue-400" />}
        expanded={expandedSections.has("labor-rules")}
        onToggle={() => toggleSection("labor-rules")}
      >
        <div className="space-y-2 text-xs text-zinc-300">
          <p>
            <strong className="text-yellow-400">⚠ Overtime for tipped:</strong> Calculated on full $7.25, NOT the $4.35 tipped
            wage.
          </p>
          <p>
            <strong className="text-white">Breaks:</strong> No mandatory breaks for adults. Minors under 16 get 30-min break for
            5+ hour shifts.
          </p>
          <p>
            <strong className="text-white">Tip Pooling:</strong> Allowed, but if tip credit taken, pool can ONLY include tipped
            employees (servers, bussers, bartenders).
          </p>
          <p>
            <strong className="text-white">At-Will:</strong> Iowa is at-will employment — either party can terminate at any time for
            any legal reason.
          </p>
        </div>
      </CollapsibleCard>

      {/* Youth Employment */}
      <CollapsibleCard
        id="youth"
        title="Youth Employment (Under 18)"
        icon={<AlertTriangle className="w-4 h-4 text-yellow-400" />}
        expanded={expandedSections.has("youth")}
        onToggle={() => toggleSection("youth")}
      >
        <div className="space-y-2 text-xs text-zinc-300">
          <p>16-17 year olds CAN serve alcohol in restaurants (not bars) with:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Written parental consent</li>
            <li>At least 2 adult employees present</li>
            <li>Sexual harassment training required</li>
          </ul>
        </div>
      </CollapsibleCard>

      {/* Workers Comp */}
      <CollapsibleCard
        id="workers-comp"
        title="Workers' Compensation"
        icon={<Shield className="w-4 h-4 text-green-400" />}
        expanded={expandedSections.has("workers-comp")}
        onToggle={() => toggleSection("workers-comp")}
      >
        <div className="space-y-1 text-xs text-zinc-300">
          <div className="flex justify-between py-1 border-b border-zinc-800">
            <span>Coverage Required</span>
            <span className="text-white font-bold">1+ employees</span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-800">
            <span>Employee Report Deadline</span>
            <span className="text-white font-bold">90 days</span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-800">
            <span>Employer Report Deadline</span>
            <span className="text-red-400 font-bold">4 days</span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-800">
            <span>Weekly Disability Cap</span>
            <span className="text-white font-bold">$1,864 (80%)</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Claims Statute of Limitations</span>
            <span className="text-white font-bold">2 years</span>
          </div>
        </div>
      </CollapsibleCard>
    </div>
  );
}

/* ─── COMMODITY TRENDS TAB ─── */
function CommodityTrendsTab() {
  const commodities = [
    { name: "Beef & Veal", change: "+6.3%", direction: "up" as const, note: "Shrinking cattle herd + strong demand" },
    { name: "Pork", change: "+0.4%", direction: "stable" as const, note: "Good alternative to beef" },
    { name: "Poultry", change: "+0.7%", direction: "stable" as const, note: "Wings/tenders predictable" },
    { name: "Eggs", change: "-29.4%", direction: "down" as const, note: "HPAI recovery — big savings" },
    { name: "Dairy/Cheese", change: "Declining", direction: "down" as const, note: "Good news for pizza" },
    { name: "Fresh Vegetables", change: "Above avg", direction: "up" as const, note: "Watch tomato/pepper costs" },
    { name: "All Food CPI", change: "+2.9%", direction: "up" as const, note: "Range: 1.3% to 4.6%" },
    { name: "Food Away From Home", change: "+3.6%", direction: "up" as const, note: "Above 20yr avg of 3.5%" },
  ];

  const futures = [
    { name: "Cheddar Cheese (40lb block)", price: "$1.65/lb", source: "NDPSR Apr 2026" },
    { name: "Butter", price: "$1.75/lb", source: "NDPSR" },
    { name: "Feeder Cattle Futures", price: "$371.25", source: "CME May 2026" },
    { name: "Corn Futures", price: "$4.776", source: "CME Jul contract" },
  ];

  return (
    <div className="space-y-4">
      {/* 2026 Forecast */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-orange-400 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            USDA 2026 Price Forecast
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {commodities.map((c, i) => (
            <div key={i} className="flex justify-between items-center py-1.5 border-b border-zinc-800/50 last:border-0">
              <div>
                <span className="text-xs text-zinc-300">{c.name}</span>
                <span className="text-[10px] text-zinc-500 ml-2">{c.note}</span>
              </div>
              <span
                className={`text-xs font-mono font-bold ${
                  c.direction === "up" ? "text-red-400" : c.direction === "down" ? "text-green-400" : "text-zinc-400"
                }`}
              >
                {c.direction === "up" ? "▲" : c.direction === "down" ? "▼" : "─"} {c.change}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Current Futures */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-400">Current Commodity Prices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {futures.map((f, i) => (
            <div key={i} className="flex justify-between items-center py-1.5 border-b border-zinc-800/50 last:border-0">
              <div>
                <span className="text-xs text-zinc-300">{f.name}</span>
                <span className="text-[10px] text-zinc-600 ml-2">{f.source}</span>
              </div>
              <span className="text-xs font-mono font-bold text-white">{f.price}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Data Sources */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-400">Live Data Sources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { name: "USDA Food Price Outlook", url: "https://www.ers.usda.gov/data-products/food-price-outlook" },
            { name: "FRED Food CPI", url: "https://fred.stlouisfed.org/series/CPIUFDNS" },
            { name: "CME Ag Futures", url: "https://www.cmegroup.com/markets/agriculture.html" },
            { name: "USDA Market News", url: "https://www.ams.usda.gov/market-news" },
            { name: "NDPSR Cheese Prices", url: "https://www.ams.usda.gov/mnreports/dywdairyproductssales.pdf" },
          ].map((s, i) => (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between text-xs py-1"
            >
              <span className="text-zinc-300">{s.name}</span>
              <ExternalLink className="w-3 h-3 text-orange-400" />
            </a>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── COST BENCHMARKS TAB ─── */
function CostBenchmarksTab() {
  return (
    <div className="space-y-4">
      {/* Food Cost Targets */}
      <Card className="bg-green-500/10 border-green-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-green-400 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Your Target Benchmarks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <BenchmarkBar label="Pizza Food Cost" target="20-26%" current={null} color="green" />
          <BenchmarkBar label="Bar Pour Cost" target="15-25%" current={null} color="blue" />
          <BenchmarkBar label="Prime Cost (Food+Labor)" target="55-65%" current={null} color="orange" />
        </CardContent>
      </Card>

      {/* Industry Comparison */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-400">Industry Benchmarks (2026)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {[
            { type: "Pizzeria", foodCost: "20-26%", margin: "5-12%" },
            { type: "Full Service", foodCost: "28-35%", margin: "3-8%" },
            { type: "Fast Casual", foodCost: "25-32%", margin: "4-10%" },
            { type: "QSR", foodCost: "25-30%", margin: "5-12%" },
          ].map((b, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-zinc-800/50 last:border-0">
              <span className="text-xs text-zinc-300 font-medium">{b.type}</span>
              <div className="flex gap-4">
                <span className="text-xs text-zinc-400">
                  Food: <span className="text-white font-mono">{b.foodCost}</span>
                </span>
                <span className="text-xs text-zinc-400">
                  Margin: <span className="text-green-400 font-mono">{b.margin}</span>
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* NRA Stats */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-400">NRA Industry Stats (2026)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-zinc-300">
          <div className="flex justify-between py-1 border-b border-zinc-800">
            <span>Total Foodservice Sales</span>
            <span className="text-white font-bold">$1.55 Trillion</span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-800">
            <span>Operators Reporting No Profit (2025)</span>
            <span className="text-red-400 font-bold">42%</span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-800">
            <span>Food Costs vs Pre-Pandemic</span>
            <span className="text-red-400 font-bold">+35%</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Avg Full-Service Food Cost</span>
            <span className="text-white font-bold">32.4%</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── LIQUOR LAW TAB ─── */
function LiquorLawTab({
  expandedSections,
  toggleSection,
}: {
  expandedSections: Set<string>;
  toggleSection: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Dramshop Alert */}
      <Card className="bg-red-500/10 border-red-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Dramshop Liability (Iowa Code §123.92)
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-zinc-300 space-y-2">
          <p>
            You are <strong className="text-red-400">legally liable</strong> for damages caused by intoxicated patrons you served
            while visibly intoxicated.
          </p>
          <div className="flex justify-between py-1 border-t border-zinc-800">
            <span>Noneconomic Damages Cap</span>
            <span className="text-red-400 font-bold">$250,000</span>
          </div>
          <p className="text-zinc-500">Extends to injuries/damages sustained by third parties.</p>
        </CardContent>
      </Card>

      {/* License Requirements */}
      <CollapsibleCard
        id="license"
        title="License Requirements"
        icon={<Shield className="w-4 h-4 text-blue-400" />}
        expanded={expandedSections.has("license")}
        onToggle={() => toggleSection("license")}
      >
        <div className="space-y-1 text-xs text-zinc-300">
          <div className="flex justify-between py-1 border-b border-zinc-800">
            <span>Application Lead Time</span>
            <span className="text-white font-bold">45 days</span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-800">
            <span>Local Approval Lead Time</span>
            <span className="text-white font-bold">15 days</span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-800">
            <span>Minimum Seating</span>
            <span className="text-white font-bold">25 patrons</span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-800">
            <span>Annual Fee</span>
            <span className="text-white font-bold">$150-$400</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Portal</span>
            <span className="text-orange-400 font-bold">GovConnectIowa</span>
          </div>
        </div>
      </CollapsibleCard>

      {/* Penalties */}
      <CollapsibleCard
        id="alcohol-penalties"
        title="Penalties"
        icon={<AlertTriangle className="w-4 h-4 text-yellow-400" />}
        expanded={expandedSections.has("alcohol-penalties")}
        onToggle={() => toggleSection("alcohol-penalties")}
      >
        <div className="space-y-1 text-xs text-zinc-300">
          <div className="flex justify-between py-1 border-b border-zinc-800">
            <span>Selling to Minor (Individual)</span>
            <span className="text-red-400 font-bold">$1,500 fine</span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-800">
            <span>Selling to Minor (Business)</span>
            <span className="text-red-400 font-bold">$500 penalty</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Felony (last 5 yrs)</span>
            <span className="text-red-400 font-bold">Auto-disqualifier</span>
          </div>
        </div>
      </CollapsibleCard>

      {/* NW Iowa Distributors */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-400">NW Iowa Distributors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-zinc-300">
          <div className="flex justify-between py-1 border-b border-zinc-800">
            <span className="font-medium text-white">Johnson Brothers</span>
            <span>Spencer, IA (since 1986)</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="font-medium text-white">Doll Distributing</span>
            <span>Spencer, IA</span>
          </div>
          <p className="text-zinc-500 pt-1">Iowa Spirits Price Book available from ABD for exact wholesale costs.</p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── SHARED COMPONENTS ─── */
function CollapsibleCard({
  id,
  title,
  icon,
  expanded,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-white">{title}</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
      </button>
      {expanded && <CardContent className="pt-0 pb-3">{children}</CardContent>}
    </Card>
  );
}

function BenchmarkBar({ label, target, current, color }: { label: string; target: string; current: number | null; color: string }) {
  const colorMap: Record<string, string> = {
    green: "bg-green-500/30 text-green-400",
    blue: "bg-blue-500/30 text-blue-400",
    orange: "bg-orange-500/30 text-orange-400",
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-300">{label}</span>
        <span className={`font-bold ${colorMap[color]?.split(" ")[1] || "text-white"}`}>Target: {target}</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        {current !== null ? (
          <div className={`h-full rounded-full ${colorMap[color]?.split(" ")[0] || "bg-zinc-600"}`} style={{ width: `${Math.min(current, 100)}%` }} />
        ) : (
          <div className="h-full bg-zinc-700/50 rounded-full flex items-center justify-center">
            <span className="text-[8px] text-zinc-500">Connect POS for live data</span>
          </div>
        )}
      </div>
    </div>
  );
}
