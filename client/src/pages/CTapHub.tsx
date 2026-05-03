/**
 * CTAP People Platform v1 — Active Beat Testing
 * Community Tap & Pizza · Fort Dodge, Iowa · Powered by Never 86'd
 * 
 * Design: Night Shift Industrial — True black OLED, amber primary
 * Real Staff: Mychael Mueller, Sally Hart, Jessica Gailey, Karlee Sturtz, etc.
 * Features: Gamified login, daily briefing, store run/receipt capture, vendor tracking,
 *           void hunter, driver EOD, Wi-Fi proximity, schedule-by-merit, social posting
 */
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  CheckCircle2, Circle, MessageSquare, AlertTriangle, Calendar,
  Search, BookOpen, Send, ChevronRight, ChevronLeft, Users,
  Trophy, Flame, Wifi, WifiOff, Star, TrendingUp, Clock,
  DollarSign, ShieldAlert, Truck, Camera, Facebook, ThumbsUp,
  Bell, BarChart3, Target, Award, Zap, Coffee, Moon, Sun,
  ClipboardCheck, UserCheck, LogOut, Home, X, ArrowRight,
  MapPin, Phone, Mail, Eye, EyeOff, Plus, Receipt, Store,
  FileText, Upload, Package, CreditCard
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────
type Screen =
  | "splash" | "login" | "welcome" | "briefing"
  | "hub" | "checklist" | "chat" | "issues" | "schedule"
  | "voids" | "sops" | "feedback" | "social" | "driver-eod"
  | "command" | "leaderboard" | "profile" | "store-run" | "invoices";

type Role = "owner" | "manager" | "bartender" | "server" | "kitchen" | "driver";

interface StaffMember {
  id: string;
  name: string;
  role: Role;
  pin: string;
  score: number;
  streak: number;
  voids: number;
  badges: string[];
  wifiConnected: boolean;
  active: boolean;
  isKey: boolean;
}

interface PayOut {
  id: string;
  date: string;
  time: string;
  who: string;
  description: string;
  account: string;
  accountNum: string;
  amount: number;
  vendor: string;
  managerSigned: boolean;
  receiptAttached: boolean;
  flagged: boolean;
  flagReason?: string;
}

interface Invoice {
  id: string;
  date: string;
  vendor: string;
  items: { name: string; qty: string; price: string; total: string }[];
  grandTotal: number;
  orderedBy: string;
  category: string;
}

// ─── Real Staff Data ──────────────────────────────────────────────────────
const STAFF: StaffMember[] = [
  { id: "1", name: "Mychael Mueller", role: "owner", pin: "8686", score: 9999, streak: 174, voids: 0, badges: ["Founder", "174-Day Streak", "Zero Voids"], wifiConnected: true, active: true, isKey: true },
  { id: "2", name: "Sally Hart", role: "owner", pin: "8687", score: 9500, streak: 90, voids: 0, badges: ["Co-Owner", "Zero Voids"], wifiConnected: true, active: true, isKey: true },
  { id: "3", name: "Jessica Gailey", role: "manager", pin: "1234", score: 2450, streak: 32, voids: 1, badges: ["Top Manager", "Mentor"], wifiConnected: true, active: true, isKey: true },
  { id: "4", name: "Gavin Thomas", role: "manager", pin: "1235", score: 2100, streak: 18, voids: 0, badges: ["Key Manager", "Zero Voids"], wifiConnected: true, active: true, isKey: true },
  { id: "5", name: "Karlee Sturtz", role: "bartender", pin: "2345", score: 1890, streak: 14, voids: 0, badges: ["Zero Void Week", "Bar Lead"], wifiConnected: true, active: true, isKey: false },
  { id: "6", name: "Ashley Holding", role: "bartender", pin: "3456", score: 1650, streak: 8, voids: 2, badges: ["Feedback Star"], wifiConnected: true, active: true, isKey: false },
  { id: "7", name: "Kenzy Thompson", role: "bartender", pin: "4567", score: 1420, streak: 5, voids: 1, badges: ["Social Poster"], wifiConnected: true, active: true, isKey: false },
  { id: "8", name: "Bryson Cook", role: "bartender", pin: "5678", score: 1200, streak: 3, voids: 3, badges: [], wifiConnected: false, active: true, isKey: false },
  { id: "9", name: "Moe Thomas", role: "kitchen", pin: "6789", score: 2200, streak: 22, voids: 0, badges: ["Kitchen Manager", "Streak Master", "Zero Voids"], wifiConnected: true, active: true, isKey: true },
  { id: "10", name: "Tom", role: "kitchen", pin: "7890", score: 1800, streak: 15, voids: 0, badges: ["Kitchen Manager", "Order Authority"], wifiConnected: true, active: true, isKey: true },
  { id: "11", name: "Che", role: "kitchen", pin: "8901", score: 1500, streak: 10, voids: 0, badges: ["Kitchen Key", "Zero Voids"], wifiConnected: true, active: true, isKey: true },
  { id: "12", name: "Steven Klein", role: "kitchen", pin: "9012", score: 1400, streak: 8, voids: 0, badges: ["Kitchen Key"], wifiConnected: true, active: true, isKey: true },
  { id: "13", name: "Ryan", role: "driver", pin: "0123", score: 870, streak: 4, voids: 0, badges: ["On Time"], wifiConnected: false, active: true, isKey: false },
  { id: "14", name: "Jeri Wilson", role: "server", pin: "1122", score: 760, streak: 2, voids: 2, badges: [], wifiConnected: true, active: true, isKey: false },
  { id: "15", name: "Samantha Swearingen", role: "server", pin: "2233", score: 650, streak: 1, voids: 4, badges: [], wifiConnected: true, active: true, isKey: false },
  { id: "16", name: "Kaillee Miller", role: "bartender", pin: "3344", score: 980, streak: 6, voids: 1, badges: [], wifiConnected: true, active: true, isKey: false },
  { id: "17", name: "Azaria Silvey", role: "server", pin: "4455", score: 720, streak: 3, voids: 1, badges: [], wifiConnected: true, active: true, isKey: false },
];

// ─── Pay Out Data (Real from receipts) ──────────────────────────────────
const PAYOUTS: PayOut[] = [
  { id: "1", date: "04/24/2026", time: "10:54 AM", who: "Jessica Gailey", description: "Bread - Hyvee", account: "Bread", accountNum: "4311", amount: 85.00, vendor: "Hy-Vee", managerSigned: false, receiptAttached: true, flagged: true, flagReason: "Receipt total $84.21 vs pay out $85.00 — $0.79 discrepancy" },
  { id: "2", date: "04/22/2026", time: "3:36 PM", who: "Jessica Gailey", description: "Store", account: "Miscellaneous", accountNum: "5699", amount: 6.00, vendor: "Unknown", managerSigned: false, receiptAttached: false, flagged: true, flagReason: "No receipt attached · No manager sign" },
  { id: "3", date: "04/20/2026", time: "4:45 PM", who: "Jessica Gailey", description: "Spray", account: "Miscellaneous", accountNum: "5699", amount: 3.50, vendor: "Dollar General", managerSigned: false, receiptAttached: true, flagged: false },
  { id: "4", date: "04/20/2026", time: "7:39 PM", who: "Ashley Holding", description: "Store Run", account: "Miscellaneous", accountNum: "5699", amount: 5.00, vendor: "Dollar General", managerSigned: false, receiptAttached: true, flagged: true, flagReason: "Non-key employee processed pay out" },
];

