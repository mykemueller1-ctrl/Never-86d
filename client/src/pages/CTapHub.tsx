/**
 * CTap People Platform — Active Beat Testing v1
 * by Never 86'd · Community Tap & Pizza · Fort Dodge, Iowa
 * 
 * Design: Night Shift Dark — true black, amber primary, built for shift conditions
 * Fonts: Bebas Neue (headers), DM Sans (body), DM Mono (data/labels)
 * Flow: Splash → Login → Hub (role-based) → Checklist / Chat / Issues / Schedule / SOPs / Void Hunter
 */
import { useState, useEffect } from "react";
import {
  MessageSquare, CheckSquare, AlertTriangle, Star, ChevronRight, Send,
  Clock, User, Zap, ArrowLeft, Plus, X, Search, FileWarning, Calendar,
  BookOpen, Shield, Camera, Users, Home, LogOut, Trophy, TrendingUp,
  DollarSign, BarChart3, Eye, Bell
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────
type Role = "server" | "kitchen" | "bar" | "host" | "driver" | "dishwasher" | "pizza" | "manager";
type Screen = "splash" | "login" | "hub" | "checklist" | "issues" | "feedback" | "chat" | "schedule" | "sop" | "void" | "owner";

interface StaffMember {
  name: string;
  role: Role;
  pin: string;
  points: number;
  tier: "Bronze" | "Silver" | "Gold" | "Legend";
  shiftsThisWeek: number;
}

interface FeedMessage {
  id: number;
  from: string;
  role: string;
  time: string;
  text: string;
  type: "alert" | "info" | "praise" | "note";
}

interface ChecklistItem {
  id: number;
  task: string;
  done: boolean;
  required: boolean;
}

interface Issue {
  id: number;
  reporter: string;
  text: string;
  time: string;
  status: "open" | "resolved";
  category: string;
}

interface VoidEntry {
  id: number;
  employee: string;
  item: string;
  amount: number;
  time: string;
  type: "void" | "no-sale" | "discount" | "waste";
  severity: "low" | "medium" | "high" | "critical";
  reviewed: boolean;
}

interface ShiftSlot {
  id: number;
  day: string;
  time: string;
  role: Role;
  assignee: string;
  open: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const OWNER_PIN = "8686";
const MANAGER_PIN = "1234";

const STAFF_ROSTER: StaffMember[] = [
  { name: "Alex", role: "server", pin: "1111", points: 340, tier: "Silver", shiftsThisWeek: 4 },
  { name: "Jordan", role: "bar", pin: "2222", points: 520, tier: "Gold", shiftsThisWeek: 5 },
  { name: "Sam", role: "kitchen", pin: "3333", points: 180, tier: "Bronze", shiftsThisWeek: 3 },
  { name: "Casey", role: "pizza", pin: "4444", points: 760, tier: "Gold", shiftsThisWeek: 5 },
  { name: "Taylor", role: "driver", pin: "5555", points: 90, tier: "Bronze", shiftsThisWeek: 2 },
  { name: "Morgan", role: "dishwasher", pin: "6666", points: 420, tier: "Silver", shiftsThisWeek: 4 },
  { name: "Riley", role: "host", pin: "7777", points: 610, tier: "Gold", shiftsThisWeek: 5 },
  { name: "Jamie", role: "manager", pin: "8888", points: 980, tier: "Legend", shiftsThisWeek: 6 },
];

const TIER_COLORS: Record<string, string> = {
  Bronze: "#CD7F32",
  Silver: "#9CA3AF",
  Gold: "#F59E0B",
  Legend: "#EC4899",
};

const ROLE_CONFIG: Record<Role, { label: string; color: string; emoji: string; description: string }> = {
  server: { label: "Server / FOH", color: "#F59E0B", emoji: "🍽️", description: "Tables, guests, specials" },
  kitchen: { label: "Kitchen / BOH", color: "#EF4444", emoji: "🔥", description: "Prep, line, expo" },
  bar: { label: "Bar", color: "#3B82F6", emoji: "🍺", description: "Taps, spirits, cash" },
  host: { label: "Host", color: "#A855F7", emoji: "👋", description: "Door, seating, phones" },
  driver: { label: "Driver", color: "#10B981", emoji: "🚗", description: "Deliveries, routes" },
  dishwasher: { label: "Dishwasher", color: "#6B7280", emoji: "🧽", description: "Dish pit, sanitation" },
  pizza: { label: "Pizza Side", color: "#F97316", emoji: "🍕", description: "Dough, oven, toppings" },
  manager: { label: "Manager", color: "#60A5FA", emoji: "⚡", description: "Full access, all teams" },
};

const ROLE_CHECKLISTS: Record<Role, ChecklistItem[]> = {
  server: [
    { id: 1, task: "Check your section — tables clean, menus stocked", done: false, required: true },
    { id: 2, task: "Review today's specials with manager", done: false, required: true },
    { id: 3, task: "Confirm 86'd items from kitchen board", done: false, required: true },
    { id: 4, task: "Stock side station — napkins, silverware, condiments", done: false, required: true },
    { id: 5, task: "Check POS login works", done: false, required: true },
    { id: 6, task: "Walk cooler — know what's low", done: false, required: false },
  ],
  kitchen: [
    { id: 1, task: "Check prep list from last shift notes", done: false, required: true },
    { id: 2, task: "Verify all stations stocked and clean", done: false, required: true },
    { id: 3, task: "Pull BBQ from smoker — wrap and store immediately", done: false, required: true },
    { id: 4, task: "Check temp logs — cooler, freezer, line", done: false, required: true },
    { id: 5, task: "Confirm 86'd items updated on board", done: false, required: true },
    { id: 6, task: "Review any allergy or special order notes", done: false, required: false },
    { id: 7, task: "Knife kit clean and organized", done: false, required: false },
  ],
  bar: [
    { id: 1, task: "Count bank — verify opening drawer amount", done: false, required: true },
    { id: 2, task: "Stock beer cooler — check par levels", done: false, required: true },
    { id: 3, task: "Verify Tito's, Captain Morgan, Busch Light levels", done: false, required: true },
    { id: 4, task: "Check garnish tray — limes, lemons, olives", done: false, required: true },
    { id: 5, task: "Confirm tap lines — no foam issues", done: false, required: true },
    { id: 6, task: "Review specials and 86'd items", done: false, required: true },
    { id: 7, task: "Clean bar top, polish glasses", done: false, required: false },
  ],
  host: [
    { id: 1, task: "Check reservation list for tonight", done: false, required: true },
    { id: 2, task: "Confirm wait time board is accurate", done: false, required: true },
    { id: 3, task: "Ensure menus are clean and stocked", done: false, required: true },
    { id: 4, task: "Check phone system — voicemail cleared", done: false, required: true },
    { id: 5, task: "Wipe down host stand and entry area", done: false, required: false },
  ],
  driver: [
    { id: 1, task: "Check delivery bags — clean and insulated", done: false, required: true },
    { id: 2, task: "Verify phone is charged and GPS working", done: false, required: true },
    { id: 3, task: "Review pending delivery orders", done: false, required: true },
    { id: 4, task: "Confirm car has gas and is clean", done: false, required: true },
    { id: 5, task: "Check driver sheet — log start mileage", done: false, required: true },
  ],
  dishwasher: [
    { id: 1, task: "Check chemical levels — sanitizer, soap", done: false, required: true },
    { id: 2, task: "Verify dish machine temp is at 180°F", done: false, required: true },
    { id: 3, task: "Clear any dishes from last shift", done: false, required: true },
    { id: 4, task: "Organize clean dish storage area", done: false, required: true },
    { id: 5, task: "Check floor drains — clear and flowing", done: false, required: false },
  ],
  pizza: [
    { id: 1, task: "Check dough supply — prep if under par", done: false, required: true },
    { id: 2, task: "Verify oven temp — 500°F minimum", done: false, required: true },
    { id: 3, task: "Stock all toppings — cheese, meats, veggies", done: false, required: true },
    { id: 4, task: "Check sauce levels — red and white", done: false, required: true },
    { id: 5, task: "Clean pizza cutter and peel", done: false, required: true },
    { id: 6, task: "Review any special orders or mods", done: false, required: false },
  ],
  manager: [
    { id: 1, task: "Review last shift's feedback and issue log", done: false, required: true },
    { id: 2, task: "Post today's specials to the Hub", done: false, required: true },
    { id: 3, task: "Confirm staffing — all roles covered", done: false, required: true },
    { id: 4, task: "Check void report from last shift", done: false, required: true },
    { id: 5, task: "Update 86'd board — kitchen + bar", done: false, required: true },
    { id: 6, task: "Walk the floor — temp, cleanliness, setup", done: false, required: true },
    { id: 7, task: "Verify cash drawer counts", done: false, required: true },
    { id: 8, task: "Send shift briefing to Hub", done: false, required: false },
  ],
};

const INITIAL_FEED: FeedMessage[] = [
  { id: 1, from: "Myke (Owner)", role: "manager", time: "3:45 PM", text: "Tonight's special: Smoked Brisket Flatbread $14. We're running low on Domestic Bucket 6 — heads up bar team.", type: "note" },
  { id: 2, from: "Kitchen", role: "kitchen", time: "4:02 PM", text: "86'd: Loaded Fries. Out of bacon bits. Back on tomorrow.", type: "alert" },
  { id: 3, from: "Manager on Duty", role: "manager", time: "4:15 PM", text: "Big group of 14 coming in at 7 PM. Kitchen — heads up on wing volume.", type: "info" },
  { id: 4, from: "Myke (Owner)", role: "manager", time: "4:30 PM", text: "Last night's checklist completion was 91%. Let's hit 95% tonight. You know what to do.", type: "praise" },
];

const INITIAL_ISSUES: Issue[] = [
  { id: 1, reporter: "Bar Staff", text: "Tito's bottle leaking at the pour spout. Replaced but flagging for inventory.", time: "Yesterday 11:45 PM", status: "resolved", category: "Inventory" },
  { id: 2, reporter: "Server", text: "Table 7 complained about slow ticket times during the 7-8 PM rush. Kitchen was backed up.", time: "Yesterday 8:12 PM", status: "open", category: "Operations" },
  { id: 3, reporter: "Kitchen", text: "Fryer temp running low — took 20 min to recover. Maintenance needed.", time: "2 days ago", status: "open", category: "Equipment" },
];

const INITIAL_VOIDS: VoidEntry[] = [
  { id: 1, employee: "Alex", item: "Lg Meat Lovers Pizza", amount: 26.45, time: "Yesterday 9:32 PM", type: "void", severity: "medium", reviewed: false },
  { id: 2, employee: "Jordan", item: "Cash Drawer", amount: 0, time: "Yesterday 10:15 PM", type: "no-sale", severity: "high", reviewed: false },
  { id: 3, employee: "Sam", item: "12 Traditional Wings", amount: 17.45, time: "2 days ago", type: "void", severity: "low", reviewed: true },
  { id: 4, employee: "Alex", item: "Domestic Bucket 6", amount: 18.00, time: "2 days ago", type: "discount", severity: "medium", reviewed: false },
];

const SCHEDULE: ShiftSlot[] = [
  { id: 1, day: "Monday", time: "11am-5pm", role: "server", assignee: "Alex", open: false },
  { id: 2, day: "Monday", time: "5pm-Close", role: "bar", assignee: "Jordan", open: false },
  { id: 3, day: "Tuesday", time: "11am-5pm", role: "kitchen", assignee: "Sam", open: false },
  { id: 4, day: "Tuesday", time: "5pm-Close", role: "server", assignee: "", open: true },
  { id: 5, day: "Wednesday", time: "11am-5pm", role: "pizza", assignee: "Casey", open: false },
  { id: 6, day: "Wednesday", time: "5pm-Close", role: "host", assignee: "Riley", open: false },
  { id: 7, day: "Thursday", time: "11am-5pm", role: "driver", assignee: "Taylor", open: false },
  { id: 8, day: "Thursday", time: "5pm-Close", role: "bar", assignee: "", open: true },
  { id: 9, day: "Friday", time: "5pm-Close", role: "kitchen", assignee: "Sam", open: false },
  { id: 10, day: "Friday", time: "5pm-Close", role: "server", assignee: "Alex", open: false },
  { id: 11, day: "Saturday", time: "11am-5pm", role: "pizza", assignee: "Casey", open: false },
  { id: 12, day: "Saturday", time: "5pm-Close", role: "manager", assignee: "Jamie", open: false },
];

// ─── Splash Screen ───────────────────────────────────────────────────────────
function Splash({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-between py-16 px-6 bg-black">
      <div className="pt-20">
        <div className="text-center">
          <h1 className="font-display text-5xl text-white tracking-wider">COMMUNITY TAP</h1>
          <h2 className="font-display text-3xl text-[#F59E0B] tracking-wider mt-1">& PIZZA</h2>
          <div className="w-16 h-0.5 bg-[#F59E0B] mx-auto mt-4 mb-3" />
          <p className="font-data text-xs text-white/30 uppercase tracking-widest">
            Fort Dodge, Iowa · Est. 1976
          </p>
        </div>
      </div>

      <div className="w-full max-w-xs text-center">
        <div className="font-data text-white/40 text-xs uppercase tracking-widest mb-6">
          Powered by Never 86'd
        </div>
        <button
          onClick={onContinue}
          className="w-full py-4 rounded-sm text-white font-bold text-lg uppercase tracking-widest transition-all active:scale-95 bg-[#F59E0B]"
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.3rem", letterSpacing: "0.1em" }}
        >
          Start My Shift
        </button>
        <p className="text-white/20 text-xs mt-4 font-data">
          Active Beat Testing · v1
        </p>
      </div>
    </div>
  );
}

// ─── Login Screen ────────────────────────────────────────────────────────────
function Login({ onLogin }: { onLogin: (staff: StaffMember | null, isOwner: boolean) => void }) {
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  function handlePinSubmit() {
    if (pin === OWNER_PIN) {
      onLogin(null, true);
      return;
    }
    if (pin === MANAGER_PIN) {
      const mgr = STAFF_ROSTER.find(s => s.role === "manager") || STAFF_ROSTER[0];
      onLogin(mgr, false);
      return;
    }
    if (selectedStaff && pin === selectedStaff.pin) {
      onLogin(selectedStaff, false);
      return;
    }
    setError("Wrong PIN. Try again.");
    setPin("");
  }

  if (!selectedStaff) {
    return (
      <div className="min-h-screen flex flex-col bg-black">
        <div className="px-5 pt-10 pb-6">
          <div className="font-data text-xs text-white/30 uppercase tracking-widest mb-1">
            CTap People First
          </div>
          <h1 className="font-display text-3xl text-white tracking-wide">
            WHO ARE YOU TODAY?
          </h1>
          <p className="text-white/40 text-sm mt-1 font-body">
            Pick your name. Enter your PIN.
          </p>
        </div>
        <div className="px-5 grid grid-cols-2 gap-3 pb-10">
          {STAFF_ROSTER.map((staff) => {
            const cfg = ROLE_CONFIG[staff.role];
            return (
              <button
                key={staff.name}
                onClick={() => setSelectedStaff(staff)}
                className="flex flex-col items-center gap-2 p-4 rounded-sm text-center transition-all active:scale-95"
                style={{
                  backgroundColor: "#18181B",
                  border: `1px solid ${cfg.color}30`,
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                  style={{ backgroundColor: `${cfg.color}20` }}
                >
                  {cfg.emoji}
                </div>
                <div className="font-display text-base text-white tracking-wide">{staff.name}</div>
                <div className="font-data text-xs" style={{ color: cfg.color }}>{cfg.label}</div>
                <div className="flex items-center gap-1">
                  <Trophy size={10} style={{ color: TIER_COLORS[staff.tier] }} />
                  <span className="font-data text-xs" style={{ color: TIER_COLORS[staff.tier] }}>
                    {staff.tier}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        <div className="px-5 pb-8">
          <div className="text-center">
            <button
              onClick={() => {
                setSelectedStaff({ name: "Owner", role: "manager", pin: OWNER_PIN, points: 9999, tier: "Legend", shiftsThisWeek: 7 });
              }}
              className="font-data text-xs text-[#F59E0B]/60 uppercase tracking-widest hover:text-[#F59E0B] transition-colors"
            >
              Owner / Manager Login →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-black">
      <button
        onClick={() => { setSelectedStaff(null); setPin(""); setError(""); }}
        className="absolute top-6 left-5 flex items-center gap-2 text-white/40 text-sm font-data"
      >
        <ArrowLeft size={14} /> Back
      </button>

      <div className="text-center mb-8">
        <div className="text-4xl mb-3">{ROLE_CONFIG[selectedStaff.role].emoji}</div>
        <h2 className="font-display text-2xl text-white tracking-wide">{selectedStaff.name}</h2>
        <p className="font-data text-xs mt-1" style={{ color: ROLE_CONFIG[selectedStaff.role].color }}>
          {ROLE_CONFIG[selectedStaff.role].label}
        </p>
      </div>

      <div className="w-full max-w-xs">
        <label className="font-data text-xs text-white/40 uppercase tracking-widest block mb-3 text-center">
          Enter Your PIN
        </label>
        <div className="flex gap-2 justify-center mb-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-12 h-12 rounded-sm flex items-center justify-center text-xl font-display text-white"
              style={{
                backgroundColor: "#18181B",
                border: `1px solid ${pin.length > i ? "#F59E0B" : "rgba(255,255,255,0.1)"}`,
              }}
            >
              {pin[i] ? "•" : ""}
            </div>
          ))}
        </div>

        {error && (
          <p className="text-center text-xs text-[#EF4444] font-data mb-3">{error}</p>
        )}

        <div className="grid grid-cols-3 gap-2 mb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "del"].map((key, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (key === "del") setPin(pin.slice(0, -1));
                else if (key !== null && pin.length < 4) {
                  const newPin = pin + key;
                  setPin(newPin);
                  if (newPin.length === 4) {
                    setTimeout(() => {
                      if (newPin === OWNER_PIN) { onLogin(null, true); return; }
                      if (newPin === MANAGER_PIN) { 
                        const mgr = STAFF_ROSTER.find(s => s.role === "manager") || STAFF_ROSTER[0];
                        onLogin(mgr, false); return;
                      }
                      if (newPin === selectedStaff.pin) { onLogin(selectedStaff, false); return; }
                      setError("Wrong PIN. Try again.");
                      setPin("");
                    }, 200);
                  }
                }
              }}
              className="h-12 rounded-sm font-display text-xl text-white transition-all active:scale-95"
              style={{
                backgroundColor: key === null ? "transparent" : "#18181B",
                border: key === null ? "none" : "1px solid rgba(255,255,255,0.07)",
              }}
              disabled={key === null}
            >
              {key === "del" ? "←" : key === null ? "" : key}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Hub (Home) Screen ───────────────────────────────────────────────────────
function Hub({
  role,
  staffName,
  onNavigate,
  onLogout,
}: {
  role: Role;
  staffName: string;
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
}) {
  const [feed, setFeed] = useState<FeedMessage[]>(INITIAL_FEED);
  const [newMsg, setNewMsg] = useState("");
  const cfg = ROLE_CONFIG[role];
  const checklist = ROLE_CHECKLISTS[role];
  const done = checklist.filter((i) => i.done).length;
  const pct = Math.round((done / checklist.length) * 100);

  function sendMessage() {
    if (!newMsg.trim()) return;
    const msg: FeedMessage = {
      id: Date.now(),
      from: staffName,
      role,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text: newMsg.trim(),
      type: "info",
    };
    setFeed([...feed, msg]);
    setNewMsg("");
    toast.success("Message posted to Hub");
  }

  const typeColors: Record<string, string> = {
    alert: "#EF4444",
    info: "#3B82F6",
    praise: "#4ADE80",
    note: "#F59E0B",
  };

  return (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Header */}
      <div className="px-5 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="font-data text-xs text-white/30 uppercase tracking-widest">
              CTap People First · {staffName}
            </div>
            <h1 className="font-display text-3xl text-white tracking-wide">THE HUB</h1>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-sm flex items-center justify-center text-lg"
              style={{ backgroundColor: `${cfg.color}20` }}
            >
              {cfg.emoji}
            </div>
            <button onClick={onLogout} className="text-white/30 hover:text-white/60 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Checklist progress */}
        <button
          onClick={() => onNavigate("checklist")}
          className="w-full mt-3 p-3 rounded-sm flex items-center gap-3 transition-all active:scale-[0.98]"
          style={{ backgroundColor: "#18181B", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <CheckSquare size={16} style={{ color: cfg.color }} />
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="font-data text-xs text-white/50">My Checklist</span>
              <span className="font-data text-xs font-bold" style={{ color: pct === 100 ? "#4ADE80" : cfg.color }}>
                {done}/{checklist.length} · {pct}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
              <div
                className="h-1.5 rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#4ADE80" : cfg.color }}
              />
            </div>
          </div>
          <ChevronRight size={14} className="text-white/30" />
        </button>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {feed.map((msg) => (
          <div
            key={msg.id}
            className="rounded-sm p-3"
            style={{
              backgroundColor: "#18181B",
              borderLeft: `3px solid ${typeColors[msg.type]}`,
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <User size={11} style={{ color: typeColors[msg.type] }} />
                <span className="font-data text-xs font-semibold" style={{ color: typeColors[msg.type] }}>
                  {msg.from}
                </span>
              </div>
              <div className="flex items-center gap-1 text-white/30">
                <Clock size={10} />
                <span className="font-data text-xs">{msg.time}</span>
              </div>
            </div>
            <p className="text-sm text-white/80 font-body">{msg.text}</p>
          </div>
        ))}
      </div>

      {/* Message input */}
      <div className="px-5 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex gap-2 mb-3">
          <input
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Post to the Hub..."
            className="flex-1 px-3 py-2.5 rounded-sm text-sm text-white/80 outline-none font-body"
            style={{ backgroundColor: "#18181B", border: "1px solid rgba(255,255,255,0.1)" }}
          />
          <button
            onClick={sendMessage}
            className="px-4 py-2.5 rounded-sm transition-all active:scale-95 bg-[#F59E0B]"
          >
            <Send size={16} className="text-black" />
          </button>
        </div>

        {/* Bottom nav */}
        <div className="grid grid-cols-5 gap-1.5">
          {[
            { screen: "checklist" as Screen, icon: CheckSquare, label: "Tasks", color: cfg.color },
            { screen: "chat" as Screen, icon: MessageSquare, label: "Chat", color: "#3B82F6" },
            { screen: "issues" as Screen, icon: AlertTriangle, label: "Issues", color: "#EF4444" },
            { screen: "schedule" as Screen, icon: Calendar, label: "Schedule", color: "#10B981" },
            { screen: "void" as Screen, icon: Shield, label: "Voids", color: "#F59E0B" },
          ].map(({ screen, icon: Icon, label, color }) => (
            <button
              key={screen}
              onClick={() => onNavigate(screen)}
              className="flex flex-col items-center gap-1 py-2.5 rounded-sm transition-all active:scale-95"
              style={{ backgroundColor: "#18181B", border: `1px solid ${color}20` }}
            >
              <Icon size={16} style={{ color }} />
              <span className="font-data text-[10px] text-white/40">{label}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1.5 mt-1.5">
          {[
            { screen: "sop" as Screen, icon: BookOpen, label: "SOPs", color: "#A855F7" },
            { screen: "feedback" as Screen, icon: Star, label: "Feedback", color: "#F59E0B" },
            { screen: "owner" as Screen, icon: BarChart3, label: "Command", color: "#60A5FA" },
          ].map(({ screen, icon: Icon, label, color }) => (
            <button
              key={screen}
              onClick={() => onNavigate(screen)}
              className="flex flex-col items-center gap-1 py-2.5 rounded-sm transition-all active:scale-95"
              style={{ backgroundColor: "#18181B", border: `1px solid ${color}20` }}
            >
              <Icon size={16} style={{ color }} />
              <span className="font-data text-[10px] text-white/40">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Checklist Screen ────────────────────────────────────────────────────────
function Checklist({ role, onBack }: { role: Role; onBack: () => void }) {
  const [items, setItems] = useState<ChecklistItem[]>(ROLE_CHECKLISTS[role]);
  const cfg = ROLE_CONFIG[role];
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);

  function toggle(id: number) {
    setItems(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
    toast.success("Task updated");
  }

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <div className="px-5 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 mb-3 text-sm font-data">
          <ArrowLeft size={14} /> Back to Hub
        </button>
        <div className="font-data text-xs text-white/30 uppercase tracking-widest mb-1">
          {cfg.label} · Shift Checklist
        </div>
        <h1 className="font-display text-3xl text-white tracking-wide">YOUR TASKS TODAY</h1>
        <div className="mt-3">
          <div className="flex justify-between mb-1">
            <span className="font-data text-xs text-white/40">Progress</span>
            <span className="font-data text-xs font-bold" style={{ color: pct === 100 ? "#4ADE80" : cfg.color }}>
              {done}/{items.length} · {pct}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#4ADE80" : cfg.color }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => toggle(item.id)}
            className="w-full flex items-start gap-3 p-4 rounded-sm text-left transition-all active:scale-[0.98]"
            style={{
              backgroundColor: item.done ? "#0a1f0a" : "#18181B",
              border: `1px solid ${item.done ? "#4ADE8040" : "rgba(255,255,255,0.07)"}`,
            }}
          >
            <div
              className="w-5 h-5 rounded-sm border flex items-center justify-center shrink-0 mt-0.5 transition-all"
              style={{
                borderColor: item.done ? "#4ADE80" : "rgba(255,255,255,0.2)",
                backgroundColor: item.done ? "#4ADE80" : "transparent",
              }}
            >
              {item.done && <span className="text-black text-xs font-bold">✓</span>}
            </div>
            <div className="flex-1">
              <p
                className="text-sm font-body"
                style={{
                  color: item.done ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.85)",
                  textDecoration: item.done ? "line-through" : "none",
                }}
              >
                {item.task}
              </p>
              {item.required && !item.done && (
                <span className="font-data text-xs text-[#EF4444]">Required</span>
              )}
            </div>
          </button>
        ))}

        {pct === 100 && (
          <div className="p-4 rounded-sm text-center" style={{ backgroundColor: "#0a1f0a", border: "1px solid #4ADE8040" }}>
            <div className="font-display text-2xl text-[#4ADE80] tracking-wide">CHECKLIST COMPLETE ✓</div>
            <p className="font-data text-xs text-white/40 mt-1">
              Logged at {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Issues Screen ───────────────────────────────────────────────────────────
function Issues({ role, onBack }: { role: Role; onBack: () => void }) {
  const [issues, setIssues] = useState<Issue[]>(INITIAL_ISSUES);
  const [newIssue, setNewIssue] = useState("");
  const [category, setCategory] = useState("Operations");
  const cfg = ROLE_CONFIG[role];

  function submitIssue() {
    if (!newIssue.trim()) return;
    const issue: Issue = {
      id: Date.now(),
      reporter: cfg.label,
      text: newIssue.trim(),
      time: "Just now",
      status: "open",
      category,
    };
    setIssues([issue, ...issues]);
    setNewIssue("");
    toast.success("Issue logged — manager notified");
  }

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <div className="px-5 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 mb-3 text-sm font-data">
          <ArrowLeft size={14} /> Back to Hub
        </button>
        <div className="font-data text-xs text-white/30 uppercase tracking-widest mb-1">
          Issue Log · Replaces the 9,000 texts
        </div>
        <h1 className="font-display text-3xl text-white tracking-wide">REPORT AN ISSUE</h1>
      </div>

      <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex flex-wrap gap-2 mb-3">
          {["Operations", "Inventory", "Equipment", "Staff", "Guest"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className="px-3 py-1.5 rounded-sm text-xs font-data transition-all"
              style={{
                backgroundColor: category === cat ? "#EF4444" : "#18181B",
                color: category === cat ? "#fff" : "rgba(255,255,255,0.4)",
                border: `1px solid ${category === cat ? "#EF4444" : "rgba(255,255,255,0.1)"}`,
              }}
            >
              {cat}
            </button>
          ))}
        </div>
        <textarea
          value={newIssue}
          onChange={(e) => setNewIssue(e.target.value)}
          placeholder="What happened? Be specific — time, location, what you saw."
          rows={3}
          className="w-full px-3 py-2.5 rounded-sm text-sm text-white/80 outline-none resize-none mb-3 font-body"
          style={{ backgroundColor: "#18181B", border: "1px solid rgba(255,255,255,0.1)" }}
        />
        <button
          onClick={submitIssue}
          className="w-full py-3 rounded-sm text-white font-bold uppercase tracking-widest transition-all active:scale-[0.98] bg-[#EF4444] font-display text-base"
        >
          Log Issue
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        <div className="font-data text-xs text-white/30 uppercase tracking-widest mb-2">Recent Issues</div>
        {issues.map((issue) => (
          <div
            key={issue.id}
            className="p-4 rounded-sm"
            style={{
              backgroundColor: "#18181B",
              borderLeft: `3px solid ${issue.status === "open" ? "#EF4444" : "#4ADE80"}`,
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span
                  className="font-data text-xs px-2 py-0.5 rounded-sm"
                  style={{
                    backgroundColor: issue.status === "open" ? "#EF444420" : "#4ADE8020",
                    color: issue.status === "open" ? "#EF4444" : "#4ADE80",
                  }}
                >
                  {issue.status.toUpperCase()}
                </span>
                <span className="font-data text-xs text-white/30">{issue.category}</span>
              </div>
              <span className="font-data text-xs text-white/30">{issue.time}</span>
            </div>
            <p className="text-sm text-white/80 font-body mb-1">{issue.text}</p>
            <p className="font-data text-xs text-white/30">Reported by: {issue.reporter}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Chat Screen ─────────────────────────────────────────────────────────────
function Chat({ role, staffName, onBack }: { role: Role; staffName: string; onBack: () => void }) {
  const [messages, setMessages] = useState<FeedMessage[]>([
    { id: 1, from: "Myke (Owner)", role: "manager", time: "3:30 PM", text: "Alright team — tonight's gonna be busy. Football crowd coming in early. Let's be ready by 4.", type: "note" },
    { id: 2, from: "Jordan (Bar)", role: "bar", time: "3:35 PM", text: "Copy. Stocking extra Busch Light and Domestic Buckets now.", type: "info" },
    { id: 3, from: "Sam (Kitchen)", role: "kitchen", time: "3:40 PM", text: "Wings are prepped. 200 count ready. Need more ranch from walk-in.", type: "info" },
    { id: 4, from: "Jamie (Manager)", role: "manager", time: "3:45 PM", text: "86'd update: No Loaded Fries tonight. Bacon bits out. Telling servers now.", type: "alert" },
  ]);
  const [newMsg, setNewMsg] = useState("");

  function sendMessage() {
    if (!newMsg.trim()) return;
    setMessages([...messages, {
      id: Date.now(),
      from: `${staffName} (${ROLE_CONFIG[role].label})`,
      role,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text: newMsg.trim(),
      type: "info",
    }]);
    setNewMsg("");
  }

  const typeColors: Record<string, string> = { alert: "#EF4444", info: "#3B82F6", praise: "#4ADE80", note: "#F59E0B" };

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <div className="px-5 pt-6 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 mb-3 text-sm font-data">
          <ArrowLeft size={14} /> Back to Hub
        </button>
        <h1 className="font-display text-2xl text-white tracking-wide">TEAM CHAT</h1>
        <p className="font-data text-xs text-white/30">All Hands · {STAFF_ROSTER.length} on shift</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className="rounded-sm p-3" style={{ backgroundColor: "#18181B", borderLeft: `3px solid ${typeColors[msg.type]}` }}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-data text-xs font-semibold" style={{ color: typeColors[msg.type] }}>{msg.from}</span>
              <span className="font-data text-xs text-white/30">{msg.time}</span>
            </div>
            <p className="text-sm text-white/80 font-body">{msg.text}</p>
          </div>
        ))}
      </div>

      <div className="px-5 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex gap-2">
          <input
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Message the team..."
            className="flex-1 px-3 py-2.5 rounded-sm text-sm text-white/80 outline-none font-body"
            style={{ backgroundColor: "#18181B", border: "1px solid rgba(255,255,255,0.1)" }}
          />
          <button onClick={sendMessage} className="px-4 py-2.5 rounded-sm bg-[#3B82F6] transition-all active:scale-95">
            <Send size={16} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Schedule Screen ─────────────────────────────────────────────────────────
function ScheduleView({ onBack }: { onBack: () => void }) {
  const [schedule, setSchedule] = useState<ShiftSlot[]>(SCHEDULE);

  function pickupShift(id: number) {
    setSchedule(schedule.map(s => s.id === id ? { ...s, open: false, assignee: "You" } : s));
    toast.success("Shift picked up! +50 points");
  }

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <div className="px-5 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 mb-3 text-sm font-data">
          <ArrowLeft size={14} /> Back to Hub
        </button>
        <h1 className="font-display text-3xl text-white tracking-wide">THIS WEEK</h1>
        <p className="font-data text-xs text-white/30 mt-1">Pick up open shifts for bonus points</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
        {schedule.map((slot) => {
          const cfg = ROLE_CONFIG[slot.role];
          return (
            <div
              key={slot.id}
              className="p-3 rounded-sm flex items-center justify-between"
              style={{
                backgroundColor: "#18181B",
                borderLeft: `3px solid ${slot.open ? "#F59E0B" : cfg.color}`,
              }}
            >
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-display text-base text-white">{slot.day}</span>
                  <span className="font-data text-xs text-white/40">{slot.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-data text-xs" style={{ color: cfg.color }}>{cfg.label}</span>
                  {!slot.open && <span className="font-data text-xs text-white/30">· {slot.assignee}</span>}
                </div>
              </div>
              {slot.open ? (
                <button
                  onClick={() => pickupShift(slot.id)}
                  className="px-3 py-1.5 rounded-sm font-data text-xs text-black font-bold bg-[#F59E0B] transition-all active:scale-95"
                >
                  PICK UP
                </button>
              ) : (
                <span className="font-data text-xs text-white/20">Filled</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Void Hunter Screen ──────────────────────────────────────────────────────
function VoidHunter({ onBack }: { onBack: () => void }) {
  const [voids, setVoids] = useState<VoidEntry[]>(INITIAL_VOIDS);
  const openCount = voids.filter(v => !v.reviewed).length;
  const highRisk = voids.filter(v => v.severity === "high" || v.severity === "critical").length;

  function markReviewed(id: number) {
    setVoids(voids.map(v => v.id === id ? { ...v, reviewed: true } : v));
    toast.success("Marked as reviewed");
  }

  const severityColors: Record<string, string> = {
    low: "#4ADE80", medium: "#F59E0B", high: "#EF4444", critical: "#DC2626",
  };
  const typeLabels: Record<string, string> = {
    void: "VOID", "no-sale": "NO-SALE", discount: "DISCOUNT", waste: "WASTE",
  };

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <div className="px-5 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 mb-3 text-sm font-data">
          <ArrowLeft size={14} /> Back to Hub
        </button>
        <h1 className="font-display text-3xl text-white tracking-wide">VOID HUNTER</h1>
        <p className="font-data text-xs text-white/30 mt-1">Suspicious activity log</p>
        <div className="flex gap-3 mt-3">
          <div className="px-3 py-2 rounded-sm" style={{ backgroundColor: "#18181B" }}>
            <span className="font-data text-xs text-white/40">Open: </span>
            <span className="font-data text-xs text-[#F59E0B] font-bold">{openCount}</span>
          </div>
          <div className="px-3 py-2 rounded-sm" style={{ backgroundColor: "#18181B" }}>
            <span className="font-data text-xs text-white/40">High Risk: </span>
            <span className="font-data text-xs text-[#EF4444] font-bold">{highRisk}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {voids.map((v) => (
          <div
            key={v.id}
            className="p-4 rounded-sm"
            style={{
              backgroundColor: "#18181B",
              borderLeft: `3px solid ${severityColors[v.severity]}`,
              opacity: v.reviewed ? 0.5 : 1,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-data text-xs px-2 py-0.5 rounded-sm" style={{ backgroundColor: `${severityColors[v.severity]}20`, color: severityColors[v.severity] }}>
                  {typeLabels[v.type]}
                </span>
                <span className="font-data text-xs px-2 py-0.5 rounded-sm" style={{ backgroundColor: `${severityColors[v.severity]}20`, color: severityColors[v.severity] }}>
                  {v.severity.toUpperCase()}
                </span>
              </div>
              <span className="font-data text-xs text-white/30">{v.time}</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/80 font-body">{v.item}</p>
                <p className="font-data text-xs text-white/40 mt-0.5">Employee: {v.employee} {v.amount > 0 && `· $${v.amount.toFixed(2)}`}</p>
              </div>
              {!v.reviewed && (
                <button
                  onClick={() => markReviewed(v.id)}
                  className="px-3 py-1.5 rounded-sm font-data text-xs bg-[#27272A] text-white/60 transition-all active:scale-95"
                >
                  Review ✓
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SOP Hub Screen ──────────────────────────────────────────────────────────
function SOPHub({ onBack }: { onBack: () => void }) {
  const sops = [
    { title: "Core Responsibilities", roles: "All Staff", sections: 8, color: "#F59E0B" },
    { title: "Delivery Driver Onboarding", roles: "Driver", sections: 5, color: "#10B981" },
    { title: "Fry Line Training", roles: "Kitchen", sections: 6, color: "#EF4444" },
    { title: "Pizza Side Training", roles: "Pizza", sections: 7, color: "#F97316" },
    { title: "Bar Operations SOP", roles: "Bar", sections: 9, color: "#3B82F6" },
    { title: "Server Knowledge Quiz", roles: "Server, Host", sections: 4, color: "#F59E0B" },
    { title: "Kitchen Protocol & Safety", roles: "Kitchen, Pizza", sections: 6, color: "#EF4444" },
    { title: "Manager Close Checklist", roles: "Manager", sections: 10, color: "#60A5FA" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <div className="px-5 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 mb-3 text-sm font-data">
          <ArrowLeft size={14} /> Back to Hub
        </button>
        <h1 className="font-display text-3xl text-white tracking-wide">SOP HUB</h1>
        <p className="font-data text-xs text-white/30 mt-1">Training library · Tap to study</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
        {sops.map((sop, i) => (
          <button
            key={i}
            onClick={() => toast("SOP viewer coming in v2")}
            className="w-full p-4 rounded-sm text-left transition-all active:scale-[0.98] flex items-center justify-between"
            style={{ backgroundColor: "#18181B", borderLeft: `3px solid ${sop.color}` }}
          >
            <div>
              <p className="text-sm text-white/85 font-body font-medium">{sop.title}</p>
              <p className="font-data text-xs text-white/30 mt-0.5">{sop.roles} · {sop.sections} sections</p>
            </div>
            <ChevronRight size={14} className="text-white/20" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Feedback Screen ─────────────────────────────────────────────────────────
function Feedback({ role, onBack }: { role: Role; onBack: () => void }) {
  const [text, setText] = useState("");
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const cfg = ROLE_CONFIG[role];

  function submit() {
    if (!text.trim() || rating === 0) {
      toast.error("Rate your shift and write something — even one line.");
      return;
    }
    setSubmitted(true);
    toast.success("Feedback logged. Myke will read this.");
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 bg-black">
        <div className="font-display text-3xl text-[#4ADE80] tracking-wide text-center">FEEDBACK LOGGED ✓</div>
        <p className="text-white/40 text-sm text-center mt-2 mb-8 font-body">
          Myke reads every one of these. Good or bad — it helps.
        </p>
        <button onClick={onBack} className="px-8 py-3 rounded-sm text-white uppercase tracking-widest font-display text-base bg-[#18181B]">
          Back to Hub
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <div className="px-5 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 mb-3 text-sm font-data">
          <ArrowLeft size={14} /> Back to Hub
        </button>
        <div className="font-data text-xs text-white/30 uppercase tracking-widest mb-1">End of Shift · {cfg.label}</div>
        <h1 className="font-display text-3xl text-white tracking-wide">HOW WAS YOUR SHIFT?</h1>
        <p className="text-white/40 text-sm mt-1 font-body">Be honest. Bad feedback is good data.</p>
      </div>

      <div className="flex-1 px-5 py-6 space-y-6">
        <div>
          <div className="font-data text-xs text-white/40 uppercase tracking-widest mb-3">Rate Your Shift</div>
          <div className="flex gap-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} onClick={() => setRating(star)} className="transition-all active:scale-90">
                <Star size={32} fill={star <= rating ? "#F59E0B" : "transparent"} style={{ color: star <= rating ? "#F59E0B" : "rgba(255,255,255,0.2)" }} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="font-data text-xs text-white/40 uppercase tracking-widest mb-3">What Happened?</div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What went well? What didn't? What do you need?"
            rows={5}
            className="w-full px-4 py-3 rounded-sm text-sm text-white/80 outline-none resize-none font-body"
            style={{ backgroundColor: "#18181B", border: "1px solid rgba(255,255,255,0.1)" }}
          />
        </div>

        <button
          onClick={submit}
          className="w-full py-4 rounded-sm font-bold uppercase tracking-widest transition-all active:scale-[0.98] bg-[#F59E0B] text-black font-display text-lg"
        >
          Submit Feedback
        </button>
      </div>
    </div>
  );
}

// ─── Owner Command Center ────────────────────────────────────────────────────
function OwnerCommand({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<"overview" | "staff" | "voids" | "costs" | "alerts" | "leaderboard">("overview");

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <div className="px-5 pt-6 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 mb-3 text-sm font-data">
          <ArrowLeft size={14} /> Back to Hub
        </button>
        <h1 className="font-display text-3xl text-[#F59E0B] tracking-wide">COMMAND CENTER</h1>
        <p className="font-data text-xs text-white/30 mt-1">Owner · Full Visibility</p>
      </div>

      {/* Tabs */}
      <div className="px-5 py-3 flex gap-2 overflow-x-auto" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        {[
          { id: "overview" as const, label: "Overview" },
          { id: "staff" as const, label: "Staff" },
          { id: "voids" as const, label: "Voids" },
          { id: "costs" as const, label: "Costs" },
          { id: "alerts" as const, label: "Alerts" },
          { id: "leaderboard" as const, label: "Board" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-3 py-1.5 rounded-sm font-data text-xs whitespace-nowrap transition-all"
            style={{
              backgroundColor: tab === t.id ? "#F59E0B" : "#18181B",
              color: tab === t.id ? "#000" : "rgba(255,255,255,0.5)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {tab === "overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-sm" style={{ backgroundColor: "#18181B" }}>
                <p className="font-data text-xs text-white/40">Today's Sales</p>
                <p className="font-display text-2xl text-white mt-1">$4,832</p>
              </div>
              <div className="p-4 rounded-sm" style={{ backgroundColor: "#18181B" }}>
                <p className="font-data text-xs text-white/40">Labor %</p>
                <p className="font-display text-2xl text-[#4ADE80] mt-1">22.1%</p>
              </div>
              <div className="p-4 rounded-sm" style={{ backgroundColor: "#18181B" }}>
                <p className="font-data text-xs text-white/40">Open Issues</p>
                <p className="font-display text-2xl text-[#EF4444] mt-1">2</p>
              </div>
              <div className="p-4 rounded-sm" style={{ backgroundColor: "#18181B" }}>
                <p className="font-data text-xs text-white/40">Checklist %</p>
                <p className="font-display text-2xl text-[#F59E0B] mt-1">91%</p>
              </div>
            </div>
            <div className="p-4 rounded-sm" style={{ backgroundColor: "#18181B", borderLeft: "3px solid #EF4444" }}>
              <p className="font-data text-xs text-[#EF4444] mb-1">86'd ITEMS</p>
              <p className="text-sm text-white/80 font-body">Loaded Fries · Lg Community Special · 12 Bone-In Wings</p>
            </div>
            <div className="p-4 rounded-sm" style={{ backgroundColor: "#18181B", borderLeft: "3px solid #F59E0B" }}>
              <p className="font-data text-xs text-[#F59E0B] mb-1">TONIGHT'S SPECIALS</p>
              <p className="text-sm text-white/80 font-body">Domestic Bucket 6 — $18 all night</p>
              <p className="text-sm text-white/80 font-body">Large 1-Topping — $14.99 carry-out</p>
              <p className="text-sm text-white/80 font-body">Tito's drinks — $6 until 8PM</p>
            </div>
          </div>
        )}

        {tab === "staff" && (
          <div className="space-y-2">
            {STAFF_ROSTER.map((s) => (
              <div key={s.name} className="p-3 rounded-sm flex items-center justify-between" style={{ backgroundColor: "#18181B" }}>
                <div className="flex items-center gap-3">
                  <span className="text-lg">{ROLE_CONFIG[s.role].emoji}</span>
                  <div>
                    <p className="text-sm text-white/85 font-body font-medium">{s.name}</p>
                    <p className="font-data text-xs" style={{ color: ROLE_CONFIG[s.role].color }}>{ROLE_CONFIG[s.role].label}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-data text-xs" style={{ color: TIER_COLORS[s.tier] }}>{s.tier}</p>
                  <p className="font-data text-xs text-white/30">{s.points} pts</p>
                  <p className="font-data text-xs text-white/20">PIN: {s.pin}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "voids" && (
          <div className="space-y-3">
            <div className="p-4 rounded-sm" style={{ backgroundColor: "#18181B" }}>
              <p className="font-data text-xs text-white/40 mb-2">VOID SUMMARY — LAST 7 DAYS</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="font-display text-xl text-white">12</p>
                  <p className="font-data text-xs text-white/30">Total Voids</p>
                </div>
                <div>
                  <p className="font-display text-xl text-[#EF4444]">3</p>
                  <p className="font-data text-xs text-white/30">High Risk</p>
                </div>
                <div>
                  <p className="font-display text-xl text-[#F59E0B]">$247</p>
                  <p className="font-data text-xs text-white/30">Total $</p>
                </div>
              </div>
            </div>
            {INITIAL_VOIDS.map(v => (
              <div key={v.id} className="p-3 rounded-sm" style={{ backgroundColor: "#18181B", borderLeft: `3px solid ${v.severity === "high" ? "#EF4444" : "#F59E0B"}` }}>
                <p className="text-sm text-white/80 font-body">{v.employee} — {v.item}</p>
                <p className="font-data text-xs text-white/30">{v.type.toUpperCase()} · {v.time}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "costs" && (
          <div className="space-y-3">
            <p className="font-data text-xs text-white/40 uppercase tracking-widest">Cost Targets vs Actual</p>
            {[
              { label: "Food Cost", target: "30%", actual: "31.2%", color: "#F59E0B", over: true },
              { label: "Beer Cost", target: "21%", actual: "19.8%", color: "#4ADE80", over: false },
              { label: "Liquor Cost", target: "20%", actual: "22.4%", color: "#EF4444", over: true },
              { label: "Labor Cost", target: "28%", actual: "22.1%", color: "#4ADE80", over: false },
            ].map((c, i) => (
              <div key={i} className="p-4 rounded-sm flex items-center justify-between" style={{ backgroundColor: "#18181B" }}>
                <div>
                  <p className="text-sm text-white/80 font-body">{c.label}</p>
                  <p className="font-data text-xs text-white/30">Target: {c.target}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-xl" style={{ color: c.color }}>{c.actual}</p>
                  <p className="font-data text-xs" style={{ color: c.over ? "#EF4444" : "#4ADE80" }}>
                    {c.over ? "OVER" : "UNDER"}
                  </p>
                </div>
              </div>
            ))}
            <div className="p-4 rounded-sm" style={{ backgroundColor: "#18181B", borderLeft: "3px solid #EF4444" }}>
              <p className="font-data text-xs text-[#EF4444] mb-1">MONTHLY LEAK DETECTED</p>
              <p className="font-display text-2xl text-white">$2,343/mo</p>
              <p className="text-sm text-white/50 font-body mt-1">Distributor overcharges on 17 of 20 liquor SKUs vs Iowa ABD wholesale median</p>
            </div>
          </div>
        )}

        {tab === "alerts" && (
          <div className="space-y-3">
            {[
              { level: "critical", text: "Void spike: Alex — 3 voids in 2 hours (Meat Lovers, Wings, Bucket)", color: "#EF4444" },
              { level: "warning", text: "Kitchen checklist overdue — Sam hasn't completed by 4:30 PM", color: "#F59E0B" },
              { level: "warning", text: "Tito's below par — 4 bottles remaining, 7 par level", color: "#F59E0B" },
              { level: "info", text: "Labor at 22.1% — well under 28% target. Good staffing tonight.", color: "#4ADE80" },
              { level: "info", text: "Checklist completion trending up: 87% → 91% this week", color: "#4ADE80" },
            ].map((alert, i) => (
              <div key={i} className="p-4 rounded-sm" style={{ backgroundColor: "#18181B", borderLeft: `3px solid ${alert.color}` }}>
                <span className="font-data text-xs px-2 py-0.5 rounded-sm" style={{ backgroundColor: `${alert.color}20`, color: alert.color }}>
                  {alert.level.toUpperCase()}
                </span>
                <p className="text-sm text-white/80 font-body mt-2">{alert.text}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "leaderboard" && (
          <div className="space-y-2">
            <p className="font-data text-xs text-white/40 uppercase tracking-widest mb-3">Gamification Leaderboard</p>
            {[...STAFF_ROSTER].sort((a, b) => b.points - a.points).map((s, i) => (
              <div key={s.name} className="p-3 rounded-sm flex items-center justify-between" style={{ backgroundColor: "#18181B" }}>
                <div className="flex items-center gap-3">
                  <span className="font-display text-lg text-white/30 w-6">#{i + 1}</span>
                  <div>
                    <p className="text-sm text-white/85 font-body font-medium">{s.name}</p>
                    <p className="font-data text-xs" style={{ color: ROLE_CONFIG[s.role].color }}>{ROLE_CONFIG[s.role].label}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg" style={{ color: TIER_COLORS[s.tier] }}>{s.points}</p>
                  <p className="font-data text-xs" style={{ color: TIER_COLORS[s.tier] }}>{s.tier}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
export default function CTapHub() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [role, setRole] = useState<Role>("server");
  const [staffName, setStaffName] = useState("Staff");
  const [isOwner, setIsOwner] = useState(false);

  function handleLogin(staff: StaffMember | null, owner: boolean) {
    if (owner) {
      setIsOwner(true);
      setRole("manager");
      setStaffName("Myke (Owner)");
      setScreen("hub");
      toast.success("Welcome back, boss.");
    } else if (staff) {
      setRole(staff.role);
      setStaffName(staff.name);
      setScreen("hub");
      toast.success(`Clocked in as ${staff.name}. Let's go.`);
    }
  }

  function handleLogout() {
    setScreen("login");
    setIsOwner(false);
    setStaffName("Staff");
    toast("Logged out");
  }

  return (
    <div className="max-w-md mx-auto" style={{ minHeight: "100dvh" }}>
      {screen === "splash" && <Splash onContinue={() => setScreen("login")} />}
      {screen === "login" && <Login onLogin={handleLogin} />}
      {screen === "hub" && <Hub role={role} staffName={staffName} onNavigate={setScreen} onLogout={handleLogout} />}
      {screen === "checklist" && <Checklist role={role} onBack={() => setScreen("hub")} />}
      {screen === "issues" && <Issues role={role} onBack={() => setScreen("hub")} />}
      {screen === "feedback" && <Feedback role={role} onBack={() => setScreen("hub")} />}
      {screen === "chat" && <Chat role={role} staffName={staffName} onBack={() => setScreen("hub")} />}
      {screen === "schedule" && <ScheduleView onBack={() => setScreen("hub")} />}
      {screen === "void" && <VoidHunter onBack={() => setScreen("hub")} />}
      {screen === "sop" && <SOPHub onBack={() => setScreen("hub")} />}
      {screen === "owner" && <OwnerCommand onBack={() => setScreen("hub")} />}
    </div>
  );
}
