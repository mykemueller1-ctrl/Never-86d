/**
 * CTAP People Platform v1 — Active Beat Testing
 * Community Tap & Pizza · Fort Dodge, Iowa · Powered by Never 86'd
 *
 * Design: Night Shift Industrial — True black OLED, amber primary
 * Security: No PINs/phone/email exposed. No raw sales for non-managers.
 * UX: Role-aware — staff sees what THEY need, not a wall of tabs
 * Permissions: Manager-only screens have guards. Financial data gamified for staff.
 */
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import type { SafeStaff } from "../../../shared/types";
import {
  CheckCircle2, Circle, AlertTriangle,
  Send, ChevronRight, ChevronLeft, Users,
  Trophy, Flame, Wifi, Star, TrendingUp,
  ShieldAlert, Truck, Camera,
  BarChart3, Zap, Coffee, Sun,
  ClipboardCheck, LogOut, Home, ArrowRight,
  Eye, EyeOff, Plus, Receipt,
  Package, Loader2, UserCircle, Lock,
  Sparkles, Target, ThumbsUp, MessageSquare,
  Brain, Gift, ShoppingCart
} from "lucide-react";
import { AskBrainScreen, PhotoMissionsScreen, AchievementsScreen, RewardsShopScreen } from "./IntelligenceScreens";
import OrderGuideScreen from "./OrderGuideScreen";
import ShiftHandoffScreen from "./ShiftHandoffScreen";

// ─── Types ──────────────────────────────────────────────────────
type Screen =
  | "splash" | "login" | "welcome" | "briefing"
  | "home" | "checklist" | "issues"
  | "voids" | "feedback" | "driver-eod"
  | "command" | "leaderboard" | "profile"
  | "store-run" | "invoices"
  | "ask-brain" | "photo-missions" | "achievements" | "rewards-shop"
  | "order-guide" | "shift-handoff";

type Department = "bar" | "kitchen" | "driver" | "server" | "management";

const DEPT_CONFIG: Record<Department, { label: string; desc: string; icon: any }> = {
  management: { label: "Management", desc: "Full access · Command Center", icon: ShieldAlert },
  bar: { label: "Bar", desc: "Bar ops · Tabs · Closing", icon: Coffee },
  kitchen: { label: "Kitchen", desc: "Prep · Line · Closing", icon: Flame },
  server: { label: "Server", desc: "FOH · Orders · Tables", icon: Users },
  driver: { label: "Driver", desc: "Deliveries · EOD reports", icon: Truck },
};

// Manager/owner roles that can see financial data
const MANAGER_ROLES = ["owner", "key_manager", "kitchen_manager", "bar_manager"];

function staffDisplayName(s: SafeStaff): string {
  return s.lastName ? `${s.firstName} ${s.lastName}` : s.firstName;
}

function roleLabel(jobRole: string): string {
  const labels: Record<string, string> = {
    owner: "Owner", key_manager: "Key Manager", kitchen_manager: "Kitchen Manager",
    kitchen_key: "Kitchen Key", bartender: "Bartender", bar_manager: "Bar Manager",
    server: "Server", driver: "Driver", line_cook: "Line Cook", pizza: "Pizza",
  };
  return labels[jobRole] || jobRole;
}

function isManagerOrOwner(s: SafeStaff | null): boolean {
  if (!s) return false;
  return MANAGER_ROLES.includes(s.jobRole);
}

/** Convert a sales number to a gamified "vibe" rating for non-managers */
function salesVibe(amount: number | null | undefined): { label: string; emoji: string; color: string } {
  if (!amount || amount === 0) return { label: "No data yet", emoji: "—", color: "text-zinc-500" };
  if (amount >= 5000) return { label: "Legendary Night", emoji: "🔥", color: "text-amber-400" };
  if (amount >= 3500) return { label: "Great Night", emoji: "⭐", color: "text-green-400" };
  if (amount >= 2000) return { label: "Solid Night", emoji: "👍", color: "text-blue-400" };
  return { label: "Steady Night", emoji: "📊", color: "text-zinc-400" };
}