// ─── Invoice Data (Real from receipts) ──────────────────────────────────
const INVOICES: Invoice[] = [
  {
    id: "1", date: "04/24/2026", vendor: "Sawyer's Meats of Iowa", orderedBy: "Tom", category: "Proteins",
    items: [
      { name: "Sausage (2cs)", qty: "40 lbs", price: "$3.29/lb", total: "$131.60" },
      { name: "Ham (1cs)", qty: "25 lbs", price: "$3.29/lb", total: "$82.25" },
      { name: "BL Breast", qty: "42.6 lbs", price: "$2.29/lb", total: "$97.55" },
      { name: "C-Beef", qty: "14.7 lbs", price: "$7.49/lb", total: "$110.10" },
      { name: "L-Back Ribs", qty: "49.1 lbs", price: "$3.29/lb", total: "$161.54" },
      { name: "Ground Beef", qty: "40 lbs", price: "$4.50/lb", total: "$180.00" },
      { name: "8oz Cut Sirloin", qty: "3", price: "$8.50", total: "$25.50" },
    ],
    grandTotal: 788.54,
  },
  {
    id: "2", date: "04/24/2026", vendor: "Hy-Vee", orderedBy: "Jessica Gailey", category: "Bread/Produce",
    items: [
      { name: "Split Top Bread", qty: "4", price: "$2.49", total: "$9.96" },
      { name: "Texas Toast", qty: "6", price: "$2.99", total: "$17.94" },
      { name: "Kings Hawaiian Rolls", qty: "3", price: "$7.99", total: "$23.97" },
      { name: "Green Cabbage", qty: "5.24 lbs", price: "$0.88/lb", total: "$4.61" },
      { name: "Broccoli Slaw", qty: "1", price: "$2.94", total: "$2.94" },
      { name: "Wonton Wrappers", qty: "4", price: "$3.69", total: "$14.76" },
      { name: "Deli Swirl", qty: "2", price: "$4.99", total: "$9.98" },
    ],
    grandTotal: 84.21,
  },
  {
    id: "3", date: "04/20/2026", vendor: "Fareway Meat & Grocery", orderedBy: "Mychael", category: "Proteins",
    items: [
      { name: "Half Pork Belly", qty: "1", price: "$31.45", total: "$31.45" },
    ],
    grandTotal: 31.45,
  },
  {
    id: "4", date: "04/20/2026", vendor: "Dollar General", orderedBy: "Jessica Gailey", category: "Supplies",
    items: [
      { name: "Sharpie Markers (chisel)", qty: "5", price: "$3-4 ea", total: "$17.00" },
      { name: "PAM Cooking Spray", qty: "1", price: "$3.50", total: "$3.50" },
    ],
    grandTotal: 21.69,
  },
];

// ─── Daily Briefing ──────────────────────────────────────────────────────
const BRIEFING = {
  date: "Saturday, May 3, 2026",
  yesterdaySales: "$5,318",
  yesterdayOrders: 172,
  topPerformer: "Karlee — Zero voids all week",
  eightySixed: ["Brisket (sold out by 7 PM)"],
  specials: ["Large 1-Topping $14.99", "Crab Rangoon Pizza featured"],
  issues: [
    { text: "Fryer thermostat — maintenance confirmed Tuesday", status: "pending" },
    { text: "Keg room temp sensor replaced", status: "resolved" },
  ],
  message: "Big game tonight — expect 30% above normal 4-8 PM. Prep accordingly.",
};

// ─── Checklists ──────────────────────────────────────────────────────
const CHECKLISTS: Record<string, { title: string; items: string[] }[]> = {
  bartender: [
    { title: "Opening Bar", items: ["Check tap lines & pour test", "Stock garnishes (limes, olives, cherries)", "Verify till count matches POS", "Wipe down bar top & stools", "Check ID scanner battery", "Stock Carbliss & seltzers", "Review 86'd list"] },
    { title: "Closing Bar", items: ["Run Z-report", "Reconcile tips & declare", "Wipe all surfaces & sanitize", "Restock for tomorrow", "Lock liquor cabinets", "Turn off bar TV & signs", "Mop behind bar", "Put phones on charger"] },
  ],
  kitchen: [
    { title: "Opening Kitchen", items: ["Check smoker temps (brisket, pork)", "Pull thaw items per prep list", "Date & label all opened items", "Check fryer oil levels", "Verify par levels on pizza line", "Turn on ovens — confirm 475°F", "Check walk-in temps"] },
    { title: "Pizza Nightly Close", items: ["Put dough away", "Clean dough roller", "Wipe inside cold table", "Cover all dough", "Turn pizza ovens off", "Put cheese away", "Sweep & mop pizza side", "Fill sauce bottles", "Fill Pepsi cooler (cheese, beef, sausage)", "Pull out pizza line & sweep behind", "Put phones on charger", "Clean computer screens"] },
  ],
  server: [
    { title: "Opening FOH", items: ["Check table settings & menus", "Verify POS station working", "Stock server station (napkins, silverware)", "Check restrooms stocked & clean", "Review 86'd list & specials", "Confirm phone order procedures"] },
    { title: "Closing FOH", items: ["Wipe all tables & booths", "Restock condiments", "Sweep dining area", "Run side work checklist", "Clock out & declare tips"] },
  ],
  driver: [
    { title: "Start of Shift", items: ["Check delivery bags (clean & insulated)", "Verify phone GPS working", "Check vehicle gas level", "Review pending delivery queue"] },
    { title: "End of Shift", items: ["Complete Driver EOD Report", "Return all delivery bags", "Rinse & pit any dishes", "Reconcile cash deliveries with till", "Report any redeliveries with ticket #"] },
  ],
  manager: [
    { title: "Opening Manager", items: ["Review overnight feedback", "Check 86'd list from last night", "Verify staff schedule vs. who showed", "Review void/comp report", "Check maintenance tickets", "Confirm prep list posted", "Review pay out log from last shift"] },
    { title: "Closing Manager", items: ["Review all void/comps for shift", "Approve pending pay outs", "Check Wi-Fi disconnect log", "Run labor % vs. sales", "Submit shift summary", "Lock up & set alarm"] },
  ],
  owner: [
    { title: "Daily Review", items: ["Check overnight alerts", "Review void/comp patterns (weekly)", "Check labor % trend", "Review feedback themes", "Check leaderboard standings", "Review vendor spend this week", "Check pay out log for flags"] },
  ],
};

// ─── Main Component ──────────────────────────────────────────────────────
export default function CTapHub() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [user, setUser] = useState<StaffMember | null>(null);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [checklistProgress, setChecklistProgress] = useState<Record<string, boolean>>({});
  const [chatMessages, setChatMessages] = useState([
    { from: "Jessica", text: "Kitchen — we're 86'd on brisket after 7. Push the ribs tonight.", time: "3:42 PM" },
    { from: "Moe", text: "Copy. Ribs are loaded. Got extra pork pulling now too.", time: "3:44 PM" },
    { from: "Karlee", text: "Bar's prepped for game night. Extra Blue Moon kegs tapped.", time: "3:51 PM" },
    { from: "Tom", text: "Sawyer's delivery came in — all checked. $788 this week on proteins.", time: "4:05 PM" },
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [socialPostText, setSocialPostText] = useState("");
  const [driverEOD, setDriverEOD] = useState({ outOfTown: "", specialRuns: "", cashFromTill: "", redeliveries: "", notes: "" });
  const [storeRunForm, setStoreRunForm] = useState({ what: "", where: "", amount: "", authorizedBy: "", account: "Miscellaneous" });

  // Auto-advance splash
  useEffect(() => {
    if (screen === "splash") {
      const t = setTimeout(() => setScreen("login"), 2500);
      return () => clearTimeout(t);
    }
  }, [screen]);

  // ─── SPLASH ──────────────────────────────────────────────────────
  const SplashScreen = () => (
    <div className="h-screen bg-black flex flex-col items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/20">
          <span className="text-3xl font-black text-black">CT</span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          COMMUNITY TAP
        </h1>
        <p className="text-amber-500 text-lg font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>& PIZZA</p>
        <div className="w-16 h-0.5 bg-amber-500 mx-auto mt-3 mb-3 rounded-full" />
        <p className="text-zinc-500 text-xs tracking-widest uppercase">Fort Dodge, Iowa · Est. 1976</p>
        <p className="text-zinc-700 text-xs mt-8">Powered by Never 86'd</p>
        <p className="text-zinc-800 text-[10px] mt-1">Active Beat Testing · v1</p>
      </div>
    </div>
  );

  // ─── LOGIN ──────────────────────────────────────────────────────
  const LoginScreen = () => (
    <div className="h-screen bg-black flex flex-col overflow-y-auto">
      <div className="flex-1 flex flex-col items-center justify-start px-5 pt-12 pb-8">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-black text-white mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.03em" }}>
            START YOUR SHIFT
          </h2>
          <p className="text-zinc-500 text-sm mb-6">Select your role, then tap your name or enter PIN</p>

          {!selectedRole ? (
            <div className="space-y-2">
              {(["owner", "manager", "bartender", "server", "kitchen", "driver"] as Role[]).map((role) => {
                const icons: Record<Role, any> = { owner: ShieldAlert, manager: UserCheck, bartender: Coffee, server: Users, kitchen: Flame, driver: Truck };
                const Icon = icons[role];
                const descs: Record<Role, string> = { owner: "Full access · Command Center", manager: "Team oversight · Approvals · Pay Outs", bartender: "Bar ops · Tabs · ID checks", server: "FOH · Orders · Tables", kitchen: "Prep · Line · Closing", driver: "Deliveries · EOD reports" };
                return (
                  <button key={role} onClick={() => setSelectedRole(role)} className="w-full flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 transition-all">
                    <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center">
                      <Icon size={16} className="text-amber-500" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-white font-semibold capitalize text-sm">{role}</p>
                      <p className="text-zinc-500 text-[11px]">{descs[role]}</p>
                    </div>
                    <ChevronRight size={14} className="text-zinc-600" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div>
              <button onClick={() => { setSelectedRole(null); setPin(""); }} className="text-amber-500 text-sm mb-4 flex items-center gap-1">
                <ChevronLeft size={14} /> Back
              </button>
              <div className="space-y-1.5 mb-5 max-h-[200px] overflow-y-auto">
                {STAFF.filter(s => s.role === selectedRole && s.active).map(s => (
                  <button key={s.id} onClick={() => { setUser(s); setScreen("welcome"); }} className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 transition-all">
                    <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <span className="text-amber-500 text-[10px] font-bold">{s.name.charAt(0)}</span>
                    </div>
                    <span className="text-white text-sm">{s.name}</span>
                    {s.isKey && <span className="text-amber-500 text-[9px] ml-auto px-1.5 py-0.5 rounded bg-amber-500/10">KEY</span>}
                    {s.streak > 7 && <Flame size={10} className="text-orange-500" />}
                  </button>
                ))}
              </div>
              {/* PIN */}
              <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
                <p className="text-zinc-400 text-[10px] mb-2 uppercase tracking-wider">Or enter PIN</p>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex gap-1.5 flex-1">
                    {[0,1,2,3].map(i => (
                      <div key={i} className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-lg font-bold ${pin.length > i ? 'border-amber-500 text-amber-500' : 'border-zinc-700 text-zinc-700'}`}>
                        {pin.length > i ? (showPin ? pin[i] : "•") : ""}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setShowPin(!showPin)} className="text-zinc-500 p-1">
                    {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[1,2,3,4,5,6,7,8,9,null,0,"⌫"].map((n, i) => (
                    <button key={i} onClick={() => {
                      if (n === "⌫") setPin(p => p.slice(0, -1));
                      else if (n !== null && pin.length < 4) {
                        const newPin = pin + n;
                        setPin(newPin);
                        if (newPin.length === 4) {
                          const found = STAFF.find(s => s.pin === newPin);
                          if (found) { setUser(found); setScreen("welcome"); }
                          else { setPin(""); toast.error("Invalid PIN"); }
                        }
                      }
                    }} className={`h-10 rounded-lg font-bold text-base transition-all ${n === null ? 'invisible' : 'bg-zinc-800 text-white hover:bg-zinc-700 active:bg-amber-500 active:text-black'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ─── WELCOME ──────────────────────────────────────────────────────
  const WelcomeScreen = () => (
    <div className="h-screen bg-black flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-5">
          <Zap size={24} className="text-amber-500" />
        </div>
        <h1 className="text-xl font-black text-white mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.03em" }}>
          WELCOME TO THE NEW WAVE
        </h1>
        <p className="text-zinc-400 text-sm mb-1">
          Hey <span className="text-amber-500 font-semibold">{user?.name?.split(" ")[0]}</span> — thanks for being here.
        </p>
        <p className="text-zinc-600 text-xs mb-6 leading-relaxed">
          This is Community Tap's People Platform v1. Your shifts, your schedule, your growth — it all lives here now.
        </p>
        <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400 text-[10px] uppercase">Your Score</span>
            <span className="text-amber-500 font-bold">{user?.score?.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Flame size={12} className="text-orange-500" />
              <span className="text-white text-xs">{user?.streak}d streak</span>
            </div>
            <div className="flex items-center gap-1">
              <Trophy size={12} className="text-yellow-500" />
              <span className="text-white text-xs">#{STAFF.filter(s => s.active).sort((a,b) => b.score - a.score).findIndex(s => s.id === user?.id) + 1} rank</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 mb-6">
          <Wifi size={12} className="text-green-500" />
          <span className="text-green-500 text-[10px]">Connected to CTap Wi-Fi</span>
        </div>
        <button onClick={() => setScreen("briefing")} className="w-full py-3 rounded-xl bg-amber-500 text-black font-bold text-sm">
          See Today's Briefing <ArrowRight size={14} className="inline ml-1" />
        </button>
      </div>
    </div>
  );

  // ─── BRIEFING ──────────────────────────────────────────────────────
  const BriefingScreen = () => (
    <div className="h-screen bg-black flex flex-col overflow-y-auto pb-6">
      <div className="p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-black text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>TODAY'S BRIEFING</h2>
            <p className="text-zinc-500 text-[10px]">{BRIEFING.date}</p>
          </div>
          <Sun size={18} className="text-amber-500" />
        </div>
        <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 mb-3">
          <p className="text-zinc-400 text-[10px] uppercase mb-2">Yesterday</p>
          <div className="flex gap-6">
            <div><p className="text-xl font-bold text-white">{BRIEFING.yesterdaySales}</p><p className="text-zinc-500 text-[10px]">sales</p></div>
            <div><p className="text-xl font-bold text-white">{BRIEFING.yesterdayOrders}</p><p className="text-zinc-500 text-[10px]">orders</p></div>
          </div>
          <p className="text-yellow-500 text-xs mt-2 flex items-center gap-1"><Trophy size={10} />{BRIEFING.topPerformer}</p>
        </div>
        {BRIEFING.eightySixed.length > 0 && (
          <div className="bg-red-950/30 rounded-xl p-3 border border-red-900/50 mb-3">
            <p className="text-red-400 text-[10px] uppercase mb-1 flex items-center gap-1"><AlertTriangle size={10} />86'd Today</p>
            {BRIEFING.eightySixed.map((item, i) => <p key={i} className="text-white text-sm">{item}</p>)}
          </div>
        )}
        <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 mb-3">
          <p className="text-zinc-400 text-[10px] uppercase mb-1">Specials</p>
          {BRIEFING.specials.map((s, i) => <p key={i} className="text-white text-sm">• {s}</p>)}
        </div>
        <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 mb-3">
          <p className="text-zinc-400 text-[10px] uppercase mb-1">Open Issues</p>
          {BRIEFING.issues.map((issue, i) => (
            <div key={i} className="flex items-start gap-2 mb-1">
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${issue.status === 'resolved' ? 'bg-green-500' : 'bg-amber-500'}`} />
              <p className="text-white text-sm">{issue.text}</p>
            </div>
          ))}
        </div>
        <div className="bg-amber-500/10 rounded-xl p-3 border border-amber-500/30 mb-4">
          <p className="text-amber-500 text-[10px] uppercase mb-1">Heads Up</p>
          <p className="text-white text-sm">{BRIEFING.message}</p>
        </div>
        <button onClick={() => setScreen("hub")} className="w-full py-3 rounded-xl bg-amber-500 text-black font-bold text-sm">
          Open Hub <ArrowRight size={14} className="inline ml-1" />
        </button>
      </div>
    </div>
  );

  // ─── HUB ──────────────────────────────────────────────────────
  const HubScreen = () => {
    const roleKey = user?.role || "server";
    const lists = CHECKLISTS[roleKey] || [];
    const totalTasks = lists.reduce((s, c) => s + c.items.length, 0);
    const doneTasks = Object.values(checklistProgress).filter(Boolean).length;

    const navItems = [
      { icon: ClipboardCheck, label: "Checklists", screen: "checklist" as Screen, color: "text-green-500", bg: "bg-green-500/10" },
      { icon: MessageSquare, label: "Team Chat", screen: "chat" as Screen, color: "text-blue-500", bg: "bg-blue-500/10" },
      { icon: AlertTriangle, label: "Issues", screen: "issues" as Screen, color: "text-red-500", bg: "bg-red-500/10" },
      { icon: Calendar, label: "Schedule", screen: "schedule" as Screen, color: "text-purple-500", bg: "bg-purple-500/10" },
      { icon: Search, label: "Void Hunter", screen: "voids" as Screen, color: "text-orange-500", bg: "bg-orange-500/10" },
      { icon: BookOpen, label: "SOPs", screen: "sops" as Screen, color: "text-cyan-500", bg: "bg-cyan-500/10" },
      { icon: Send, label: "Feedback", screen: "feedback" as Screen, color: "text-pink-500", bg: "bg-pink-500/10" },
      { icon: Facebook, label: "Social Post", screen: "social" as Screen, color: "text-blue-400", bg: "bg-blue-400/10" },
      { icon: Receipt, label: "Store Runs", screen: "store-run" as Screen, color: "text-emerald-500", bg: "bg-emerald-500/10" },
      { icon: Package, label: "Invoices", screen: "invoices" as Screen, color: "text-teal-500", bg: "bg-teal-500/10" },
    ];
    if (user?.role === "driver") navItems.push({ icon: Truck, label: "Driver EOD", screen: "driver-eod" as Screen, color: "text-amber-500", bg: "bg-amber-500/10" });
    if (user?.role === "owner" || user?.role === "manager") navItems.push({ icon: BarChart3, label: "Command", screen: "command" as Screen, color: "text-amber-500", bg: "bg-amber-500/10" });

    return (
      <div className="h-screen bg-black flex flex-col overflow-y-auto pb-20">
        {/* Header */}
        <div className="p-3 flex items-center justify-between border-b border-zinc-900">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
              <span className="text-amber-500 text-xs font-bold">{user?.name?.charAt(0)}</span>
            </div>
            <div>
              <p className="text-white text-sm font-semibold">{user?.name?.split(" ")[0]}</p>
              <div className="flex items-center gap-1.5">
                <Wifi size={9} className="text-green-500" /><span className="text-green-500 text-[9px]">On Floor</span>
                <Flame size={9} className="text-orange-500" /><span className="text-orange-500 text-[9px]">{user?.streak}d</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setScreen("leaderboard")}><Trophy size={16} className="text-amber-500" /></button>
            <button onClick={() => setScreen("profile")} className="relative">
              <Bell size={16} className="text-zinc-400" />
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
          </div>
        </div>

        {/* Score */}
        <div className="px-3 py-2 bg-zinc-950 border-b border-zinc-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div><p className="text-amber-500 font-bold">{user?.score?.toLocaleString()}</p><p className="text-zinc-600 text-[8px] uppercase">Score</p></div>
            <div className="w-px h-6 bg-zinc-800" />
            <div><p className="text-white font-bold text-sm">#{STAFF.filter(s => s.active).sort((a,b) => b.score - a.score).findIndex(s => s.id === user?.id) + 1}</p><p className="text-zinc-600 text-[8px] uppercase">Rank</p></div>
            <div className="w-px h-6 bg-zinc-800" />
            <div><p className="text-white font-bold text-sm">{doneTasks}/{totalTasks}</p><p className="text-zinc-600 text-[8px] uppercase">Tasks</p></div>
          </div>
          {user?.isKey && <span className="text-amber-500 text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30">KEY EMPLOYEE</span>}
        </div>

        {/* Grid */}
        <div className="p-3">
          <div className="grid grid-cols-3 gap-2">
            {navItems.map((item, i) => (
              <button key={i} onClick={() => setScreen(item.screen)} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all">
                <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center`}>
                  <item.icon size={16} className={item.color} />
                </div>
                <span className="text-white text-[10px] font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Live Feed */}
        <div className="px-3">
          <p className="text-zinc-400 text-[10px] uppercase tracking-wider mb-2">Live Feed</p>
          <div className="space-y-1.5">
            {[
              { icon: CheckCircle2, color: "text-green-500", time: "2 min", text: "Karlee completed Opening Bar checklist" },
              { icon: Receipt, color: "text-emerald-500", time: "18 min", text: "Jessica — Pay Out $85 (Hy-Vee bread run)" },
              { icon: WifiOff, color: "text-yellow-500", time: "22 min", text: "Bryson disconnected from Wi-Fi (8 min)" },
              { icon: AlertTriangle, color: "text-red-500", time: "45 min", text: "Void flagged: Samantha — 3rd void this shift" },
              { icon: Package, color: "text-teal-500", time: "1h", text: "Tom received Sawyer's Meats delivery — $788.54" },
            ].map((item, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <item.icon size={10} className={item.color} />
                  <span className="text-zinc-500 text-[9px]">{item.time} ago</span>
                </div>
                <p className="text-white text-xs">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ─── STORE RUN / PAY OUT ──────────────────────────────────────────────────────
  const StoreRunScreen = () => (
    <div className="h-screen bg-black flex flex-col overflow-y-auto pb-20">
      <ScreenHeader title="STORE RUNS & PAY OUTS" subtitle="Receipt capture · Manager approval required" />
      <div className="p-4 space-y-3">
        {/* New Store Run Button */}
        <button onClick={() => toast.info("Camera opening — snap receipt photo")} className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2">
          <Camera size={16} /> Log New Store Run
        </button>

        {/* Authorization Rule */}
        <div className="bg-amber-500/10 rounded-xl p-3 border border-amber-500/30">
          <p className="text-amber-500 text-[10px] uppercase font-semibold mb-1">Authorization Rule</p>
          <p className="text-zinc-300 text-xs">Only KEY employees can hand cash for pay outs: Mychael, Sally, Gavin, Moe, Tom, Che, Steven</p>
        </div>

        {/* Weekly Total */}
        <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
          <div className="flex items-center justify-between">
            <p className="text-zinc-400 text-[10px] uppercase">This Week's Pay Outs</p>
            <p className="text-white font-bold">${PAYOUTS.reduce((s, p) => s + p.amount, 0).toFixed(2)}</p>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-red-400 text-xs">{PAYOUTS.filter(p => p.flagged).length} flagged</span>
            <span className="text-zinc-500 text-xs">{PAYOUTS.filter(p => !p.managerSigned).length} unsigned</span>
          </div>
        </div>

        {/* Pay Out Log */}
        <p className="text-zinc-400 text-[10px] uppercase tracking-wider">Recent Pay Outs</p>
        {PAYOUTS.map((po) => (
          <div key={po.id} className={`p-3 rounded-xl border ${po.flagged ? 'bg-red-950/20 border-red-900/50' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-white text-sm font-medium">{po.who}</span>
              <span className="text-amber-500 font-bold text-sm">${po.amount.toFixed(2)}</span>
            </div>
            <p className="text-zinc-400 text-xs">{po.description} · {po.vendor}</p>
            <p className="text-zinc-500 text-[10px]">{po.date} {po.time} · Acct: {po.account} ({po.accountNum})</p>
            <div className="flex items-center gap-2 mt-2">
              {po.receiptAttached ? <span className="text-green-500 text-[9px] flex items-center gap-0.5"><CheckCircle2 size={8} />Receipt</span> : <span className="text-red-400 text-[9px] flex items-center gap-0.5"><X size={8} />No receipt</span>}
              {po.managerSigned ? <span className="text-green-500 text-[9px] flex items-center gap-0.5"><CheckCircle2 size={8} />Signed</span> : <span className="text-red-400 text-[9px] flex items-center gap-0.5"><X size={8} />Unsigned</span>}
            </div>
            {po.flagged && <p className="text-red-400 text-[10px] mt-1.5 bg-red-500/10 rounded p-1.5">⚠️ {po.flagReason}</p>}
          </div>
        ))}
      </div>
    </div>
  );

  // ─── INVOICES / VENDOR TRACKING ──────────────────────────────────────────────
  const InvoiceScreen = () => (
    <div className="h-screen bg-black flex flex-col overflow-y-auto pb-20">
      <ScreenHeader title="VENDOR INVOICES" subtitle="Weekly spend tracking" />
      <div className="p-4 space-y-3">
        <button onClick={() => toast.info("Camera opening — snap invoice photo")} className="w-full py-3 rounded-xl bg-teal-600 text-white font-bold text-sm flex items-center justify-center gap-2">
          <Camera size={16} /> Snap New Invoice
        </button>

        {/* Weekly Vendor Spend */}
        <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
          <p className="text-zinc-400 text-[10px] uppercase mb-2">This Week's Vendor Spend</p>
          <p className="text-white text-2xl font-bold">${INVOICES.reduce((s, inv) => s + inv.grandTotal, 0).toFixed(2)}</p>
          <div className="mt-2 space-y-1">
            {[
              { vendor: "Sawyer's Meats", total: 1870.09, color: "bg-red-500" },
              { vendor: "Hy-Vee", total: 84.21, color: "bg-blue-500" },
              { vendor: "Fareway", total: 31.45, color: "bg-green-500" },
              { vendor: "Dollar General", total: 21.69, color: "bg-yellow-500" },
            ].map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${v.color}`} />
                <span className="text-zinc-300 text-xs flex-1">{v.vendor}</span>
                <span className="text-white text-xs font-medium">${v.total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Invoice List */}
        <p className="text-zinc-400 text-[10px] uppercase tracking-wider">Recent Invoices</p>
        {INVOICES.map((inv) => (
          <div key={inv.id} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
            <div className="p-3 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">{inv.vendor}</p>
                  <p className="text-zinc-500 text-[10px]">{inv.date} · Ordered by {inv.orderedBy} · {inv.category}</p>
                </div>
                <p className="text-amber-500 font-bold">${inv.grandTotal.toFixed(2)}</p>
              </div>
            </div>
            <div className="p-2">
              {inv.items.slice(0, 3).map((item, i) => (
                <div key={i} className="flex items-center justify-between py-0.5 px-1">
                  <span className="text-zinc-400 text-[10px]">{item.name} ({item.qty})</span>
                  <span className="text-zinc-300 text-[10px]">{item.total}</span>
                </div>
              ))}
              {inv.items.length > 3 && <p className="text-zinc-600 text-[9px] px-1">+{inv.items.length - 3} more items</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ─── CHECKLIST ──────────────────────────────────────────────────────
  const ChecklistScreen = () => {
    const roleKey = user?.role || "server";
    const lists = CHECKLISTS[roleKey] || [];
    return (
      <div className="h-screen bg-black flex flex-col overflow-y-auto pb-20">
        <ScreenHeader title="CHECKLISTS" subtitle={`${roleKey} · ${Object.values(checklistProgress).filter(Boolean).length} completed`} />
        <div className="p-4 space-y-3">
          {lists.map((cl, ci) => (
            <div key={ci} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <div className="p-3 border-b border-zinc-800">
                <p className="text-white font-semibold text-sm">{cl.title}</p>
                <p className="text-zinc-500 text-[10px]">{cl.items.filter((_, i) => checklistProgress[`${ci}-${i}`]).length}/{cl.items.length}</p>
              </div>
              <div className="p-2 space-y-0.5">
                {cl.items.map((item, ii) => {
                  const key = `${ci}-${ii}`;
                  const done = checklistProgress[key];
                  return (
                    <button key={ii} onClick={() => setChecklistProgress(p => ({ ...p, [key]: !p[key] }))} className={`w-full flex items-center gap-2 p-2 rounded-lg transition-all ${done ? 'bg-green-500/10' : 'hover:bg-zinc-800'}`}>
                      {done ? <CheckCircle2 size={14} className="text-green-500 shrink-0" /> : <Circle size={14} className="text-zinc-600 shrink-0" />}
                      <span className={`text-xs text-left ${done ? 'text-zinc-500 line-through' : 'text-white'}`}>{item}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── CHAT ──────────────────────────────────────────────────────
  const ChatScreen = () => (
    <div className="h-screen bg-black flex flex-col">
      <ScreenHeader title="TEAM CHAT" subtitle="Shift communication" />
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {chatMessages.map((msg, i) => (
          <div key={i} className={`flex ${msg.from === user?.name?.split(" ")[0] ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-xl p-2.5 ${msg.from === user?.name?.split(" ")[0] ? 'bg-amber-500 text-black' : 'bg-zinc-900 border border-zinc-800'}`}>
              <p className={`text-[10px] font-semibold mb-0.5 ${msg.from === user?.name?.split(" ")[0] ? 'text-black/70' : 'text-amber-500'}`}>{msg.from}</p>
              <p className={`text-sm ${msg.from === user?.name?.split(" ")[0] ? 'text-black' : 'text-white'}`}>{msg.text}</p>
              <p className={`text-[9px] mt-0.5 ${msg.from === user?.name?.split(" ")[0] ? 'text-black/50' : 'text-zinc-500'}`}>{msg.time}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-zinc-900">
        <div className="flex gap-2">
          <input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50" onKeyDown={e => { if (e.key === "Enter" && newMessage.trim()) { setChatMessages(m => [...m, { from: user?.name?.split(" ")[0] || "You", text: newMessage, time: "now" }]); setNewMessage(""); }}} />
          <button onClick={() => { if (newMessage.trim()) { setChatMessages(m => [...m, { from: user?.name?.split(" ")[0] || "You", text: newMessage, time: "now" }]); setNewMessage(""); }}} className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
            <Send size={14} className="text-black" />
          </button>
        </div>
      </div>
    </div>
  );

  // ─── VOID HUNTER ──────────────────────────────────────────────────────
  const VoidScreen = () => (
    <div className="h-screen bg-black flex flex-col overflow-y-auto pb-20">
      <ScreenHeader title="VOID HUNTER" subtitle="Pattern tracking · This week" />
      <div className="p-4 space-y-3">
        <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-zinc-400 text-[10px] uppercase">This Week</p>
            <span className="text-amber-500 text-xs font-bold">9 total</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><p className="text-xl font-bold text-white">5</p><p className="text-zinc-500 text-[9px]">Voids</p></div>
            <div><p className="text-xl font-bold text-white">3</p><p className="text-zinc-500 text-[9px]">Comps</p></div>
            <div><p className="text-xl font-bold text-white">1</p><p className="text-zinc-500 text-[9px]">Promos</p></div>
          </div>
        </div>
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="p-3 border-b border-zinc-800"><p className="text-zinc-400 text-[10px] uppercase">By Employee</p></div>
          {STAFF.filter(s => s.voids > 0).sort((a,b) => b.voids - a.voids).map((s, i) => (
            <div key={i} className={`flex items-center justify-between p-2.5 border-b border-zinc-800 last:border-0 ${s.voids >= 3 ? 'bg-red-950/20' : ''}`}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center"><span className="text-zinc-400 text-[9px]">{s.name.charAt(0)}</span></div>
                <span className="text-white text-sm">{s.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-sm font-bold ${s.voids >= 3 ? 'text-red-500' : s.voids >= 2 ? 'text-yellow-500' : 'text-zinc-400'}`}>{s.voids}</span>
                {s.voids >= 3 && <AlertTriangle size={10} className="text-red-500" />}
              </div>
            </div>
          ))}
        </div>
        <p className="text-zinc-400 text-[10px] uppercase tracking-wider">Recent Voids</p>
        {[
          { who: "Samantha", item: "Large Community Special", reason: "Customer changed mind", time: "Today 6:42 PM", flag: true },
          { who: "Samantha", item: "12 Wings", reason: "Rang wrong item", time: "Today 5:18 PM", flag: true },
          { who: "Bryson", item: "Pitcher Bud Light", reason: "Wrong tab — 3% fee applied", time: "Today 4:55 PM", flag: false },
          { who: "Samantha", item: "Nachos Beef", reason: "Customer left", time: "Yesterday 8:12 PM", flag: true },
        ].map((v, i) => (
          <div key={i} className={`p-2.5 rounded-lg border ${v.flag ? 'bg-red-950/20 border-red-900/50' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-white text-sm font-medium">{v.who}</span>
              <span className="text-zinc-500 text-[9px]">{v.time}</span>
            </div>
            <p className="text-zinc-400 text-xs">{v.item} — "{v.reason}"</p>
            {v.flag && <p className="text-red-400 text-[9px] mt-1">⚠️ Pattern detected — manager nudge sent</p>}
          </div>
        ))}
      </div>
    </div>
  );

  // ─── DRIVER EOD ──────────────────────────────────────────────────────
  const DriverEODScreen = () => (
    <div className="h-screen bg-black flex flex-col overflow-y-auto pb-20">
      <ScreenHeader title="DRIVER END OF DAY" subtitle="Required before clocking out" />
      <div className="p-4 space-y-3">
        <div className="bg-red-950/30 rounded-xl p-2.5 border border-red-900/50">
          <p className="text-red-400 text-xs font-semibold">⚠️ No sheet = No reimbursement. Manager must hand you cash — not front staff.</p>
        </div>
        {[
          { key: "outOfTown", label: "Out-of-Town Runs", placeholder: "Where? (leave blank if none)" },
          { key: "specialRuns", label: "Special Runs", placeholder: "Catering, non-standard deliveries" },
          { key: "cashFromTill", label: "Cash From Till", placeholder: "Amount + reason (e.g., $5 gas for Lehigh)" },
          { key: "redeliveries", label: "Redeliveries", placeholder: "Ticket # + reason (e.g., #4521 wrong address)" },
          { key: "notes", label: "Notes", placeholder: "Anything else" },
        ].map((field) => (
          <div key={field.key} className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
            <label className="text-zinc-400 text-[10px] uppercase block mb-1.5">{field.label}</label>
            <textarea value={(driverEOD as any)[field.key]} onChange={e => setDriverEOD(d => ({ ...d, [field.key]: e.target.value }))} placeholder={field.placeholder} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 min-h-[50px] resize-none" />
          </div>
        ))}
        <button onClick={() => toast.success("EOD Report submitted")} className="w-full py-3 rounded-xl bg-amber-500 text-black font-bold text-sm">Submit EOD Report</button>
      </div>
    </div>
  );

  // ─── SOCIAL ──────────────────────────────────────────────────────
  const SocialScreen = () => (
    <div className="h-screen bg-black flex flex-col overflow-y-auto pb-20">
      <ScreenHeader title="SOCIAL POST" subtitle="Post to earn · +10 pts per post" />
      <div className="p-4 space-y-3">
        <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
          <textarea value={socialPostText} onChange={e => setSocialPostText(e.target.value)} placeholder="What's happening at CTap today?" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 min-h-[80px] resize-none" />
          <div className="flex items-center gap-2 mt-2">
            <button className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 text-[10px]"><Camera size={12} />Photo</button>
            <button className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 text-[10px]"><MapPin size={12} />Location</button>
          </div>
        </div>
        <button onClick={() => { setSocialPostText(""); toast.success("+10 pts! Posted to Facebook"); }} className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-2">
          <Facebook size={14} /> Post · +10 pts
        </button>
      </div>
    </div>
  );

  // ─── FEEDBACK ──────────────────────────────────────────────────────
  const FeedbackScreen = () => (
    <div className="h-screen bg-black flex flex-col overflow-y-auto pb-20">
      <ScreenHeader title="SHIFT FEEDBACK" subtitle="Your voice matters · +5 pts" />
      <div className="p-4 space-y-3">
        <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
          <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="What worked? What didn't? What was blocked?" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 min-h-[100px] resize-none" />
          <div className="flex items-center gap-1.5 mt-2">
            {["Kitchen", "Bar", "FOH", "Equipment", "Staff"].map(t => <button key={t} className="px-2 py-1 rounded-full bg-zinc-800 text-zinc-400 text-[9px] border border-zinc-700">{t}</button>)}
          </div>
        </div>
        <button onClick={() => { setFeedbackText(""); toast.success("+5 pts! Feedback submitted"); }} className="w-full py-3 rounded-xl bg-amber-500 text-black font-bold text-sm">Submit · +5 pts</button>
      </div>
    </div>
  );

  // ─── LEADERBOARD ──────────────────────────────────────────────────────
  const LeaderboardScreen = () => (
    <div className="h-screen bg-black flex flex-col overflow-y-auto pb-20">
      <ScreenHeader title="LEADERBOARD" subtitle="Score = shift priority" />
      <div className="p-4">
        <div className="bg-amber-500/10 rounded-xl p-2.5 border border-amber-500/30 mb-3">
          <p className="text-amber-500 text-[10px]">Higher score = first pick on preferred shifts. Execute, contribute, stay on the floor.</p>
        </div>
        <div className="space-y-1.5">
          {STAFF.filter(s => s.active && s.role !== "owner").sort((a,b) => b.score - a.score).map((s, i) => (
            <div key={s.id} className={`flex items-center gap-2 p-2.5 rounded-xl border ${s.id === user?.id ? 'bg-amber-500/10 border-amber-500/30' : 'bg-zinc-900 border-zinc-800'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-zinc-300 text-black' : i === 2 ? 'bg-amber-700 text-white' : 'bg-zinc-800 text-zinc-400'}`}>{i + 1}</div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{s.name}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500 text-[9px] capitalize">{s.role}</span>
                  {s.isKey && <span className="text-amber-500 text-[8px]">KEY</span>}
                  {s.streak > 7 && <span className="text-orange-500 text-[9px] flex items-center gap-0.5"><Flame size={7} />{s.streak}d</span>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-amber-500 font-bold text-sm">{s.score.toLocaleString()}</p>
                <p className="text-zinc-500 text-[9px]">{s.voids}v</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── SCHEDULE ──────────────────────────────────────────────────────
  const ScheduleScreen = () => (
    <div className="h-screen bg-black flex flex-col overflow-y-auto pb-20">
      <ScreenHeader title="SCHEDULE" subtitle="Earned by merit" />
      <div className="p-4 space-y-2">
        <div className="bg-amber-500/10 rounded-xl p-2.5 border border-amber-500/30 mb-2">
          <p className="text-amber-500 text-xs font-semibold">Your priority: #{STAFF.filter(s => s.active).sort((a,b) => b.score - a.score).findIndex(s => s.id === user?.id) + 1} for next week's picks</p>
        </div>
        {["Mon 5/5", "Tue 5/6", "Wed 5/7", "Thu 5/8", "Fri 5/9", "Sat 5/10"].map((day, i) => (
          <div key={i} className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
            <div className="flex items-center justify-between mb-1">
              <p className="text-white font-semibold text-sm">{day}</p>
              {i < 3 ? <span className="text-green-500 text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/10">Confirmed</span> : <span className="text-zinc-500 text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-800">Open</span>}
            </div>
            {i < 3 && <p className="text-zinc-400 text-xs">{["4 PM - Close", "11 AM - 4 PM", "4 PM - Close"][i]} · {user?.role}</p>}
            {i >= 3 && <p className="text-zinc-500 text-[10px] italic">Shift picks open — based on leaderboard rank</p>}
          </div>
        ))}
      </div>
    </div>
  );

  // ─── ISSUES ──────────────────────────────────────────────────────
  const IssuesScreen = () => (
    <div className="h-screen bg-black flex flex-col overflow-y-auto pb-20">
      <ScreenHeader title="ISSUES" subtitle="Report → Route → Resolve" />
      <div className="p-4 space-y-3">
        <button onClick={() => toast.info("Feature coming soon")} className="w-full py-3 rounded-xl bg-red-600 text-white font-bold text-sm flex items-center justify-center gap-2"><Plus size={14} />Report Issue</button>
        {[
          { title: "Fryer thermostat inconsistent", status: "pending", assigned: "Maintenance", time: "2 days" },
          { title: "POS terminal 2 freezing during rush", status: "investigating", assigned: "PDQ Support", time: "1 day" },
          { title: "Walk-in cooler seal needs replacing", status: "scheduled", assigned: "Maintenance", time: "3 days" },
          { title: "Keg room temp sensor", status: "resolved", assigned: "Mychael", time: "Today" },
        ].map((issue, i) => (
          <div key={i} className={`p-3 rounded-xl border ${issue.status === 'resolved' ? 'bg-green-950/20 border-green-900/50' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-white text-sm font-medium">{issue.title}</p>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${issue.status === 'resolved' ? 'bg-green-500/20 text-green-400' : issue.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-purple-500/20 text-purple-400'}`}>{issue.status}</span>
            </div>
            <p className="text-zinc-500 text-xs">→ {issue.assigned} · {issue.time} ago</p>
          </div>
        ))}
      </div>
    </div>
  );

  // ─── SOPs ──────────────────────────────────────────────────────
  const SOPScreen = () => (
    <div className="h-screen bg-black flex flex-col overflow-y-auto pb-20">
      <ScreenHeader title="SOPs" subtitle="One source of truth" />
      <div className="p-4 space-y-2">
        {[
          { title: "Phone Order Procedures", cat: "FOH", desc: "Repeat-back rule, mods, DoorDash process" },
          { title: "Kitchen Protocol & Final Warning", cat: "Kitchen", desc: "Expectations, consequences, signed" },
          { title: "Dress Code", cat: "All", desc: "CTap shirt, no sweats, hats forward" },
          { title: "Break Policy", cat: "All", desc: "Clock out, no cars, write-up rules" },
          { title: "Void & Comp Procedures", cat: "FOH/Bar", desc: "Manager approval, reason logging" },
          { title: "ID Policy", cat: "Bar", desc: "Must ID anyone appearing under 21" },
          { title: "POS: Tabs & Splitting", cat: "Bar", desc: "PDQ procedures, 3% wrong-tab fee" },
          { title: "Driver Expectations", cat: "Drivers", desc: "Between runs = dishes, EOD required" },
          { title: "Store Run Rules", cat: "All", desc: "Key employee hands cash, receipt required" },
          { title: "Pizza Closing (23 items)", cat: "Kitchen", desc: "Must be hung on ticket holder nightly" },
          { title: "Recipe Cards", cat: "Kitchen", desc: "C-Mac, Philly Cheese, specs by size" },
        ].map((sop, i) => (
          <div key={i} className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-white text-sm font-medium">{sop.title}</p>
              <span className="text-amber-500 text-[8px] px-1.5 py-0.5 rounded-full bg-amber-500/10">{sop.cat}</span>
            </div>
            <p className="text-zinc-500 text-[10px]">{sop.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );

  // ─── COMMAND CENTER ──────────────────────────────────────────────────────
  const CommandScreen = () => (
    <div className="h-screen bg-black flex flex-col overflow-y-auto pb-20">
      <ScreenHeader title="COMMAND CENTER" subtitle="Owner intelligence · 10 buckets" />
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Today's Sales", value: "$4,218", trend: "+12%", color: "text-green-500" },
            { label: "Labor %", value: "28.5%", trend: "On target", color: "text-green-500" },
            { label: "Voids Today", value: "3", trend: "⚠️ Flag", color: "text-red-500" },
            { label: "Pay Outs", value: "$99.50", trend: "2 unsigned", color: "text-yellow-500" },
            { label: "Active Staff", value: "8/10", trend: "2 off-wifi", color: "text-yellow-500" },
            { label: "Vendor Spend", value: "$2,007", trend: "This week", color: "text-teal-500" },
          ].map((kpi, i) => (
            <div key={i} className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
              <p className="text-zinc-400 text-[9px] uppercase">{kpi.label}</p>
              <p className="text-white text-lg font-bold">{kpi.value}</p>
              <p className={`text-[10px] ${kpi.color}`}>{kpi.trend}</p>
            </div>
          ))}
        </div>

        {/* 10 Buckets */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="p-3 border-b border-zinc-800"><p className="text-white font-semibold text-sm">10 Intelligence Buckets</p></div>
          {[
            { name: "System", value: "$56", status: "active" },
            { name: "Checklists", value: "$280", status: "active" },
            { name: "Feedback Loops", value: "$600", status: "active" },
            { name: "Data Products", value: "$224", status: "active" },
            { name: "Theft & Waste", value: "$450", status: "new" },
            { name: "Labor Optimization", value: "$320", status: "new" },
            { name: "Vendor Intelligence", value: "$180", status: "new" },
            { name: "Customer Retention", value: "$275", status: "new" },
            { name: "Training ROI", value: "$150", status: "new" },
            { name: "Forecasting", value: "—", status: "roadmap" },
          ].map((b, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 border-b border-zinc-800 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 text-[9px] w-3">{i+1}</span>
                <span className="text-white text-xs">{b.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-amber-500 text-xs">{b.value}</span>
                <span className={`text-[8px] px-1 py-0.5 rounded-full ${b.status === 'active' ? 'bg-green-500/20 text-green-400' : b.status === 'new' ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-700 text-zinc-400'}`}>{b.status}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Wi-Fi */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="p-3 border-b border-zinc-800"><p className="text-white font-semibold text-sm flex items-center gap-1.5"><Wifi size={12} className="text-green-500" />Wi-Fi Proximity</p></div>
          {STAFF.filter(s => s.active && s.role !== "owner").map((s, i) => (
            <div key={i} className="flex items-center justify-between p-2 border-b border-zinc-800 last:border-0">
              <div className="flex items-center gap-1.5">
                {s.wifiConnected ? <Wifi size={10} className="text-green-500" /> : <WifiOff size={10} className="text-red-500" />}
                <span className="text-white text-xs">{s.name}</span>
              </div>
              <span className={`text-[9px] ${s.wifiConnected ? 'text-green-500' : 'text-red-400'}`}>{s.wifiConnected ? "On floor" : "Off · 8 min"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── PROFILE ──────────────────────────────────────────────────────
  const ProfileScreen = () => (
    <div className="h-screen bg-black flex flex-col overflow-y-auto pb-20">
      <ScreenHeader title="PROFILE" subtitle={user?.name || ""} />
      <div className="p-4 space-y-3">
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-2">
            <span className="text-amber-500 text-xl font-bold">{user?.name?.charAt(0)}</span>
          </div>
          <p className="text-white font-bold">{user?.name}</p>
          <p className="text-zinc-400 text-sm capitalize">{user?.role}</p>
          {user?.isKey && <span className="text-amber-500 text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 inline-block mt-1">KEY EMPLOYEE</span>}
          <div className="flex items-center justify-center gap-4 mt-3">
            <div><p className="text-amber-500 font-bold text-lg">{user?.score?.toLocaleString()}</p><p className="text-zinc-500 text-[9px]">Score</p></div>
            <div className="w-px h-6 bg-zinc-800" />
            <div><p className="text-white font-bold text-lg">{user?.streak}</p><p className="text-zinc-500 text-[9px]">Streak</p></div>
            <div className="w-px h-6 bg-zinc-800" />
            <div><p className="text-white font-bold text-lg">{user?.badges?.length}</p><p className="text-zinc-500 text-[9px]">Badges</p></div>
          </div>
        </div>
        <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
          <p className="text-zinc-400 text-[10px] uppercase mb-2">Badges</p>
          <div className="flex flex-wrap gap-1.5">
            {user?.badges?.map((b, i) => <span key={i} className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px]">{b}</span>)}
          </div>
        </div>
        <button onClick={() => { setUser(null); setScreen("login"); setPin(""); setSelectedRole(null); setChecklistProgress({}); }} className="w-full py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-red-400 font-bold text-sm flex items-center justify-center gap-2">
          <LogOut size={14} /> End Shift & Log Out
        </button>
      </div>
    </div>
  );

  // ─── Shared Header ──────────────────────────────────────────────────────
  function ScreenHeader({ title, subtitle }: { title: string; subtitle: string }) {
    return (
      <div className="p-3 border-b border-zinc-900 flex items-center gap-2">
        <button onClick={() => setScreen("hub")} className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center"><ChevronLeft size={14} className="text-zinc-400" /></button>
        <div>
          <h2 className="text-white font-black text-sm" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.04em" }}>{title}</h2>
          <p className="text-zinc-500 text-[9px]">{subtitle}</p>
        </div>
      </div>
    );
  }

  // ─── Bottom Nav ──────────────────────────────────────────────────────
  const showNav = !["splash", "login", "welcome", "briefing"].includes(screen);
  const BottomNav = () => {
    if (!showNav) return null;
    const items = [
      { icon: Home, label: "Hub", s: "hub" as Screen },
      { icon: ClipboardCheck, label: "Tasks", s: "checklist" as Screen },
      { icon: MessageSquare, label: "Chat", s: "chat" as Screen },
      { icon: Trophy, label: "Board", s: "leaderboard" as Screen },
      { icon: (user?.role === "owner" || user?.role === "manager") ? BarChart3 : Users, label: (user?.role === "owner" || user?.role === "manager") ? "Command" : "Profile", s: (user?.role === "owner" || user?.role === "manager") ? "command" as Screen : "profile" as Screen },
    ];
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-900 px-1 py-1.5 flex items-center justify-around z-50">
        {items.map((nav, i) => (
          <button key={i} onClick={() => setScreen(nav.s)} className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg ${screen === nav.s ? 'text-amber-500' : 'text-zinc-500'}`}>
            <nav.icon size={16} />
            <span className="text-[8px]">{nav.label}</span>
          </button>
        ))}
      </div>
    );
  };

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-black overflow-hidden">
      {screen === "splash" && <SplashScreen />}
      {screen === "login" && <LoginScreen />}
      {screen === "welcome" && <WelcomeScreen />}
      {screen === "briefing" && <BriefingScreen />}
      {screen === "hub" && <HubScreen />}
      {screen === "checklist" && <ChecklistScreen />}
      {screen === "chat" && <ChatScreen />}
      {screen === "social" && <SocialScreen />}
      {screen === "driver-eod" && <DriverEODScreen />}
      {screen === "voids" && <VoidScreen />}
      {screen === "feedback" && <FeedbackScreen />}
      {screen === "leaderboard" && <LeaderboardScreen />}
      {screen === "schedule" && <ScheduleScreen />}
      {screen === "issues" && <IssuesScreen />}
      {screen === "sops" && <SOPScreen />}
      {screen === "command" && <CommandScreen />}
      {screen === "profile" && <ProfileScreen />}
      {screen === "store-run" && <StoreRunScreen />}
      {screen === "invoices" && <InvoiceScreen />}
      <BottomNav />
    </div>
  );
}