// ─── Main Component ──────────────────────────────────────────────────────
export default function CTapHub() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [staffUser, setStaffUser] = useState<SafeStaff | null>(null);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [checklistProgress, setChecklistProgress] = useState<Record<string, boolean>>({});
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackCategory, setFeedbackCategory] = useState<string | null>(null);
  const [driverEOD, setDriverEOD] = useState({ outOfTown: "", specialRuns: "", cashFromTill: "", redeliveries: "", notes: "" });
  const [issueTitle, setIssueTitle] = useState("");
  const [issueDesc, setIssueDesc] = useState("");
  const [issuePriority, setIssuePriority] = useState<string>("medium");
  const [issueCategory, setIssueCategory] = useState<string>("equipment");
  const [storeRunForm, setStoreRunForm] = useState({ description: "", amount: "", vendor: "", category: "food", authorizedById: 0 });
  const [invoiceForm, setInvoiceForm] = useState({ vendorName: "", totalAmount: "", category: "meat", invoiceNumber: "", customVendor: false });
  const [receiptPhotoUrl, setReceiptPhotoUrl] = useState<string | null>(null);
  const [invoicePhotoUrl, setInvoicePhotoUrl] = useState<string | null>(null);
  const [invoiceExtractedItems, setInvoiceExtractedItems] = useState<any[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingInvoicePhoto, setUploadingInvoicePhoto] = useState(false);

  const isManager = isManagerOrOwner(staffUser);

  // ─── Auth (Manus OAuth — needed for mutations) ──────────────────────
  const { user: authUser, isAuthenticated } = useAuth();

  // ─── tRPC Queries (lazy — only fetch when needed) ──────────────────
  const staffByDept = trpc.staff.byDepartment.useQuery(
    { department: selectedDept || "" },
    { enabled: !!selectedDept && screen === "login" }
  );
  const checklistsQuery = trpc.checklists.list.useQuery(undefined, {
    enabled: ["home", "checklist"].includes(screen)
  });
  const briefingQuery = trpc.briefing.latest.useQuery(undefined, {
    enabled: ["briefing", "home"].includes(screen)
  });
  const issuesQuery = trpc.issues.open.useQuery(undefined, {
    enabled: ["issues", "home", "command"].includes(screen)
  });
  const leaderboardQuery = trpc.gamification.leaderboard.useQuery(undefined, {
    enabled: ["leaderboard", "home", "command"].includes(screen)
  });
  // Manager-only queries — only fetch if user is a manager
  const payoutsQuery = trpc.payouts.list.useQuery(undefined, {
    enabled: isManager && ["store-run", "command"].includes(screen)
  });
  const invoicesQuery = trpc.invoices.list.useQuery(undefined, {
    enabled: isManager && ["invoices", "command"].includes(screen)
  });
  const voidsQuery = trpc.voids.list.useQuery(undefined, {
    enabled: isManager && ["voids", "command"].includes(screen)
  });
  const staffListQuery = trpc.staff.list.useQuery(undefined, {
    enabled: isManager && ["voids", "command", "store-run"].includes(screen)
  });
  // Self-only queries for non-managers
  const myVoidsQuery = trpc.voids.myVoids.useQuery(
    undefined,
    { enabled: !isManager && !!staffUser && ["profile", "home"].includes(screen) }
  );
  const myPayoutsQuery = trpc.payouts.myPayouts.useQuery(
    undefined,
    { enabled: !isManager && !!staffUser && ["profile", "home"].includes(screen) }
  );

  // ─── tRPC Mutations ──────────────────────────────────────────────────
  const loginByPin = trpc.staff.loginByPin.useMutation();
  const createFeedback = trpc.feedback.create.useMutation();
  const createDriverReport = trpc.driverReports.create.useMutation();
  const createIssue = trpc.issues.create.useMutation();
  const createPayout = trpc.payouts.create.useMutation();
  const staffLogout = trpc.staff.logout.useMutation();
  const uploadReceipt = trpc.upload.receiptPhoto.useMutation();
  const analyzePhoto = trpc.photos.analyze.useMutation();
  const COMMON_VENDORS_SET = new Set(["Sawyer's Meats", "Hughes Distributing", "Fort Dodge Distributing", "Confluence Brewing", "Hy-Vee", "Fareway", "Dollar General", "PFG/RFS", "Sysco"]);
  const createInvoice = trpc.invoices.create.useMutation();

  // ─── Derived data ──────────────────────────────────────────────────
  const deptStaff = staffByDept.data || [];
  const briefing = briefingQuery.data;
  const allChecklists = checklistsQuery.data || [];
  const openIssues = issuesQuery.data || [];
  const leaderboard = leaderboardQuery.data || [];
  const allPayouts = isManager ? (payoutsQuery.data || []) : [];
  const allInvoices = isManager ? (invoicesQuery.data || []) : [];
  const allVoids = isManager ? (voidsQuery.data || []) : [];
  const myVoids = !isManager ? (myVoidsQuery.data || []) : [];
  const myPayouts = !isManager ? (myPayoutsQuery.data || []) : [];
  const allStaff = isManager ? (staffListQuery.data || []) : [];
  const keyEmployees = useMemo(() => allStaff.filter(s => s.isKeyEmployee || s.canAuthPayouts), [allStaff]);

  const myChecklists = useMemo(() => {
    if (!staffUser) return [];
    return allChecklists.filter(c => c.department === staffUser.department || c.department === "all");
  }, [allChecklists, staffUser]);

  // Auto-advance splash
  useEffect(() => {
    if (screen === "splash") {
      const t = setTimeout(() => setScreen("login"), 2500);
      return () => clearTimeout(t);
    }
  }, [screen]);

  // ─── Screen Guard — redirect non-managers away from financial screens ──
  const navigateTo = (target: Screen) => {
    const managerOnlyScreens: Screen[] = ["command", "store-run", "invoices", "voids", "order-guide"];
    if (managerOnlyScreens.includes(target) && !isManager) {
      toast.error("Manager access required");
      return;
    }
    setScreen(target);
  };

  // ─── PIN Login Handler ──────────────────────────────────────────────
  const handlePinLogin = async (fullPin: string) => {
    try {
      const result = await loginByPin.mutateAsync({ pin: fullPin });
      if (result.success && result.staff) {
        setStaffUser(result.staff as SafeStaff);
        setScreen("welcome");
      } else {
        setPin("");
        toast.error("Invalid PIN");
      }
    } catch {
      setPin("");
      toast.error("Login failed — check connection");
    }
  };

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
          <p className="text-zinc-500 text-sm mb-6">Select your department, then tap your name or enter PIN</p>

          {!selectedDept ? (
            <div className="space-y-2">
              {(Object.keys(DEPT_CONFIG) as Department[]).map((dept) => {
                const cfg = DEPT_CONFIG[dept];
                const Icon = cfg.icon;
                return (
                  <button key={dept} onClick={() => setSelectedDept(dept)} className="w-full flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 transition-all">
                    <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center">
                      <Icon size={16} className="text-amber-500" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-white font-semibold text-sm">{cfg.label}</p>
                      <p className="text-zinc-500 text-[11px]">{cfg.desc}</p>
                    </div>
                    <ChevronRight size={14} className="text-zinc-600" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div>
              <button onClick={() => { setSelectedDept(null); setPin(""); }} className="text-amber-500 text-sm mb-4 flex items-center gap-1">
                <ChevronLeft size={14} /> Back
              </button>

              {staffByDept.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="text-amber-500 animate-spin" />
                  <span className="text-zinc-400 text-sm ml-2">Loading staff...</span>
                </div>
              ) : (
                <div className="space-y-1.5 mb-5 max-h-[200px] overflow-y-auto">
                  {deptStaff.filter(s => s.status === "active").map(s => (
                    <button key={s.id} onClick={() => { setStaffUser(s as SafeStaff); setScreen("welcome"); }} className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 transition-all">
                      <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <span className="text-amber-500 text-[10px] font-bold">{s.firstName.charAt(0)}</span>
                      </div>
                      <div className="flex-1 text-left">
                        <span className="text-white text-sm">{staffDisplayName(s as SafeStaff)}</span>
                        <span className="text-zinc-500 text-[9px] ml-2">{roleLabel(s.jobRole)}</span>
                      </div>
                      {s.isKeyEmployee && <span className="text-amber-500 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30">KEY</span>}
                    </button>
                  ))}
                  {deptStaff.filter(s => s.status === "active").length === 0 && (
                    <p className="text-zinc-500 text-sm text-center py-4">No active staff in this department</p>
                  )}
                </div>
              )}

              {/* PIN */}
              <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
                <p className="text-zinc-400 text-[10px] mb-2 uppercase tracking-wider">Or enter PIN</p>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex gap-1.5 flex-1">
                    {[0,1,2,3].map(i => (
                      <div key={i} className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-lg font-bold ${pin.length > i ? 'border-amber-500 text-amber-500' : 'border-zinc-700 text-zinc-700'}`}>
                        {pin.length > i ? (showPin ? pin[i] : "\u2022") : ""}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setShowPin(!showPin)} className="text-zinc-500 p-1">
                    {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[1,2,3,4,5,6,7,8,9,null,0,"\u232b"].map((n, i) => (
                    <button key={i} onClick={() => {
                      if (n === "\u232b") setPin(p => p.slice(0, -1));
                      else if (n !== null && pin.length < 4) {
                        const newPin = pin + n;
                        setPin(newPin);
                        if (newPin.length === 4) handlePinLogin(newPin);
                      }
                    }} className={`h-10 rounded-lg font-bold text-base transition-all ${n === null ? 'invisible' : 'bg-zinc-800 text-white hover:bg-zinc-700 active:bg-amber-500 active:text-black'}`}>
                      {n}
                    </button>
                  ))}
                </div>
                {loginByPin.isPending && (
                  <div className="flex items-center justify-center mt-2">
                    <Loader2 size={14} className="text-amber-500 animate-spin" />
                    <span className="text-zinc-400 text-xs ml-1">Checking PIN...</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ─── WELCOME ──────────────────────────────────────────────────────
  const WelcomeScreen = () => {
    const rank = leaderboard.findIndex(s => s.id === staffUser?.id) + 1;
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-5">
            <Zap size={24} className="text-amber-500" />
          </div>
          <h1 className="text-xl font-black text-white mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.03em" }}>
            HEY {staffUser?.firstName?.toUpperCase()}
          </h1>
          <p className="text-zinc-400 text-sm mb-1">
            Welcome to the new wave. Let's have a great shift.
          </p>
          <p className="text-zinc-600 text-xs mb-6 leading-relaxed">
            Your tasks, your score, your growth — it all lives here now.
          </p>
          <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-400 text-[10px] uppercase">Your Score</span>
              <span className="text-amber-500 font-bold">{staffUser?.totalPoints?.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Flame size={12} className="text-orange-500" />
                <span className="text-white text-xs">{staffUser?.currentStreak}d streak</span>
              </div>
              {rank > 0 && (
                <div className="flex items-center gap-1">
                  <Trophy size={12} className="text-yellow-500" />
                  <span className="text-white text-xs">#{rank} rank</span>
                </div>
              )}
            </div>
          </div>
          <button onClick={() => setScreen("briefing")} className="w-full py-3 rounded-xl bg-amber-500 text-black font-bold text-sm">
            See Today's Briefing <ArrowRight size={14} className="inline ml-1" />
          </button>
        </div>
      </div>
    );
  };

  // ─── BRIEFING — Gamified for staff, raw numbers for managers ──────────
  const BriefingScreen = () => {
    const eightySixed: string[] = briefing?.eightySixedItems ? (briefing.eightySixedItems as string[]) : [];
    const specials: { name: string; description: string }[] = briefing?.specials ? (briefing.specials as any[]) : [];
    const openIssuesBriefing: { description: string; priority: string }[] = briefing?.openIssues ? (briefing.openIssues as any[]) : [];
    const shoutouts: { staffName: string; reason: string }[] = briefing?.shoutouts ? (briefing.shoutouts as any[]) : [];
    const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    const vibe = salesVibe(briefing?.salesYesterday ? Number(briefing.salesYesterday) : null);

    return (
      <div className="h-screen bg-black flex flex-col overflow-y-auto pb-6">
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-black text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>TODAY'S BRIEFING</h2>
              <p className="text-zinc-500 text-[10px]">{today}</p>
            </div>
            <Sun size={18} className="text-amber-500" />
          </div>

          {briefingQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="text-amber-500 animate-spin" />
            </div>
          ) : briefing ? (
            <>
              {/* Yesterday's recap — GAMIFIED for staff, raw for managers */}
              <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 mb-3">
                <p className="text-zinc-400 text-[10px] uppercase mb-2">Yesterday</p>
                {isManager ? (
                  <div className="flex gap-6">
                    <div>
                      <p className="text-xl font-bold text-white">${briefing.salesYesterday || "—"}</p>
                      <p className="text-zinc-500 text-[10px]">sales</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-white">{briefing.ordersYesterday || "—"}</p>
                      <p className="text-zinc-500 text-[10px]">orders</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <Sparkles size={18} className="text-amber-500" />
                    </div>
                    <div>
                      <p className={`text-lg font-bold ${vibe.color}`}>{vibe.label}</p>
                      <p className="text-zinc-500 text-[10px]">Keep the energy going today</p>
                    </div>
                  </div>
                )}
                {shoutouts.length > 0 && (
                  <p className="text-yellow-500 text-xs mt-2 flex items-center gap-1">
                    <Trophy size={10} />{shoutouts[0].staffName} — {shoutouts[0].reason}
                  </p>
                )}
              </div>

              {eightySixed.length > 0 && (
                <div className="bg-red-950/30 rounded-xl p-3 border border-red-900/50 mb-3">
                  <p className="text-red-400 text-[10px] uppercase mb-1 flex items-center gap-1 font-semibold"><AlertTriangle size={10} />86'd Today</p>
                  {eightySixed.map((item, i) => <p key={i} className="text-white text-sm">{item}</p>)}
                </div>
              )}

              {specials.length > 0 && (
                <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 mb-3">
                  <p className="text-zinc-400 text-[10px] uppercase mb-1">Specials</p>
                  {specials.map((s, i) => <p key={i} className="text-white text-sm">{s.name}: {s.description}</p>)}
                </div>
              )}

              {openIssuesBriefing.length > 0 && (
                <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 mb-3">
                  <p className="text-zinc-400 text-[10px] uppercase mb-1">Open Issues</p>
                  {openIssuesBriefing.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 bg-amber-500" />
                      <p className="text-white text-sm">{issue.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 mb-3 text-center">
              <p className="text-zinc-400 text-sm">No briefing posted yet today.</p>
            </div>
          )}

          <button onClick={() => setScreen("home")} className="w-full py-3 rounded-xl bg-amber-500 text-black font-bold text-sm">
            Let's Go <ArrowRight size={14} className="inline ml-1" />
          </button>
        </div>
      </div>
    );
  };

  // ─── HOME — Role-Aware ──────────────────────────────────────────────
  const HomeScreen = () => {
    if (!staffUser) return null;

    const totalTasks = myChecklists.reduce((s, c) => {
      const items = c.items as any[];
      return s + (items?.length || 0);
    }, 0);
    const doneTasks = Object.values(checklistProgress).filter(Boolean).length;
    const rank = leaderboard.findIndex(s => s.id === staffUser.id) + 1;
    const isDriver = staffUser.department === "driver" || staffUser.jobRole === "driver";

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

    return (
      <div className="h-screen bg-black flex flex-col overflow-y-auto pb-20">
        {/* Header */}
        <div className="p-4 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-zinc-500 text-xs">{greeting}</p>
              <h1 className="text-xl font-black text-white" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.03em" }}>
                {staffUser.firstName}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                <Trophy size={10} className="text-amber-500" />
                <span className="text-amber-500 text-xs font-bold">{staffUser.totalPoints?.toLocaleString()}</span>
              </div>
              {staffUser.currentStreak > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
                  <Flame size={10} className="text-orange-500" />
                  <span className="text-orange-500 text-xs font-bold">{staffUser.currentStreak}d</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 space-y-3">
          {/* 86'd Alert — visible to everyone */}
          {briefing && (briefing.eightySixedItems as string[])?.length > 0 && (
            <div className="bg-red-950/30 rounded-xl p-3 border border-red-900/50">
              <p className="text-red-400 text-[10px] uppercase mb-1 flex items-center gap-1 font-semibold"><AlertTriangle size={10} />86'd Right Now</p>
              <p className="text-white text-sm">{(briefing.eightySixedItems as string[]).join(" · ")}</p>
            </div>
          )}

          {/* Your Tasks — Checklists */}
          {myChecklists.length > 0 && (
            <button onClick={() => navigateTo("checklist")} className="w-full bg-zinc-900 rounded-xl p-4 border border-zinc-800 hover:border-amber-500/30 transition-all text-left">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ClipboardCheck size={16} className="text-green-500" />
                  <span className="text-white font-semibold text-sm">Your Checklists</span>
                </div>
                <ChevronRight size={14} className="text-zinc-600" />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0}%` }} />
                </div>
                <span className="text-zinc-400 text-xs">{doneTasks}/{totalTasks}</span>
              </div>
              {myChecklists.map(cl => (
                <p key={cl.id} className="text-zinc-500 text-[10px] mt-1">{cl.name}</p>
              ))}
            </button>
          )}

          {/* Driver EOD — only for drivers */}
          {isDriver && (
            <button onClick={() => navigateTo("driver-eod")} className="w-full bg-zinc-900 rounded-xl p-4 border border-zinc-800 hover:border-amber-500/30 transition-all text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck size={16} className="text-amber-500" />
                  <div>
                    <span className="text-white font-semibold text-sm">End of Day Report</span>
                    <p className="text-zinc-500 text-[10px]">Required before clocking out</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-zinc-600" />
              </div>
            </button>
          )}

          {/* Command Center — only for managers/owners */}
          {isManager && (
            <button onClick={() => navigateTo("command")} className="w-full bg-gradient-to-r from-amber-500/10 to-amber-600/5 rounded-xl p-4 border border-amber-500/20 hover:border-amber-500/40 transition-all text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-amber-500" />
                  <div>
                    <span className="text-white font-semibold text-sm">Command Center</span>
                    <p className="text-zinc-500 text-[10px]">Operations · Team · Issues</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-amber-500" />
              </div>
            </button>
          )}

          {/* Quick Actions — contextual by role */}
          <div className="grid grid-cols-2 gap-2">
            {isManager && (
              <>
                <QuickAction icon={Receipt} label="Store Runs" color="text-emerald-500" bg="bg-emerald-500/10" onClick={() => navigateTo("store-run")} />
                <QuickAction icon={Package} label="Invoices" color="text-teal-500" bg="bg-teal-500/10" onClick={() => navigateTo("invoices")} />
                <QuickAction icon={ShoppingCart} label="Order Guide" color="text-cyan-500" bg="bg-cyan-500/10" onClick={() => navigateTo("order-guide")} />
              </>
            )}
            <QuickAction icon={ArrowRight} label="Shift Handoff" color="text-orange-500" bg="bg-orange-500/10" onClick={() => navigateTo("shift-handoff")} />
            <QuickAction icon={AlertTriangle} label="Report Issue" color="text-red-500" bg="bg-red-500/10" onClick={() => navigateTo("issues")} />
            <QuickAction icon={Send} label="Feedback" color="text-pink-500" bg="bg-pink-500/10" onClick={() => navigateTo("feedback")} subtitle="+5 pts" />
          </div>

          {/* AI Intelligence Actions */}
          <div className="grid grid-cols-4 gap-2">
            <button onClick={() => navigateTo("ask-brain")} className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all">
              <Brain size={18} className="text-purple-400" />
              <span className="text-[9px] text-purple-300 font-medium">Ask Brain</span>
            </button>
            <button onClick={() => navigateTo("photo-missions")} className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 transition-all">
              <Camera size={18} className="text-emerald-400" />
              <span className="text-[9px] text-emerald-300 font-medium">Missions</span>
            </button>
            <button onClick={() => navigateTo("achievements")} className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-all">
              <Trophy size={18} className="text-amber-400" />
              <span className="text-[9px] text-amber-300 font-medium">Badges</span>
            </button>
            <button onClick={() => navigateTo("rewards-shop")} className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 hover:border-pink-500/40 transition-all">
              <Gift size={18} className="text-pink-400" />
              <span className="text-[9px] text-pink-300 font-medium">Rewards</span>
            </button>
          </div>

          {/* Leaderboard Preview */}
          {leaderboard.length > 0 && (
            <button onClick={() => navigateTo("leaderboard")} className="w-full bg-zinc-900 rounded-xl p-3 border border-zinc-800 hover:border-amber-500/30 transition-all text-left">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Trophy size={14} className="text-yellow-500" />
                  <span className="text-white font-semibold text-sm">Leaderboard</span>
                </div>
                <span className="text-zinc-500 text-xs">#{rank || "—"} of {leaderboard.length}</span>
              </div>
              <div className="flex items-center gap-1">
                {leaderboard.slice(0, 5).map((s) => (
                  <div key={s.id} className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold ${s.id === staffUser.id ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                    {s.firstName.charAt(0)}
                  </div>
                ))}
                {leaderboard.length > 5 && <span className="text-zinc-500 text-[10px] ml-1">+{leaderboard.length - 5}</span>}
              </div>
            </button>
          )}

          {/* Open Issues */}
          {openIssues.length > 0 && (
            <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
              <p className="text-zinc-400 text-[10px] uppercase mb-2">{openIssues.length} Open Issue{openIssues.length > 1 ? "s" : ""}</p>
              {openIssues.slice(0, 2).map(issue => (
                <div key={issue.id} className="flex items-center gap-2 mb-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${issue.priority === 'critical' ? 'bg-red-500' : issue.priority === 'high' ? 'bg-amber-500' : 'bg-zinc-500'}`} />
                  <span className="text-white text-xs">{issue.title}</span>
                </div>
              ))}
              {openIssues.length > 2 && (
                <button onClick={() => navigateTo("issues")} className="text-amber-500 text-[10px] mt-1">View all →</button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Quick Action Button component
  function QuickAction({ icon: Icon, label, color, bg, onClick, subtitle }: { icon: any; label: string; color: string; bg: string; onClick: () => void; subtitle?: string }) {
    return (
      <button onClick={onClick} className="flex items-center gap-2 p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/30 transition-all">
        <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
          <Icon size={14} className={color} />
        </div>
        <div className="text-left">
          <span className="text-white text-xs font-medium">{label}</span>
          {subtitle && <p className="text-zinc-500 text-[9px]">{subtitle}</p>}
        </div>
      </button>
    );
  }

  // ─── CHECKLIST ──────────────────────────────────────────────────────
  const ChecklistScreen = () => (
    <div className="h-screen bg-black flex flex-col overflow-y-auto pb-20">
      <ScreenHeader title="YOUR CHECKLISTS" subtitle={`${staffUser?.department} · ${Object.values(checklistProgress).filter(Boolean).length} completed`} />
      <div className="p-4 space-y-3">
        {checklistsQuery.isLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 size={20} className="text-amber-500 animate-spin" /></div>
        ) : myChecklists.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-8">No checklists for your department yet</p>
        ) : (
          myChecklists.map(cl => {
            const items = (cl.items as any[]) || [];
            return (
              <div key={cl.id} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                <div className="p-3 border-b border-zinc-800">
                  <p className="text-white font-semibold text-sm">{cl.name}</p>
                  <p className="text-zinc-500 text-[10px]">
                    {items.filter((_, i) => checklistProgress[`${cl.id}-${i}`]).length}/{items.length} · {cl.type}
                  </p>
                </div>
                <div className="p-2 space-y-0.5">
                  {items.map((item: any, ii: number) => {
                    const key = `${cl.id}-${ii}`;
                    const done = checklistProgress[key];
                    return (
                      <button key={ii} onClick={() => setChecklistProgress(p => ({ ...p, [key]: !p[key] }))} className={`w-full flex items-center gap-2 p-2 rounded-lg transition-all ${done ? 'bg-green-500/10' : 'hover:bg-zinc-800'}`}>
                        {done ? <CheckCircle2 size={14} className="text-green-500 shrink-0" /> : <Circle size={14} className="text-zinc-600 shrink-0" />}
                        <span className={`text-xs text-left ${done ? 'text-zinc-500 line-through' : 'text-white'}`}>{item.task}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // ─── Shared Photo Upload Handler ──────────────────────────────────────
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>, context: "payout" | "invoice" | "issue") => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Photo must be under 5MB"); return; }
    const isInvoice = context === "invoice";
    if (isInvoice) setUploadingInvoicePhoto(true); else setUploadingPhoto(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]); // strip data:...;base64, prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { url } = await uploadReceipt.mutateAsync({
        base64,
        filename: file.name,
        mimeType: file.type || "image/jpeg",
        context,
      });
      if (isInvoice) {
        setInvoicePhotoUrl(url);
        toast.success("Invoice photo uploaded — analyzing...");
        // Auto-analyze invoice photo with AI vision
        try {
          const analysis = await analyzePhoto.mutateAsync({
            photoUrl: url,
            photoType: "invoice",
            staffId: staffUser?.id || 0,
          });
          // Auto-fill form fields from AI extraction
          if (analysis.extraction) {
            const ext = analysis.extraction;
            if (ext.vendor && !invoiceForm.vendorName) {
              setInvoiceForm(f => ({ ...f, vendorName: ext.vendor, customVendor: !COMMON_VENDORS_SET.has(ext.vendor) }));
            }
            if (ext.total && !invoiceForm.totalAmount) {
              setInvoiceForm(f => ({ ...f, totalAmount: String(ext.total) }));
            }
            if (ext.invoiceNumber && !invoiceForm.invoiceNumber) {
              setInvoiceForm(f => ({ ...f, invoiceNumber: ext.invoiceNumber }));
            }
            if (ext.items && Array.isArray(ext.items)) {
              setInvoiceExtractedItems(ext.items);
            }
            toast.success("AI extracted invoice data — review and submit");
          }
        } catch {
          // Analysis failed silently — user can still fill manually
          toast.info("Photo saved. Fill in details manually.");
        }
      } else {
        setReceiptPhotoUrl(url);
        toast.success("Receipt uploaded");
      }
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      if (isInvoice) setUploadingInvoicePhoto(false); else setUploadingPhoto(false);
    }
  };

  // ─── STORE RUN / PAY OUT — Manager Only ──────────────────────────────
  const StoreRunScreen = () => {
    if (!isManager) return <AccessDenied />;

    const weeklyTotal = allPayouts.reduce((s, p) => s + parseFloat(p.amount), 0);
    const flaggedCount = allPayouts.filter(p => p.flagged).length;

    const handleSubmitStoreRun = async () => {
      if (!isAuthenticated) { toast.error("Please sign in via Manus to log store runs"); return; }
      if (!staffUser || !storeRunForm.amount || !storeRunForm.description || !storeRunForm.vendor) {
        toast.error("Please fill in all required fields: what, amount, and where");
        return;
      }
      const authId = storeRunForm.authorizedById || (staffUser.isKeyEmployee ? staffUser.id : 0);
      if (!authId) {
        toast.error("A key employee must authorize this payout");
        return;
      }
      try {
        await createPayout.mutateAsync({
          staffId: staffUser.id,
          date: new Date(),
          amount: storeRunForm.amount,
          description: storeRunForm.description,
          vendor: storeRunForm.vendor,
          category: storeRunForm.category as any,
          authorizedById: authId,
          receiptPhotoUrl: receiptPhotoUrl || undefined,
        });
        toast.success("Store run logged");
        setStoreRunForm({ description: "", amount: "", vendor: "", category: "food", authorizedById: 0 });
        setReceiptPhotoUrl(null);
      } catch { toast.error("Failed to log — try again"); }
    };

    return (
      <div className="h-screen bg-black flex flex-col overflow-y-auto pb-20">
        <ScreenHeader title="STORE RUNS & PAY OUTS" subtitle="Receipt capture · Manager approval required" />
        <div className="p-4 space-y-3">
          {/* New Store Run Form */}
          <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 space-y-2">
            <p className="text-zinc-400 text-[10px] uppercase font-semibold">Log New Store Run</p>
            <input value={storeRunForm.description} onChange={e => setStoreRunForm(f => ({ ...f, description: e.target.value }))} placeholder="What was purchased?" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50" />
            <div className="flex gap-2">
              <input value={storeRunForm.amount} onChange={e => setStoreRunForm(f => ({ ...f, amount: e.target.value }))} placeholder="Amount ($)" type="number" step="0.01" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50" />
              <input value={storeRunForm.vendor} onChange={e => setStoreRunForm(f => ({ ...f, vendor: e.target.value }))} placeholder="Where?" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50" />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {["food", "supplies", "equipment", "misc"].map(cat => (
                <button key={cat} onClick={() => setStoreRunForm(f => ({ ...f, category: cat }))} className={`px-2 py-1 rounded-full text-[9px] border capitalize ${storeRunForm.category === cat ? 'bg-amber-500/20 border-amber-500/50 text-amber-500' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>{cat}</button>
              ))}
            </div>
            <div>
              <label className="text-zinc-400 text-[10px] uppercase block mb-1">Authorized By (Key Employee)</label>
              <select
                value={storeRunForm.authorizedById}
                onChange={e => setStoreRunForm(f => ({ ...f, authorizedById: Number(e.target.value) }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-amber-500/50"
              >
                <option value={0}>{staffUser?.isKeyEmployee ? `${staffDisplayName(staffUser)} (me)` : "Select authorizer..."}</option>
                {keyEmployees.filter(k => k.id !== staffUser?.id).map(k => (
                  <option key={k.id} value={k.id}>{staffDisplayName(k)} ({roleLabel(k.jobRole)})</option>
                ))}
              </select>
            </div>
            {/* Receipt Photo Capture */}
            <div>
              <label className="text-zinc-400 text-[10px] uppercase block mb-1">Receipt Photo</label>
              <div className="flex items-center gap-2">
                <label className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                  receiptPhotoUrl ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-amber-500/30'
                }`}>
                  {uploadingPhoto ? (
                    <><Loader2 size={14} className="animate-spin" /><span className="text-xs">Uploading...</span></>
                  ) : receiptPhotoUrl ? (
                    <><CheckCircle2 size={14} /><span className="text-xs">Receipt Attached</span></>
                  ) : (
                    <><Camera size={14} /><span className="text-xs">Snap Receipt</span></>
                  )}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handlePhotoCapture(e, "payout")} disabled={uploadingPhoto} />
                </label>
                {receiptPhotoUrl && (
                  <button onClick={() => setReceiptPhotoUrl(null)} className="text-red-400 text-[9px] px-2 py-1 border border-red-500/30 rounded-lg hover:bg-red-500/10">
                    Remove
                  </button>
                )}
              </div>
            </div>
            <button onClick={handleSubmitStoreRun} disabled={createPayout.isPending || uploadingPhoto} className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm disabled:opacity-50">
              {createPayout.isPending ? "Saving..." : "Log Store Run"}
            </button>
          </div>

          <div className="bg-amber-500/10 rounded-xl p-3 border border-amber-500/30">
            <p className="text-amber-500 text-[10px] uppercase font-semibold mb-1">Authorization Rule</p>
            <p className="text-zinc-300 text-xs">Only KEY employees can hand cash for pay outs.</p>
          </div>

          <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
            <div className="flex items-center justify-between">
              <p className="text-zinc-400 text-[10px] uppercase">This Week's Pay Outs</p>
              <p className="text-white font-bold">${weeklyTotal.toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-red-400 text-xs">{flaggedCount} flagged</span>
            </div>
          </div>

          {payoutsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 size={20} className="text-amber-500 animate-spin" /></div>
          ) : (
            <>
              <p className="text-zinc-400 text-[10px] uppercase tracking-wider">Recent Pay Outs</p>
              {allPayouts.length === 0 && <p className="text-zinc-500 text-sm text-center py-4">No pay outs recorded yet</p>}
              {allPayouts.map(po => (
                <div key={po.id} className={`p-3 rounded-xl border ${po.flagged ? 'bg-red-950/20 border-red-900/50' : 'bg-zinc-900 border-zinc-800'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm font-medium">Staff #{po.staffId}</span>
                    <span className="text-amber-500 font-bold text-sm">${po.amount}</span>
                  </div>
                  <p className="text-zinc-400 text-xs">{po.description || "—"} · {po.vendor || "Unknown"}</p>
                  <p className="text-zinc-500 text-[10px]">{new Date(po.date).toLocaleDateString()} · {po.category}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {po.receiptPhotoUrl ? <span className="text-green-500 text-[9px] flex items-center gap-0.5"><CheckCircle2 size={8} />Receipt</span> : <span className="text-red-400 text-[9px]">No receipt</span>}
                    {po.authorizedById ? <span className="text-green-500 text-[9px] flex items-center gap-0.5"><CheckCircle2 size={8} />Authorized</span> : <span className="text-red-400 text-[9px]">Unauthorized</span>}
                  </div>
                  {po.flagged && po.flagReason && <p className="text-red-400 text-[10px] mt-1.5 bg-red-500/10 rounded p-1.5">{po.flagReason}</p>}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    );
  };

  // ─── INVOICES — Manager Only ──────────────────────────────────────────
  const InvoiceScreen = () => {
    if (!isManager) return <AccessDenied />;

    const weeklyTotal = allInvoices.reduce((s, inv) => s + parseFloat(inv.totalAmount), 0);
    const vendorTotals = useMemo(() => {
      const map: Record<string, number> = {};
      allInvoices.forEach(inv => { map[inv.vendorName] = (map[inv.vendorName] || 0) + parseFloat(inv.totalAmount); });
      return Object.entries(map).sort((a, b) => b[1] - a[1]);
    }, [allInvoices]);
    const vendorColors = ["bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-purple-500"];
    const INVOICE_CATEGORIES = ["meat", "bread", "produce", "liquor", "beer", "supplies", "misc"] as const;
    const COMMON_VENDORS = ["Sawyer's Meats", "Hughes Distributing", "Fort Dodge Distributing", "Confluence Brewing", "Hy-Vee", "Fareway", "Dollar General"];

    const handleSubmitInvoice = async () => {
      if (!isAuthenticated) { toast.error("Please sign in via Manus to log invoices"); return; }
      if (!invoiceForm.vendorName || !invoiceForm.totalAmount) {
        toast.error("Vendor name and total amount are required");
        return;
      }
      try {
        await createInvoice.mutateAsync({
          vendorName: invoiceForm.vendorName,
          date: new Date(),
          totalAmount: invoiceForm.totalAmount,
          category: invoiceForm.category as any,
          invoiceNumber: invoiceForm.invoiceNumber || undefined,
          receiptPhotoUrl: invoicePhotoUrl || undefined,
          items: invoiceExtractedItems.length > 0 ? invoiceExtractedItems : undefined,
        });
        toast.success("Invoice logged" + (invoiceExtractedItems.length > 0 ? ` — ${invoiceExtractedItems.length} product prices updated` : ""));
        setInvoiceForm({ vendorName: "", totalAmount: "", category: "meat", invoiceNumber: "", customVendor: false });
        setInvoicePhotoUrl(null);
        setInvoiceExtractedItems([]);
        invoicesQuery.refetch();
      } catch { toast.error("Failed to log invoice"); }
    };

    return (
      <div className="h-screen bg-black flex flex-col overflow-y-auto pb-20">
        <ScreenHeader title="VENDOR INVOICES" subtitle="Track spend · Flag anomalies" />
        <div className="p-4 space-y-3">
          {/* Weekly Spend Summary */}
          <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
            <p className="text-zinc-400 text-[10px] uppercase mb-2">This Week's Vendor Spend</p>
            <p className="text-white text-2xl font-bold">${weeklyTotal.toFixed(2)}</p>
            <div className="mt-2 space-y-1">
              {vendorTotals.map(([vendor, total], i) => (
                <div key={vendor} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${vendorColors[i % vendorColors.length]}`} />
                  <span className="text-zinc-300 text-xs flex-1">{vendor}</span>
                  <span className="text-white text-xs font-medium">${total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* New Invoice Form */}
          <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 space-y-2">
            <p className="text-zinc-400 text-[10px] uppercase font-semibold">Log New Invoice</p>
            <div>
              <label className="text-zinc-400 text-[10px] uppercase block mb-1">Vendor</label>
              {!invoiceForm.customVendor ? (
                <select
                  value={invoiceForm.vendorName}
                  onChange={e => {
                    if (e.target.value === "__custom") {
                      setInvoiceForm(f => ({ ...f, vendorName: "", customVendor: true }));
                    } else {
                      setInvoiceForm(f => ({ ...f, vendorName: e.target.value }));
                    }
                  }}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-amber-500/50"
                >
                  <option value="">Select vendor...</option>
                  {COMMON_VENDORS.map(v => <option key={v} value={v}>{v}</option>)}
                  <option value="__custom">Other (type below)</option>
                </select>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={invoiceForm.vendorName}
                    onChange={e => setInvoiceForm(f => ({ ...f, vendorName: e.target.value }))}
                    placeholder="Enter vendor name"
                    autoFocus
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
                  />
                  <button onClick={() => setInvoiceForm(f => ({ ...f, vendorName: "", customVendor: false }))} className="text-zinc-400 text-xs px-2 border border-zinc-700 rounded-lg hover:border-amber-500/30">Back</button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <input value={invoiceForm.totalAmount} onChange={e => setInvoiceForm(f => ({ ...f, totalAmount: e.target.value }))} placeholder="Total ($)" type="number" step="0.01" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50" />
              <input value={invoiceForm.invoiceNumber} onChange={e => setInvoiceForm(f => ({ ...f, invoiceNumber: e.target.value }))} placeholder="Invoice # (optional)" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50" />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {INVOICE_CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setInvoiceForm(f => ({ ...f, category: cat }))} className={`px-2 py-1 rounded-full text-[9px] border capitalize ${invoiceForm.category === cat ? 'bg-teal-500/20 border-teal-500/50 text-teal-400' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>{cat}</button>
              ))}
            </div>
            {/* Invoice Photo Capture */}
            <div>
              <label className="text-zinc-400 text-[10px] uppercase block mb-1">Invoice Photo</label>
              <div className="flex items-center gap-2">
                <label className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                  invoicePhotoUrl ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-teal-500/30'
                }`}>
                  {uploadingInvoicePhoto ? (
                    <><Loader2 size={14} className="animate-spin" /><span className="text-xs">Uploading...</span></>
                  ) : invoicePhotoUrl ? (
                    <><CheckCircle2 size={14} /><span className="text-xs">Invoice Attached</span></>
                  ) : (
                    <><Camera size={14} /><span className="text-xs">Snap Invoice</span></>
                  )}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handlePhotoCapture(e, "invoice")} disabled={uploadingInvoicePhoto} />
                </label>
                {invoicePhotoUrl && (
                  <button onClick={() => setInvoicePhotoUrl(null)} className="text-red-400 text-[9px] px-2 py-1 border border-red-500/30 rounded-lg hover:bg-red-500/10">
                    Remove
                  </button>
                )}
              </div>
            </div>
            <button onClick={handleSubmitInvoice} disabled={createInvoice.isPending || uploadingInvoicePhoto} className="w-full py-2.5 rounded-xl bg-teal-600 text-white font-bold text-sm disabled:opacity-50">
              {createInvoice.isPending ? "Saving..." : "Log Invoice"}
            </button>
          </div>

          {/* Invoice List */}
          {invoicesQuery.isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 size={20} className="text-amber-500 animate-spin" /></div>
          ) : (
            <>
              <p className="text-zinc-400 text-[10px] uppercase tracking-wider">Recent Invoices</p>
              {allInvoices.length === 0 && <p className="text-zinc-500 text-sm text-center py-4">No invoices recorded yet</p>}
              {allInvoices.map(inv => (
                <div key={inv.id} className="bg-zinc-900 rounded-xl border border-zinc-800 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">{inv.vendorName}</p>
                      <p className="text-zinc-500 text-[10px]">{new Date(inv.date).toLocaleDateString()} · {inv.category}{inv.invoiceNumber ? ` · #${inv.invoiceNumber}` : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-amber-500 font-bold">${inv.totalAmount}</p>
                      {inv.receiptPhotoUrl ? <span className="text-green-500 text-[9px] flex items-center gap-0.5 justify-end"><CheckCircle2 size={8} />Photo</span> : <span className="text-zinc-600 text-[9px]">No photo</span>}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    );
  };

  // ─── VOID HUNTER — Manager Only ──────────────────────────────────────
  const VoidScreen = () => {
    if (!isManager) return <AccessDenied />;

    const voidCount = allVoids.filter(v => v.type === "void").length;
    const compCount = allVoids.filter(v => v.type === "comp").length;
    const promoCount = allVoids.filter(v => ["promo", "discount", "credit"].includes(v.type)).length;

    const voidsByStaff = useMemo(() => {
      const map: Record<number, number> = {};
      allVoids.forEach(v => { map[v.staffId] = (map[v.staffId] || 0) + 1; });
      return Object.entries(map).map(([id, count]) => {
        const s = allStaff.find(st => st.id === Number(id));
        return { staffId: Number(id), name: s ? staffDisplayName(s) : `Staff #${id}`, count, initial: s?.firstName?.charAt(0) || "?" };
      }).sort((a, b) => b.count - a.count);
    }, [allVoids, allStaff]);

    return (
      <div className="h-screen bg-black flex flex-col overflow-y-auto pb-20">
        <ScreenHeader title="VOID HUNTER" subtitle="Pattern tracking · This week" />
        <div className="p-4 space-y-3">
          <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="text-xl font-bold text-white">{voidCount}</p><p className="text-zinc-500 text-[9px]">Voids</p></div>
              <div><p className="text-xl font-bold text-white">{compCount}</p><p className="text-zinc-500 text-[9px]">Comps</p></div>
              <div><p className="text-xl font-bold text-white">{promoCount}</p><p className="text-zinc-500 text-[9px]">Promos</p></div>
            </div>
          </div>

          {voidsByStaff.length > 0 && (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <div className="p-3 border-b border-zinc-800"><p className="text-zinc-400 text-[10px] uppercase">By Employee</p></div>
              {voidsByStaff.map((vs, i) => (
                <div key={i} className={`flex items-center justify-between p-2.5 border-b border-zinc-800 last:border-0 ${vs.count >= 3 ? 'bg-red-950/20' : ''}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center"><span className="text-zinc-400 text-[9px]">{vs.initial}</span></div>
                    <span className="text-white text-sm">{vs.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-bold ${vs.count >= 3 ? 'text-red-500' : vs.count >= 2 ? 'text-yellow-500' : 'text-zinc-400'}`}>{vs.count}</span>
                    {vs.count >= 3 && <AlertTriangle size={10} className="text-red-500" />}
                  </div>
                </div>
              ))}
            </div>
          )}

          {voidsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 size={20} className="text-amber-500 animate-spin" /></div>
          ) : (
            <>
              <p className="text-zinc-400 text-[10px] uppercase tracking-wider">Recent Voids</p>
              {allVoids.length === 0 && <p className="text-zinc-500 text-sm text-center py-4">No voids — clean week!</p>}
              {allVoids.slice(0, 10).map(v => {
                const staffName = allStaff.find(s => s.id === v.staffId);
                return (
                  <div key={v.id} className="p-2.5 rounded-lg border bg-zinc-900 border-zinc-800">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-white text-sm font-medium">{staffName ? staffDisplayName(staffName) : `Staff #${v.staffId}`}</span>
                      <span className="text-zinc-500 text-[9px]">{new Date(v.date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-zinc-400 text-xs">{v.type} · ${v.amount} — "{v.reason}"</p>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    );
  };

  // ─── DRIVER EOD ──────────────────────────────────────────────────────
  const DriverEODScreen = () => {
    const handleSubmitEOD = async () => {
      if (!isAuthenticated) { toast.error("Please sign in via Manus to submit reports"); return; }
      if (!staffUser) return;
      try {
        await createDriverReport.mutateAsync({
          staffId: staffUser.id,
          date: new Date(),
          totalDeliveries: 0,
          outOfTownRuns: driverEOD.outOfTown ? [{ destination: driverEOD.outOfTown }] : undefined,
          specialRuns: driverEOD.specialRuns ? [{ description: driverEOD.specialRuns }] : undefined,
          cashFromTill: driverEOD.cashFromTill || undefined,
          cashReason: driverEOD.notes || undefined,
          redeliveries: driverEOD.redeliveries ? [{ description: driverEOD.redeliveries }] : undefined,
          managerHandedCash: false,
        });
        toast.success("EOD Report submitted");
        setDriverEOD({ outOfTown: "", specialRuns: "", cashFromTill: "", redeliveries: "", notes: "" });
      } catch { toast.error("Failed to submit — try again"); }
    };

    return (
      <div className="h-screen bg-black flex flex-col overflow-y-auto pb-20">
        <ScreenHeader title="DRIVER END OF DAY" subtitle="Required before clocking out" />
        <div className="p-4 space-y-3">
          <div className="bg-red-950/30 rounded-xl p-2.5 border border-red-900/50">
            <p className="text-red-400 text-xs font-semibold">No sheet = No reimbursement. Manager must hand you cash — not front staff.</p>
          </div>
          {[
            { key: "outOfTown", label: "Out-of-Town Runs", placeholder: "Where? (leave blank if none)" },
            { key: "specialRuns", label: "Special Runs", placeholder: "Catering, non-standard deliveries" },
            { key: "cashFromTill", label: "Cash From Till", placeholder: "Amount + reason (e.g., $5 gas for Lehigh)" },
            { key: "redeliveries", label: "Redeliveries", placeholder: "Ticket # + reason" },
            { key: "notes", label: "Notes", placeholder: "Anything else" },
          ].map(field => (
            <div key={field.key} className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
              <label className="text-zinc-400 text-[10px] uppercase block mb-1.5">{field.label}</label>
              <textarea value={(driverEOD as any)[field.key]} onChange={e => setDriverEOD(d => ({ ...d, [field.key]: e.target.value }))} placeholder={field.placeholder} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 min-h-[50px] resize-none" />
            </div>
          ))}
          <button onClick={handleSubmitEOD} disabled={createDriverReport.isPending} className="w-full py-3 rounded-xl bg-amber-500 text-black font-bold text-sm disabled:opacity-50">
            {createDriverReport.isPending ? "Submitting..." : "Submit EOD Report"}
          </button>
        </div>
      </div>
    );
  };

  // ─── FEEDBACK ──────────────────────────────────────────────────────
  const FeedbackScreen = () => {
    const handleSubmitFeedback = async () => {
      if (!isAuthenticated) { toast.error("Please sign in via Manus to submit feedback"); return; }
      if (!staffUser || !feedbackText.trim()) return;
      try {
        await createFeedback.mutateAsync({
          staffId: staffUser.id,
          date: new Date(),
          comment: feedbackText,
          category: (feedbackCategory as any) || "other",
        });
        toast.success("+5 pts! Feedback submitted");
        setFeedbackText("");
        setFeedbackCategory(null);
      } catch { toast.error("Failed to submit — try again"); }
    };

    return (
      <div className="h-screen bg-black flex flex-col overflow-y-auto pb-20">
        <ScreenHeader title="SHIFT FEEDBACK" subtitle="Your voice matters · +5 pts" />
        <div className="p-4 space-y-3">
          <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
            <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="What worked? What didn't? What was blocked?" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 min-h-[100px] resize-none" />
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {["equipment", "staffing", "inventory", "customer", "management"].map(t => (
                <button key={t} onClick={() => setFeedbackCategory(feedbackCategory === t ? null : t)} className={`px-2 py-1 rounded-full text-[9px] border capitalize ${feedbackCategory === t ? 'bg-amber-500/20 border-amber-500/50 text-amber-500' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>{t}</button>
              ))}
            </div>
          </div>
          <button onClick={handleSubmitFeedback} disabled={createFeedback.isPending || !feedbackText.trim()} className="w-full py-3 rounded-xl bg-amber-500 text-black font-bold text-sm disabled:opacity-50">
            {createFeedback.isPending ? "Submitting..." : "Submit · +5 pts"}
          </button>
        </div>
      </div>
    );
  };

  // ─── ISSUES — with real create form ──────────────────────────────────
  const IssuesScreen = () => {
    const handleSubmitIssue = async () => {
      if (!isAuthenticated) { toast.error("Please sign in via Manus to report issues"); return; }
      if (!staffUser || !issueTitle.trim()) { toast.error("Please enter an issue title"); return; }
      try {
        await createIssue.mutateAsync({
          title: issueTitle,
          description: issueDesc || undefined,
          priority: issuePriority as any,
          category: issueCategory as any,
          reportedById: staffUser.id,
          date: new Date(),
        });
        toast.success("Issue reported — management notified");
        setIssueTitle("");
        setIssueDesc("");
        setIssuePriority("medium");
        setIssueCategory("equipment");
      } catch { toast.error("Failed to report — try again"); }
    };

    return (
      <div className="h-screen bg-black flex flex-col overflow-y-auto pb-20">
        <ScreenHeader title="ISSUES" subtitle="Report → Route → Resolve" />
        <div className="p-4 space-y-3">
          {/* Report Issue Form */}
          <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 space-y-2">
            <p className="text-zinc-400 text-[10px] uppercase font-semibold">Report New Issue</p>
            <input value={issueTitle} onChange={e => setIssueTitle(e.target.value)} placeholder="What's the issue?" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50" />
            <textarea value={issueDesc} onChange={e => setIssueDesc(e.target.value)} placeholder="Details (optional)" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 min-h-[50px] resize-none" />
            <div>
              <p className="text-zinc-500 text-[9px] mb-1">Priority</p>
              <div className="flex gap-1.5">
                {["low", "medium", "high", "critical"].map(p => (
                  <button key={p} onClick={() => setIssuePriority(p)} className={`px-2 py-1 rounded-full text-[9px] border capitalize ${issuePriority === p ? (p === 'critical' ? 'bg-red-500/20 border-red-500/50 text-red-400' : p === 'high' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-amber-500/20 border-amber-500/50 text-amber-500') : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>{p}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-zinc-500 text-[9px] mb-1">Category</p>
              <div className="flex gap-1.5 flex-wrap">
                {["equipment", "staffing", "inventory", "safety", "other"].map(c => (
                  <button key={c} onClick={() => setIssueCategory(c)} className={`px-2 py-1 rounded-full text-[9px] border capitalize ${issueCategory === c ? 'bg-amber-500/20 border-amber-500/50 text-amber-500' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>{c}</button>
                ))}
              </div>
            </div>
            <button onClick={handleSubmitIssue} disabled={createIssue.isPending || !issueTitle.trim()} className="w-full py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {createIssue.isPending ? <><Loader2 size={14} className="animate-spin" /> Reporting...</> : <><Plus size={14} /> Report Issue</>}
            </button>
          </div>

          {/* Existing Issues */}
          {issuesQuery.isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 size={20} className="text-amber-500 animate-spin" /></div>
          ) : openIssues.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-4">No open issues — all clear!</p>
          ) : (
            <>
              <p className="text-zinc-400 text-[10px] uppercase tracking-wider">{openIssues.length} Open</p>
              {openIssues.map(issue => (
                <div key={issue.id} className="p-3 rounded-xl border bg-zinc-900 border-zinc-800">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white text-sm font-medium">{issue.title}</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${issue.priority === 'critical' ? 'bg-red-500/20 text-red-400' : issue.priority === 'high' ? 'bg-amber-500/20 text-amber-400' : 'bg-purple-500/20 text-purple-400'}`}>{issue.priority}</span>
                  </div>
                  <p className="text-zinc-500 text-xs">{issue.category} · {new Date(issue.date).toLocaleDateString()}</p>
                  {issue.description && <p className="text-zinc-400 text-[10px] mt-1">{issue.description}</p>}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    );
  };

  // ─── LEADERBOARD — gamified, no void counts for non-managers ──────────
  const LeaderboardScreen = () => (
    <div className="h-screen bg-black flex flex-col overflow-y-auto pb-20">
      <ScreenHeader title="LEADERBOARD" subtitle="Score = shift priority" />
      <div className="p-4">
        <div className="bg-amber-500/10 rounded-xl p-2.5 border border-amber-500/30 mb-3">
          <p className="text-amber-500 text-[10px]">Higher score = first pick on preferred shifts. Execute, contribute, stay on the floor.</p>
        </div>
        {leaderboardQuery.isLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 size={20} className="text-amber-500 animate-spin" /></div>
        ) : (
          <div className="space-y-1.5">
            {leaderboard.filter(s => s.jobRole !== "owner").map((s, i) => (
              <div key={s.id} className={`flex items-center gap-2 p-2.5 rounded-xl border ${s.id === staffUser?.id ? 'bg-amber-500/10 border-amber-500/30' : 'bg-zinc-900 border-zinc-800'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-zinc-300 text-black' : i === 2 ? 'bg-amber-700 text-white' : 'bg-zinc-800 text-zinc-400'}`}>{i + 1}</div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{staffDisplayName(s)}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-500 text-[9px]">{roleLabel(s.jobRole)}</span>
                    {s.isKeyEmployee && <span className="text-amber-500 text-[8px]">KEY</span>}
                    {s.currentStreak > 7 && <span className="text-orange-500 text-[9px] flex items-center gap-0.5"><Flame size={7} />{s.currentStreak}d</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-amber-500 font-bold text-sm">{s.totalPoints.toLocaleString()}</p>
                  {/* Only show void count to managers */}
                  {isManager && <p className="text-zinc-500 text-[9px]">{s.weeklyVoids}v</p>}
                </div>
              </div>
            ))}
            {leaderboard.length === 0 && <p className="text-zinc-500 text-sm text-center py-4">No leaderboard data yet</p>}
          </div>
        )}
      </div>
    </div>
  );

  // ─── COMMAND CENTER — Manager Only ──────────────────────────────────
  const CommandScreen = () => {
    if (!isManager) return <AccessDenied />;

    const todayPayouts = allPayouts.reduce((s, p) => s + parseFloat(p.amount), 0);
    const vendorSpend = allInvoices.reduce((s, inv) => s + parseFloat(inv.totalAmount), 0);
    const voidCount = allVoids.length;
    const flaggedPayouts = allPayouts.filter(p => p.flagged).length;

    return (
      <div className="h-screen bg-black flex flex-col overflow-y-auto pb-20">
        <ScreenHeader title="COMMAND CENTER" subtitle="Owner intelligence" />
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Yesterday Sales", value: briefing ? `$${briefing.salesYesterday || "—"}` : "—", trend: briefing ? `${briefing.ordersYesterday || 0} orders` : "—", color: "text-green-500" },
              { label: "Pay Outs", value: `$${todayPayouts.toFixed(0)}`, trend: `${flaggedPayouts} flagged`, color: flaggedPayouts > 0 ? "text-red-500" : "text-green-500" },
              { label: "Voids", value: `${voidCount}`, trend: voidCount > 5 ? "Flag" : "Normal", color: voidCount > 5 ? "text-red-500" : "text-green-500" },
              { label: "Active Staff", value: `${leaderboard.length}`, trend: "On leaderboard", color: "text-green-500" },
              { label: "Vendor Spend", value: `$${vendorSpend.toFixed(0)}`, trend: "This week", color: "text-teal-500" },
              { label: "Open Issues", value: `${openIssues.length}`, trend: openIssues.length > 0 ? "Needs attention" : "All clear", color: openIssues.length > 0 ? "text-yellow-500" : "text-green-500" },
            ].map((kpi, i) => (
              <div key={i} className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
                <p className="text-zinc-400 text-[9px] uppercase">{kpi.label}</p>
                <p className="text-white text-lg font-bold">{kpi.value}</p>
                <p className={`text-[10px] ${kpi.color}`}>{kpi.trend}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => navigateTo("store-run")} className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 text-center hover:border-amber-500/30">
              <Receipt size={16} className="text-emerald-500 mx-auto mb-1" />
              <span className="text-zinc-300 text-[10px]">Pay Outs</span>
            </button>
            <button onClick={() => navigateTo("voids")} className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 text-center hover:border-amber-500/30">
              <ShieldAlert size={16} className="text-orange-500 mx-auto mb-1" />
              <span className="text-zinc-300 text-[10px]">Voids</span>
            </button>
            <button onClick={() => navigateTo("invoices")} className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 text-center hover:border-amber-500/30">
              <Package size={16} className="text-teal-500 mx-auto mb-1" />
              <span className="text-zinc-300 text-[10px]">Invoices</span>
            </button>
          </div>

          {/* Wi-Fi Proximity */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
            <div className="p-3 border-b border-zinc-800"><p className="text-white font-semibold text-sm flex items-center gap-1.5"><Wifi size={12} className="text-green-500" />Wi-Fi Proximity</p></div>
            {leaderboard.filter(s => s.jobRole !== "owner").slice(0, 8).map((s, i) => (
              <div key={i} className="flex items-center justify-between p-2 border-b border-zinc-800 last:border-0">
                <div className="flex items-center gap-1.5">
                  <Wifi size={10} className="text-green-500" />
                  <span className="text-white text-xs">{staffDisplayName(s)}</span>
                </div>
                <span className="text-green-500 text-[9px]">On floor</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ─── PROFILE ──────────────────────────────────────────────────────
  const ProfileScreen = () => (
    <div className="h-screen bg-black flex flex-col overflow-y-auto pb-20">
      <ScreenHeader title="PROFILE" subtitle={staffUser ? staffDisplayName(staffUser) : ""} />
      <div className="p-4 space-y-3">
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-2">
            <span className="text-amber-500 text-xl font-bold">{staffUser?.firstName?.charAt(0)}</span>
          </div>
          <p className="text-white font-bold">{staffUser ? staffDisplayName(staffUser) : ""}</p>
          <p className="text-zinc-400 text-sm">{staffUser ? roleLabel(staffUser.jobRole) : ""}</p>
          {staffUser?.isKeyEmployee && <span className="text-amber-500 text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 inline-block mt-1">KEY EMPLOYEE</span>}
          <div className="flex items-center justify-center gap-4 mt-3">
            <div><p className="text-amber-500 font-bold text-lg">{staffUser?.totalPoints?.toLocaleString()}</p><p className="text-zinc-500 text-[9px]">Score</p></div>
            <div className="w-px h-6 bg-zinc-800" />
            <div><p className="text-white font-bold text-lg">{staffUser?.currentStreak}</p><p className="text-zinc-500 text-[9px]">Streak</p></div>
            <div className="w-px h-6 bg-zinc-800" />
            <div><p className="text-white font-bold text-lg">{staffUser?.schedulePriority}</p><p className="text-zinc-500 text-[9px]">Priority</p></div>
          </div>
        </div>
        <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
          <p className="text-zinc-400 text-[10px] uppercase mb-2">Details</p>
          <div className="space-y-1">
            <p className="text-zinc-300 text-xs">Department: <span className="text-white capitalize">{staffUser?.department}</span></p>
            <p className="text-zinc-300 text-xs">Role: <span className="text-white">{staffUser ? roleLabel(staffUser.jobRole) : ""}</span></p>
            <p className="text-zinc-300 text-xs">Employee #: <span className="text-white">{staffUser?.employeeNumber || "—"}</span></p>
          </div>
        </div>
        {/* Self-only activity — staff sees their own voids/payouts */}
        {!isManager && (
          <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
            <p className="text-zinc-400 text-[10px] uppercase mb-2">Your Activity</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-800 rounded-lg p-2.5 text-center">
                <p className="text-white font-bold text-lg">{myVoids.length}</p>
                <p className="text-zinc-500 text-[9px]">Your Voids</p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-2.5 text-center">
                <p className="text-white font-bold text-lg">{myPayouts.length}</p>
                <p className="text-zinc-500 text-[9px]">Your Payouts</p>
              </div>
            </div>
            {myVoids.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-zinc-400 text-[9px] uppercase">Recent Voids</p>
                {myVoids.slice(0, 3).map((v: any) => (
                  <div key={v.id} className="bg-zinc-800/50 rounded-lg p-2 flex items-center justify-between">
                    <span className="text-zinc-300 text-xs">{v.type} · {v.reason}</span>
                    <span className="text-red-400 text-xs font-medium">${v.amount}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {!isAuthenticated && (
          <div className="bg-amber-500/10 rounded-xl p-3 border border-amber-500/30">
            <p className="text-amber-500 text-xs">Sign in with Manus to unlock feedback, issue reporting, and other write features.</p>
            <a href={getLoginUrl()} className="text-amber-500 text-xs underline mt-1 block">Sign In</a>
          </div>
        )}
        <button onClick={() => { staffLogout.mutate(); setStaffUser(null); setScreen("login"); setPin(""); setSelectedDept(null); setChecklistProgress({}); }} className="w-full py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-red-400 font-bold text-sm flex items-center justify-center gap-2">
          <LogOut size={14} /> End Shift & Log Out
        </button>
      </div>
    </div>
  );

  // ─── Access Denied Screen ──────────────────────────────────────────
  function AccessDenied() {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <Lock size={24} className="text-red-400" />
          </div>
          <h2 className="text-lg font-black text-white mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>MANAGER ACCESS ONLY</h2>
          <p className="text-zinc-400 text-sm mb-4">This section requires manager or owner credentials.</p>
          <button onClick={() => setScreen("home")} className="px-6 py-2.5 rounded-xl bg-amber-500 text-black font-bold text-sm">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ─── Shared Header ──────────────────────────────────────────────────────
  function ScreenHeader({ title, subtitle }: { title: string; subtitle: string }) {
    return (
      <div className="p-3 border-b border-zinc-900 flex items-center gap-2">
        <button onClick={() => setScreen("home")} className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center"><ChevronLeft size={14} className="text-zinc-400" /></button>
        <div>
          <h2 className="text-white font-black text-sm" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.04em" }}>{title}</h2>
          <p className="text-zinc-500 text-[9px]">{subtitle}</p>
        </div>
      </div>
    );
  }

  // ─── Bottom Nav — 4 items max ──────────────────────────────────────────
  const showNav = !["splash", "login", "welcome", "briefing"].includes(screen);
  const BottomNav = () => {
    if (!showNav) return null;
    const items = [
      { icon: Home, label: "Home", s: "home" as Screen },
      { icon: ClipboardCheck, label: "Tasks", s: "checklist" as Screen },
      { icon: Trophy, label: "Board", s: "leaderboard" as Screen },
      { icon: UserCircle, label: "Profile", s: "profile" as Screen },
    ];
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-900 px-1 py-1.5 flex items-center justify-around z-50">
        {items.map((nav, i) => (
          <button key={i} onClick={() => navigateTo(nav.s)} className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg ${screen === nav.s ? 'text-amber-500' : 'text-zinc-500'}`}>
            <nav.icon size={18} />
            <span className="text-[9px]">{nav.label}</span>
          </button>
        ))}
      </div>
    );
  };

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <>
      <div className="h-screen bg-black overflow-hidden">
        {screen === "splash" && <SplashScreen />}
        {screen === "login" && <LoginScreen />}
        {screen === "welcome" && <WelcomeScreen />}
        {screen === "briefing" && <BriefingScreen />}
        {screen === "home" && <HomeScreen />}
        {screen === "checklist" && <ChecklistScreen />}
        {screen === "driver-eod" && <DriverEODScreen />}
        {screen === "voids" && <VoidScreen />}
        {screen === "feedback" && <FeedbackScreen />}
        {screen === "leaderboard" && <LeaderboardScreen />}
        {screen === "issues" && <IssuesScreen />}
        {screen === "command" && <CommandScreen />}
        {screen === "profile" && <ProfileScreen />}
        {screen === "store-run" && <StoreRunScreen />}
        {screen === "invoices" && <InvoiceScreen />}
        {screen === "ask-brain" && staffUser && <AskBrainScreen staffUser={staffUser} station={selectedDept === "bar" ? "bar" : selectedDept === "kitchen" ? "pizza_line" : "general"} onBack={() => navigateTo("home")} />}
        {screen === "photo-missions" && staffUser && <PhotoMissionsScreen staffUser={staffUser} onBack={() => navigateTo("home")} />}
        {screen === "achievements" && staffUser && <AchievementsScreen staffUser={staffUser} onBack={() => navigateTo("home")} />}
        {screen === "rewards-shop" && staffUser && <RewardsShopScreen staffUser={staffUser} onBack={() => navigateTo("home")} />}
        {screen === "order-guide" && staffUser && <OrderGuideScreen staffUser={staffUser} onBack={() => navigateTo("home")} />}
        {screen === "shift-handoff" && staffUser && <ShiftHandoffScreen staffUser={staffUser} onBack={() => navigateTo("home")} />}
      </div>
      <BottomNav />
    </>
  );
}
