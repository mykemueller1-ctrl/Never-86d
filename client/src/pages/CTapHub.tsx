/**
 * CTAP People Platform — "Night Shift" Design System
 * Community Tap & Pizza · Fort Dodge, Iowa · Powered by Never 86'd
 *
 * Design Philosophy: Steve Jobs discipline.
 * One accent color. Generous whitespace. Every pixel earns its place.
 * Typography hierarchy: Display → Heading → Body → Caption → Micro.
 * Surfaces over borders. Motion with purpose.
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
  Brain, Gift, ShoppingCart, GraduationCap, Shield, Calendar
} from "lucide-react";
import { AskBrainScreen, PhotoMissionsScreen, AchievementsScreen, RewardsShopScreen } from "./IntelligenceScreens";
import OrderGuideScreen from "./OrderGuideScreen";
import ShiftHandoffScreen from "./ShiftHandoffScreen";
import WorkerProfileScreen from "./WorkerProfileScreen";
import SalesIntelligenceScreen from "./SalesIntelligenceScreen";
import POSTrainingScreen from "./POSTrainingScreen";
import ManagementBriefingScreen from "./ManagementBriefingScreen";
import ForecastScreen from "./ForecastScreen";
import RecipeCostScreen from "./RecipeCostScreen";
import SKUTrackerScreen from "./SKUTrackerScreen";
import StationBroadcastScreen from "./StationBroadcastScreen";
import WasteLogScreen from "./WasteLogScreen";
import ComplianceIntelScreen from "./ComplianceIntelScreen";
import ScheduleScreen from "./ScheduleScreen";
import ClockWidget from "./ClockWidget";

// ─── Types ──────────────────────────────────────────────────────
type Screen =
  | "splash" | "login" | "welcome" | "briefing"
  | "home" | "checklist" | "issues"
  | "voids" | "feedback" | "driver-eod"
  | "command" | "leaderboard" | "profile"
  | "store-run" | "invoices"
  | "ask-brain" | "photo-missions" | "achievements" | "rewards-shop"
  | "order-guide" | "shift-handoff"
  | "worker-profile" | "sales-intel" | "pos-training" | "management-briefing"
  | "forecast" | "recipe-cost" | "sku-tracker" | "station-broadcast" | "waste-log" | "compliance-intel"
  | "schedule";

type Department = "bar" | "dining_room" | "kitchen_line" | "pizza_side" | "driver" | "dishwasher" | "management";

const DEPT_CONFIG: Record<Department, { label: string; desc: string; icon: any }> = {
  management: { label: "Management", desc: "Full access", icon: ShieldAlert },
  bar: { label: "Bar", desc: "Bar ops & closing", icon: Coffee },
  kitchen_line: { label: "Kitchen Line", desc: "Fry & grill", icon: Flame },
  pizza_side: { label: "Pizza Side", desc: "Pizza & phones", icon: Target },
  dining_room: { label: "Dining Room", desc: "FOH & tables", icon: Users },
  driver: { label: "Driver", desc: "Deliveries & EOD", icon: Truck },
  dishwasher: { label: "Dishwasher", desc: "Dish pit & bus", icon: Zap },
};

const MANAGER_ROLES = ["owner", "key_manager", "kitchen_manager", "bar_manager"];

function staffDisplayName(s: SafeStaff): string {
  return s.lastName ? `${s.firstName} ${s.lastName}` : s.firstName;
}

function roleLabel(jobRole: string): string {
  const labels: Record<string, string> = {
    owner: "Owner", key_manager: "Key Manager", kitchen_manager: "Kitchen Manager",
    kitchen_key: "Kitchen Key", bartender: "Bartender", bar_manager: "Bar Manager",
    server: "Server", wait_staff: "Wait Staff", driver: "Driver", line_cook: "Line Cook",
    pizza: "Pizza", dishwasher: "Dishwasher",
  };
  return labels[jobRole] || jobRole;
}

function isManagerOrOwner(s: SafeStaff | null): boolean {
  if (!s) return false;
  return MANAGER_ROLES.includes(s.jobRole);
}

function salesVibe(amount: number | null | undefined): { label: string; color: string } {
  if (!amount || amount === 0) return { label: "No data yet", color: "text-zinc-500" };
  if (amount >= 5000) return { label: "Legendary Night", color: "text-amber-400" };
  if (amount >= 3500) return { label: "Great Night", color: "text-amber-400" };
  if (amount >= 2000) return { label: "Solid Night", color: "text-zinc-300" };
  return { label: "Steady Night", color: "text-zinc-400" };
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

  const { user: authUser, isAuthenticated } = useAuth();

  // ─── tRPC Queries ──────────────────────────────────────────────
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
    enabled: isManager && ["voids", "command", "store-run", "schedule"].includes(screen)
  });
  const myVoidsQuery = trpc.voids.myVoids.useQuery(
    undefined,
    { enabled: !isManager && !!staffUser && ["profile", "home"].includes(screen) }
  );
  const myPayoutsQuery = trpc.payouts.myPayouts.useQuery(
    undefined,
    { enabled: !isManager && !!staffUser && ["profile", "home"].includes(screen) }
  );

  // ─── tRPC Mutations ──────────────────────────────────────────────
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

  // ─── Derived data ──────────────────────────────────────────────
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

  useEffect(() => {
    if (screen === "splash") {
      const t = setTimeout(() => setScreen("login"), 2800);
      return () => clearTimeout(t);
    }
  }, [screen]);

  const navigateTo = (target: Screen) => {
    const managerOnlyScreens: Screen[] = ["command", "store-run", "invoices", "voids", "order-guide", "sales-intel", "management-briefing", "forecast", "recipe-cost", "sku-tracker", "compliance-intel"];
    if (managerOnlyScreens.includes(target) && !isManager) {
      toast.error("Manager access required");
      return;
    }
    setScreen(target);
  };

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

  // ════════════════════════════════════════════════════════════════
  // ─── SPLASH — The first thing anyone sees. Make it count. ──────
  // ════════════════════════════════════════════════════════════════
  const SplashScreen = () => (
    <div className="h-screen bg-black flex flex-col items-center justify-center screen-enter">
      <div className="text-center">
        {/* Logo mark — simple, confident */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500 flex items-center justify-center mx-auto mb-8 glow-amber"
          style={{ animation: "screenFadeIn 800ms ease-out" }}>
          <span className="text-2xl font-black text-black tracking-tight" style={{ fontFamily: "'Inter', sans-serif" }}>CT</span>
        </div>

        <h1 className="type-display text-white mb-1">
          COMMUNITY TAP
        </h1>
        <p className="type-display text-amber-500 text-xl">& PIZZA</p>

        <div className="w-8 h-px bg-zinc-700 mx-auto mt-6 mb-6" />

        <p className="type-micro text-zinc-600">Fort Dodge, Iowa</p>
        <p className="text-zinc-800 text-[10px] mt-6 tracking-wider">Powered by Never 86'd</p>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════
  // ─── LOGIN — Clean, spacious, intentional ──────────────────────
  // ════════════════════════════════════════════════════════════════
  const LoginScreen = () => (
    <div className="h-screen bg-black flex flex-col overflow-y-auto screen-enter">
      <div className="flex-1 flex flex-col items-center justify-start px-6 pt-16 pb-8">
        <div className="w-full max-w-sm">
          <h2 className="type-display text-white mb-2">START YOUR SHIFT</h2>
          <p className="type-body text-zinc-500 mb-10">Select your department, then tap your name.</p>

          {!selectedDept ? (
            <div className="space-y-3">
              {(Object.keys(DEPT_CONFIG) as Department[]).map((dept) => {
                const cfg = DEPT_CONFIG[dept];
                const Icon = cfg.icon;
                return (
                  <button key={dept} onClick={() => setSelectedDept(dept)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl surface-interactive group">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/15 transition-colors">
                      <Icon size={18} className="text-amber-500" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-white font-semibold type-body">{cfg.label}</p>
                      <p className="text-zinc-500 type-caption">{cfg.desc}</p>
                    </div>
                    <ChevronRight size={16} className="text-zinc-600 group-hover:text-amber-500 transition-colors" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="screen-slide-in">
              <button onClick={() => { setSelectedDept(null); setPin(""); }}
                className="text-amber-500 type-caption mb-6 flex items-center gap-1 hover:text-amber-400 transition-colors">
                <ChevronLeft size={16} /> All departments
              </button>

              {staffByDept.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="text-amber-500 animate-spin" />
                </div>
              ) : (
                <div className="space-y-2 mb-8 max-h-[240px] overflow-y-auto">
                  {deptStaff.filter(s => s.status === "active").map(s => (
                    <button key={s.id} onClick={() => { setStaffUser(s as SafeStaff); setScreen("welcome"); }}
                      className="w-full flex items-center gap-4 p-3.5 rounded-xl surface-interactive group">
                      <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <span className="text-amber-500 type-caption font-semibold">{s.firstName.charAt(0)}</span>
                      </div>
                      <div className="flex-1 text-left">
                        <span className="text-white type-body font-medium">{staffDisplayName(s as SafeStaff)}</span>
                        <span className="text-zinc-600 type-caption ml-2">{roleLabel(s.jobRole)}</span>
                      </div>
                      {s.isKeyEmployee && (
                        <span className="text-amber-500 type-micro px-2 py-0.5 rounded-full bg-amber-500/10">KEY</span>
                      )}
                    </button>
                  ))}
                  {deptStaff.filter(s => s.status === "active").length === 0 && (
                    <p className="text-zinc-500 type-body text-center py-8">No active staff in this department</p>
                  )}
                </div>
              )}

              {/* PIN Entry — elegant, minimal */}
              <div className="surface-base p-5">
                <p className="type-micro text-zinc-500 mb-4">Or enter PIN</p>
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex gap-2.5 flex-1 justify-center">
                    {[0,1,2,3].map(i => (
                      <div key={i} className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-semibold transition-all duration-200 ${
                        pin.length > i
                          ? 'bg-amber-500/15 text-amber-500 ring-1 ring-amber-500/40'
                          : 'bg-zinc-800/50 text-zinc-700'
                      }`}>
                        {pin.length > i ? (showPin ? pin[i] : "\u2022") : ""}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setShowPin(!showPin)} className="text-zinc-600 p-2 hover:text-zinc-400 transition-colors">
                    {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[1,2,3,4,5,6,7,8,9,null,0,"\u232b"].map((n, i) => (
                    <button key={i} onClick={() => {
                      if (n === "\u232b") setPin(p => p.slice(0, -1));
                      else if (n !== null && pin.length < 4) {
                        const newPin = pin + n;
                        setPin(newPin);
                        if (newPin.length === 4) handlePinLogin(newPin);
                      }
                    }} className={`h-12 rounded-xl font-semibold text-base transition-all duration-150 ${
                      n === null ? 'invisible' : 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60 active:bg-amber-500 active:text-black active:scale-95'
                    }`}>
                      {n}
                    </button>
                  ))}
                </div>
                {loginByPin.isPending && (
                  <div className="flex items-center justify-center mt-4">
                    <Loader2 size={16} className="text-amber-500 animate-spin" />
                    <span className="text-zinc-500 type-caption ml-2">Verifying...</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════
  // ─── WELCOME — Hero moment. Confident. Brief. ──────────────────
  // ════════════════════════════════════════════════════════════════
  const WelcomeScreen = () => {
    const rank = leaderboard.findIndex(s => s.id === staffUser?.id) + 1;
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center px-8 screen-enter">
        <div className="text-center max-w-xs">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-8">
            <span className="text-amber-500 text-2xl font-bold">{staffUser?.firstName?.charAt(0)}</span>
          </div>

          <h1 className="type-display text-white mb-3">
            HEY {staffUser?.firstName?.toUpperCase()}
          </h1>
          <p className="type-body text-zinc-400 mb-2">
            Let's have a great shift.
          </p>

          {/* Stats — clean, horizontal */}
          <div className="flex items-center justify-center gap-6 mt-8 mb-10">
            <div className="text-center">
              <p className="text-amber-500 font-semibold text-lg font-data">{staffUser?.totalPoints?.toLocaleString()}</p>
              <p className="type-micro text-zinc-600 mt-0.5">Score</p>
            </div>
            <div className="w-px h-8 bg-zinc-800" />
            <div className="text-center">
              <p className="text-white font-semibold text-lg font-data">{staffUser?.currentStreak}<span className="text-zinc-600 text-sm">d</span></p>
              <p className="type-micro text-zinc-600 mt-0.5">Streak</p>
            </div>
            {rank > 0 && (
              <>
                <div className="w-px h-8 bg-zinc-800" />
                <div className="text-center">
                  <p className="text-white font-semibold text-lg font-data">#{rank}</p>
                  <p className="type-micro text-zinc-600 mt-0.5">Rank</p>
                </div>
              </>
            )}
          </div>

          <button onClick={() => setScreen("briefing")}
            className="w-full py-3.5 rounded-xl bg-amber-500 text-black font-semibold type-body glow-amber transition-all hover:bg-amber-400 active:scale-[0.98]">
            See Today's Briefing <ArrowRight size={15} className="inline ml-1.5 -mt-0.5" />
          </button>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════
  // ─── BRIEFING — Editorial layout, not a data dump ──────────────
  // ════════════════════════════════════════════════════════════════
  const BriefingScreen = () => {
    const eightySixed: string[] = briefing?.eightySixedItems ? (briefing.eightySixedItems as string[]) : [];
    const specials: { name: string; description: string }[] = briefing?.specials ? (briefing.specials as any[]) : [];
    const openIssuesBriefing: { description: string; priority: string }[] = briefing?.openIssues ? (briefing.openIssues as any[]) : [];
    const shoutouts: { staffName: string; reason: string }[] = briefing?.shoutouts ? (briefing.shoutouts as any[]) : [];
    const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const vibe = salesVibe(briefing?.salesYesterday ? Number(briefing.salesYesterday) : null);

    return (
      <div className="h-screen bg-black flex flex-col overflow-y-auto pb-8 screen-enter">
        <div className="px-6 pt-12">
          <p className="type-micro text-zinc-600 mb-2">{today}</p>
          <h2 className="type-display text-white mb-8">TODAY'S BRIEFING</h2>

          {briefingQuery.isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="text-amber-500 animate-spin" />
            </div>
          ) : briefing ? (
            <div className="space-y-4">
              {/* Yesterday recap */}
              <div className="surface-base p-5">
                <p className="type-micro text-zinc-500 mb-3">Yesterday</p>
                {isManager ? (
                  <div className="flex gap-8">
                    <div>
                      <p className="text-2xl font-semibold text-white font-data">${briefing.salesYesterday || "—"}</p>
                      <p className="type-caption text-zinc-500 mt-0.5">sales</p>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-white font-data">{briefing.ordersYesterday || "—"}</p>
                      <p className="type-caption text-zinc-500 mt-0.5">orders</p>
                    </div>
                  </div>
                ) : (
                  <p className={`type-heading ${vibe.color}`}>{vibe.label}</p>
                )}
                {shoutouts.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <p className="type-caption text-amber-500 flex items-center gap-1.5">
                      <Trophy size={13} />{shoutouts[0].staffName} — {shoutouts[0].reason}
                    </p>
                  </div>
                )}
              </div>

              {/* 86'd */}
              {eightySixed.length > 0 && (
                <div className="bg-red-950/20 rounded-xl p-5">
                  <p className="type-micro text-red-400 mb-3 flex items-center gap-1.5">
                    <AlertTriangle size={12} />86'd TODAY
                  </p>
                  {eightySixed.map((item, i) => (
                    <p key={i} className="text-white type-body">{item}</p>
                  ))}
                </div>
              )}

              {/* Specials */}
              {specials.length > 0 && (
                <div className="surface-base p-5">
                  <p className="type-micro text-zinc-500 mb-3">Specials</p>
                  {specials.map((s, i) => (
                    <p key={i} className="type-body text-zinc-300"><span className="text-white font-medium">{s.name}</span> — {s.description}</p>
                  ))}
                </div>
              )}

              {/* Open Issues */}
              {openIssuesBriefing.length > 0 && (
                <div className="surface-base p-5">
                  <p className="type-micro text-zinc-500 mb-3">Open Issues</p>
                  {openIssuesBriefing.map((issue, i) => (
                    <div key={i} className="flex items-start gap-3 mb-2 last:mb-0">
                      <div className="w-1.5 h-1.5 rounded-full mt-2 bg-amber-500 shrink-0" />
                      <p className="type-body text-zinc-300">{issue.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="surface-base p-8 text-center">
              <p className="type-body text-zinc-500">No briefing posted yet today.</p>
            </div>
          )}

          <button onClick={() => setScreen("home")}
            className="w-full py-3.5 rounded-xl bg-amber-500 text-black font-semibold type-body mt-8 glow-amber transition-all hover:bg-amber-400 active:scale-[0.98]">
            Let's Go <ArrowRight size={15} className="inline ml-1.5 -mt-0.5" />
          </button>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════
  // ─── HOME — Simplified. Breathable. Role-aware. ────────────────
  // ════════════════════════════════════════════════════════════════
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
      <div className="h-screen bg-black flex flex-col overflow-y-auto pb-24 screen-enter">
        {/* Header — minimal, confident */}
        <div className="px-6 pt-8 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="type-caption text-zinc-500">{greeting}</p>
              <h1 className="type-display text-white">{staffUser.firstName}</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/8 border border-amber-500/15">
                <Trophy size={12} className="text-amber-500" />
                <span className="text-amber-500 type-caption font-semibold font-data">{staffUser.totalPoints?.toLocaleString()}</span>
              </div>
              {staffUser.currentStreak > 0 && (
                <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-amber-500/5">
                  <Flame size={11} className="text-amber-600" />
                  <span className="text-amber-600 type-caption font-semibold font-data">{staffUser.currentStreak}d</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 space-y-4 mt-4">
          {/* Clock In/Out Widget */}
          <ClockWidget staffId={staffUser.id} staffName={staffUser.firstName} />

          {/* 86'd Alert */}
          {briefing && (briefing.eightySixedItems as string[])?.length > 0 && (
            <div className="bg-red-950/20 rounded-xl p-4">
              <p className="type-micro text-red-400 mb-2 flex items-center gap-1.5"><AlertTriangle size={11} />86'd RIGHT NOW</p>
              <p className="text-white type-body font-medium">{(briefing.eightySixedItems as string[]).join(" · ")}</p>
            </div>
          )}

          {/* Checklists — primary action */}
          {myChecklists.length > 0 && (
            <button onClick={() => navigateTo("checklist")}
              className="w-full surface-interactive p-5 text-left">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <ClipboardCheck size={18} className="text-amber-500" />
                  <span className="text-white font-semibold type-body">Your Checklists</span>
                </div>
                <ChevronRight size={16} className="text-zinc-600" />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0}%` }} />
                </div>
                <span className="text-zinc-500 type-caption font-data">{doneTasks}/{totalTasks}</span>
              </div>
            </button>
          )}

          {/* Driver EOD */}
          {isDriver && (
            <button onClick={() => navigateTo("driver-eod")}
              className="w-full surface-interactive p-5 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Truck size={18} className="text-amber-500" />
                  <div>
                    <span className="text-white font-semibold type-body">End of Day Report</span>
                    <p className="type-caption text-zinc-500">Required before clocking out</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-zinc-600" />
              </div>
            </button>
          )}

          {/* Command Center — managers only */}
          {isManager && (
            <button onClick={() => navigateTo("command")}
              className="w-full bg-amber-500/5 rounded-xl p-5 border border-amber-500/10 hover:border-amber-500/20 transition-all text-left active:scale-[0.98]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BarChart3 size={18} className="text-amber-500" />
                  <div>
                    <span className="text-white font-semibold type-body">Command Center</span>
                    <p className="type-caption text-zinc-500">Operations & intelligence</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-amber-500" />
              </div>
            </button>
          )}

          {/* Quick Actions — clean 2-column grid, amber-only accents */}
          <div>
            <p className="type-micro text-zinc-600 mb-3">Quick Actions</p>
            <div className="grid grid-cols-2 gap-2.5">
              {isManager && (
                <>
                  <QuickAction icon={Receipt} label="Store Runs" onClick={() => navigateTo("store-run")} />
                  <QuickAction icon={Package} label="Invoices" onClick={() => navigateTo("invoices")} />
                  <QuickAction icon={ShoppingCart} label="Order Guide" onClick={() => navigateTo("order-guide")} />
                  <QuickAction icon={BarChart3} label="Sales Intel" onClick={() => navigateTo("sales-intel")} />
                  <QuickAction icon={Brain} label="Intel Briefings" onClick={() => navigateTo("management-briefing")} />
                  <QuickAction icon={TrendingUp} label="Forecast" onClick={() => navigateTo("forecast")} />
                  <QuickAction icon={Flame} label="Recipes & Cost" onClick={() => navigateTo("recipe-cost")} />
                  <QuickAction icon={Package} label="SKU Tracker" onClick={() => navigateTo("sku-tracker")} />
                  <QuickAction icon={Shield} label="Compliance" onClick={() => navigateTo("compliance-intel")} />
                </>
              )}
              <QuickAction icon={Calendar} label="Schedule" onClick={() => navigateTo("schedule")} />
              <QuickAction icon={UserCircle} label="My Profile" onClick={() => navigateTo("worker-profile")} />
              <QuickAction icon={ArrowRight} label="Shift Handoff" onClick={() => navigateTo("shift-handoff")} />
              <QuickAction icon={AlertTriangle} label="Report Issue" onClick={() => navigateTo("issues")} />
              <QuickAction icon={Send} label="Feedback" onClick={() => navigateTo("feedback")} subtitle="+5 pts" />
              <QuickAction icon={GraduationCap} label="POS Training" onClick={() => navigateTo("pos-training")} />
              <QuickAction icon={Zap} label="86'd Alerts" onClick={() => navigateTo("station-broadcast")} />
              <QuickAction icon={Target} label="Waste Log" onClick={() => navigateTo("waste-log")} />
            </div>
          </div>

          {/* Intelligence Row — unified amber accent */}
          <div>
            <p className="type-micro text-zinc-600 mb-3">Intelligence</p>
            <div className="grid grid-cols-4 gap-2.5">
              {[
                { icon: Brain, label: "Ask Brain", s: "ask-brain" as Screen },
                { icon: Camera, label: "Missions", s: "photo-missions" as Screen },
                { icon: Trophy, label: "Badges", s: "achievements" as Screen },
                { icon: Gift, label: "Rewards", s: "rewards-shop" as Screen },
              ].map(item => (
                <button key={item.s} onClick={() => navigateTo(item.s)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl surface-interactive">
                  <item.icon size={20} className="text-amber-500" />
                  <span className="type-micro text-zinc-400 normal-case">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Leaderboard Preview */}
          {leaderboard.length > 0 && (
            <button onClick={() => navigateTo("leaderboard")}
              className="w-full surface-interactive p-5 text-left">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Trophy size={16} className="text-amber-500" />
                  <span className="text-white font-semibold type-body">Leaderboard</span>
                </div>
                <span className="type-caption text-zinc-500 font-data">#{rank || "—"} of {leaderboard.length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {leaderboard.slice(0, 5).map((s) => (
                  <div key={s.id} className={`w-8 h-8 rounded-full flex items-center justify-center type-caption font-semibold transition-all ${
                    s.id === staffUser.id ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    {s.firstName.charAt(0)}
                  </div>
                ))}
                {leaderboard.length > 5 && <span className="type-caption text-zinc-600 ml-1">+{leaderboard.length - 5}</span>}
              </div>
            </button>
          )}

          {/* Open Issues */}
          {openIssues.length > 0 && (
            <div className="surface-base p-5">
              <p className="type-micro text-zinc-500 mb-3">{openIssues.length} Open Issue{openIssues.length > 1 ? "s" : ""}</p>
              {openIssues.slice(0, 2).map(issue => (
                <div key={issue.id} className="flex items-center gap-3 mb-2 last:mb-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${issue.priority === 'critical' ? 'bg-red-500' : issue.priority === 'high' ? 'bg-amber-500' : 'bg-zinc-600'}`} />
                  <span className="text-zinc-300 type-caption">{issue.title}</span>
                </div>
              ))}
              {openIssues.length > 2 && (
                <button onClick={() => navigateTo("issues")} className="text-amber-500 type-caption mt-2 hover:text-amber-400 transition-colors">View all</button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Quick Action — unified, amber-only
  function QuickAction({ icon: Icon, label, onClick, subtitle }: { icon: any; label: string; onClick: () => void; subtitle?: string }) {
    return (
      <button onClick={onClick} className="flex items-center gap-3 p-3.5 rounded-xl surface-interactive">
        <div className="w-9 h-9 rounded-lg bg-amber-500/8 flex items-center justify-center shrink-0">
          <Icon size={16} className="text-amber-500" />
        </div>
        <div className="text-left">
          <span className="text-zinc-200 type-caption font-medium">{label}</span>
          {subtitle && <p className="text-zinc-600 text-[10px]">{subtitle}</p>}
        </div>
      </button>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // ─── SHARED: Screen Header ─────────────────────────────────────
  // ════════════════════════════════════════════════════════════════
  function ScreenHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack?: () => void }) {
    return (
      <div className="px-6 pt-10 pb-4">
        {onBack && (
          <button onClick={onBack} className="text-amber-500 type-caption mb-3 flex items-center gap-1 hover:text-amber-400 transition-colors">
            <ChevronLeft size={16} /> Back
          </button>
        )}
        <h2 className="type-display text-white">{title}</h2>
        {subtitle && <p className="type-caption text-zinc-500 mt-1">{subtitle}</p>}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // ─── ACCESS DENIED ─────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════
  const AccessDenied = () => (
    <div className="h-screen bg-black flex flex-col items-center justify-center px-8 screen-enter">
      <Lock size={32} className="text-zinc-700 mb-4" />
      <p className="type-heading text-zinc-400 mb-2">Manager Access Required</p>
      <p className="type-body text-zinc-600 mb-6">This section requires manager or owner permissions.</p>
      <button onClick={() => setScreen("home")} className="px-6 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 type-caption font-semibold hover:bg-zinc-700 transition-colors">
        Back to Home
      </button>
    </div>
  );

  // ════════════════════════════════════════════════════════════════
  // ─── CHECKLIST ─────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════
  const ChecklistScreen = () => (
    <div className="h-screen bg-black flex flex-col overflow-y-auto pb-24 screen-enter">
      <ScreenHeader title="CHECKLISTS" subtitle={`${staffUser?.department || "your"} department`} />
      <div className="px-6 space-y-4">
        {checklistsQuery.isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 size={20} className="text-amber-500 animate-spin" /></div>
        ) : myChecklists.length === 0 ? (
          <p className="text-zinc-500 type-body text-center py-12">No checklists for your department yet</p>
        ) : (
          myChecklists.map(cl => {
            const items = (cl.items as any[]) || [];
            const doneCount = items.filter((_, i) => checklistProgress[`${cl.id}-${i}`]).length;
            return (
              <div key={cl.id} className="surface-base overflow-hidden">
                <div className="p-5 border-b border-white/5">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-semibold type-body">{cl.name}</p>
                    <span className="type-caption text-zinc-500 font-data">{doneCount}/{items.length}</span>
                  </div>
                  <div className="h-1 bg-zinc-800 rounded-full mt-3 overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${items.length > 0 ? (doneCount / items.length) * 100 : 0}%` }} />
                  </div>
                </div>
                <div className="p-3 space-y-0.5">
                  {items.map((item: any, ii: number) => {
                    const key = `${cl.id}-${ii}`;
                    const done = checklistProgress[key];
                    return (
                      <button key={ii} onClick={() => setChecklistProgress(p => ({ ...p, [key]: !p[key] }))}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${done ? 'bg-amber-500/5' : 'hover:bg-zinc-800/50'}`}>
                        {done
                          ? <CheckCircle2 size={16} className="text-amber-500 shrink-0" />
                          : <Circle size={16} className="text-zinc-700 shrink-0" />
                        }
                        <span className={`type-body text-left ${done ? 'text-zinc-600 line-through' : 'text-zinc-200'}`}>{item.task}</span>
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

  // ─── Shared Photo Upload Handler ──────────────────────────────
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>, context: "payout" | "invoice" | "issue") => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Photo must be under 5MB"); return; }
    const isInvoice = context === "invoice";
    if (isInvoice) setUploadingInvoicePhoto(true); else setUploadingPhoto(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => { resolve((reader.result as string).split(",")[1]); };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { url } = await uploadReceipt.mutateAsync({ base64, filename: file.name, mimeType: file.type || "image/jpeg", context });
      if (isInvoice) {
        setInvoicePhotoUrl(url);
        toast.success("Invoice photo uploaded — analyzing...");
        try {
          const analysis = await analyzePhoto.mutateAsync({ photoUrl: url, photoType: "invoice", staffId: staffUser?.id || 0 });
          if (analysis.extraction) {
            const ext = analysis.extraction;
            if (ext.vendor && !invoiceForm.vendorName) setInvoiceForm(f => ({ ...f, vendorName: ext.vendor, customVendor: !COMMON_VENDORS_SET.has(ext.vendor) }));
            if (ext.total && !invoiceForm.totalAmount) setInvoiceForm(f => ({ ...f, totalAmount: String(ext.total) }));
            if (ext.invoiceNumber && !invoiceForm.invoiceNumber) setInvoiceForm(f => ({ ...f, invoiceNumber: ext.invoiceNumber }));
            if (ext.items && Array.isArray(ext.items)) setInvoiceExtractedItems(ext.items);
            toast.success("AI extracted invoice data — review and submit");
          }
        } catch { toast.info("Photo saved. Fill in details manually."); }
      } else {
        setReceiptPhotoUrl(url);
        toast.success("Receipt uploaded");
      }
    } catch { toast.error("Failed to upload photo"); }
    finally { if (isInvoice) setUploadingInvoicePhoto(false); else setUploadingPhoto(false); }
  };

  // ════════════════════════════════════════════════════════════════
  // ─── STORE RUNS / PAY OUTS ─────────────────────────────────────
  // ════════════════════════════════════════════════════════════════
  const StoreRunScreen = () => {
    if (!isManager) return <AccessDenied />;
    const weeklyTotal = allPayouts.reduce((s, p) => s + parseFloat(p.amount), 0);
    const flaggedCount = allPayouts.filter(p => p.flagged).length;

    const handleSubmitStoreRun = async () => {
      if (!isAuthenticated) { toast.error("Please sign in via Manus to log store runs"); return; }
      if (!staffUser || !storeRunForm.amount || !storeRunForm.description || !storeRunForm.vendor) { toast.error("Fill in all required fields"); return; }
      const authId = storeRunForm.authorizedById || (staffUser.isKeyEmployee ? staffUser.id : 0);
      if (!authId) { toast.error("A key employee must authorize this payout"); return; }
      try {
        await createPayout.mutateAsync({ staffId: staffUser.id, date: new Date(), amount: storeRunForm.amount, description: storeRunForm.description, vendor: storeRunForm.vendor, category: storeRunForm.category as any, authorizedById: authId, receiptPhotoUrl: receiptPhotoUrl || undefined });
        toast.success("Store run logged");
        setStoreRunForm({ description: "", amount: "", vendor: "", category: "food", authorizedById: 0 });
        setReceiptPhotoUrl(null);
      } catch { toast.error("Failed to log — try again"); }
    };

    return (
      <div className="h-screen bg-black flex flex-col overflow-y-auto pb-24 screen-enter">
        <ScreenHeader title="STORE RUNS" subtitle="Receipt capture · Manager approval" />
        <div className="px-6 space-y-4">
          <div className="surface-base p-5 space-y-3">
            <p className="type-micro text-zinc-500">Log New Store Run</p>
            <input value={storeRunForm.description} onChange={e => setStoreRunForm(f => ({ ...f, description: e.target.value }))} placeholder="What was purchased?" className="w-full bg-zinc-800/50 rounded-xl p-3 text-white type-body placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/30" />
            <div className="flex gap-2.5">
              <input value={storeRunForm.amount} onChange={e => setStoreRunForm(f => ({ ...f, amount: e.target.value }))} placeholder="Amount ($)" type="number" step="0.01" className="flex-1 bg-zinc-800/50 rounded-xl p-3 text-white type-body placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/30" />
              <input value={storeRunForm.vendor} onChange={e => setStoreRunForm(f => ({ ...f, vendor: e.target.value }))} placeholder="Where?" className="flex-1 bg-zinc-800/50 rounded-xl p-3 text-white type-body placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/30" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {["food", "supplies", "equipment", "misc"].map(cat => (
                <button key={cat} onClick={() => setStoreRunForm(f => ({ ...f, category: cat }))}
                  className={`px-3 py-1.5 rounded-full type-micro transition-all ${storeRunForm.category === cat ? 'bg-amber-500/15 text-amber-500 ring-1 ring-amber-500/30' : 'bg-zinc-800/50 text-zinc-500'}`}>
                  {cat}
                </button>
              ))}
            </div>
            <div>
              <p className="type-micro text-zinc-500 mb-2">Authorized By</p>
              <select value={storeRunForm.authorizedById} onChange={e => setStoreRunForm(f => ({ ...f, authorizedById: Number(e.target.value) }))}
                className="w-full bg-zinc-800/50 rounded-xl p-3 text-white type-body focus:outline-none focus:ring-1 focus:ring-amber-500/30">
                <option value={0}>{staffUser?.isKeyEmployee ? `${staffDisplayName(staffUser)} (me)` : "Select authorizer..."}</option>
                {keyEmployees.filter(k => k.id !== staffUser?.id).map(k => (
                  <option key={k.id} value={k.id}>{staffDisplayName(k)} ({roleLabel(k.jobRole)})</option>
                ))}
              </select>
            </div>
            <div>
              <p className="type-micro text-zinc-500 mb-2">Receipt Photo</p>
              <label className={`flex items-center justify-center gap-2 py-3 rounded-xl cursor-pointer transition-all ${
                receiptPhotoUrl ? 'bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20' : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
              }`}>
                {uploadingPhoto ? <><Loader2 size={14} className="animate-spin" /><span className="type-caption">Uploading...</span></> :
                 receiptPhotoUrl ? <><CheckCircle2 size={14} /><span className="type-caption">Receipt Attached</span></> :
                 <><Camera size={14} /><span className="type-caption">Snap Receipt</span></>}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handlePhotoCapture(e, "payout")} disabled={uploadingPhoto} />
              </label>
              {receiptPhotoUrl && <button onClick={() => setReceiptPhotoUrl(null)} className="text-zinc-600 type-micro mt-2 hover:text-red-400 transition-colors">Remove photo</button>}
            </div>
            <button onClick={handleSubmitStoreRun} disabled={createPayout.isPending || uploadingPhoto}
              className="w-full py-3 rounded-xl bg-amber-500 text-black font-semibold type-body disabled:opacity-50 glow-amber transition-all active:scale-[0.98]">
              {createPayout.isPending ? "Saving..." : "Log Store Run"}
            </button>
          </div>

          {/* Summary */}
          <div className="surface-base p-5">
            <div className="flex items-center justify-between">
              <p className="type-micro text-zinc-500">This Week</p>
              <p className="text-white font-semibold font-data">${weeklyTotal.toFixed(2)}</p>
            </div>
            {flaggedCount > 0 && <p className="type-caption text-red-400 mt-1">{flaggedCount} flagged</p>}
          </div>

          {/* Recent */}
          {payoutsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 size={20} className="text-amber-500 animate-spin" /></div>
          ) : allPayouts.length > 0 && (
            <div className="space-y-2">
              <p className="type-micro text-zinc-600">Recent</p>
              {allPayouts.map(po => (
                <div key={po.id} className={`surface-base p-4 ${po.flagged ? 'ring-1 ring-red-500/20' : ''}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white type-body font-medium">Staff #{po.staffId}</span>
                    <span className="text-amber-500 font-semibold font-data">${po.amount}</span>
                  </div>
                  <p className="type-caption text-zinc-500">{po.description || "—"} · {po.vendor || "Unknown"}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {po.receiptPhotoUrl ? <span className="type-micro text-amber-500 flex items-center gap-1"><CheckCircle2 size={10} />Receipt</span> : <span className="type-micro text-zinc-600">No receipt</span>}
                    {po.authorizedById ? <span className="type-micro text-amber-500 flex items-center gap-1"><CheckCircle2 size={10} />Authorized</span> : <span className="type-micro text-red-400">Unauthorized</span>}
                  </div>
                  {po.flagged && po.flagReason && <p className="type-caption text-red-400 mt-2 bg-red-500/5 rounded-lg p-2">{po.flagReason}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════
  // ─── INVOICES ──────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════
  const InvoiceScreen = () => {
    if (!isManager) return <AccessDenied />;
    const weeklyTotal = allInvoices.reduce((s, inv) => s + parseFloat(inv.totalAmount), 0);
    const vendorTotals = useMemo(() => {
      const map: Record<string, number> = {};
      allInvoices.forEach(inv => { map[inv.vendorName] = (map[inv.vendorName] || 0) + parseFloat(inv.totalAmount); });
      return Object.entries(map).sort((a, b) => b[1] - a[1]);
    }, [allInvoices]);
    const INVOICE_CATEGORIES = ["meat", "bread", "produce", "liquor", "beer", "supplies", "misc"] as const;
    const COMMON_VENDORS = ["Sawyer's Meats", "Hughes Distributing", "Fort Dodge Distributing", "Confluence Brewing", "Hy-Vee", "Fareway", "Dollar General"];

    const handleSubmitInvoice = async () => {
      if (!isAuthenticated) { toast.error("Please sign in via Manus to log invoices"); return; }
      if (!invoiceForm.vendorName || !invoiceForm.totalAmount) { toast.error("Vendor name and total are required"); return; }
      try {
        await createInvoice.mutateAsync({ vendorName: invoiceForm.vendorName, date: new Date(), totalAmount: invoiceForm.totalAmount, category: invoiceForm.category as any, invoiceNumber: invoiceForm.invoiceNumber || undefined, receiptPhotoUrl: invoicePhotoUrl || undefined, items: invoiceExtractedItems.length > 0 ? invoiceExtractedItems : undefined });
        toast.success("Invoice logged" + (invoiceExtractedItems.length > 0 ? ` — ${invoiceExtractedItems.length} prices updated` : ""));
        setInvoiceForm({ vendorName: "", totalAmount: "", category: "meat", invoiceNumber: "", customVendor: false });
        setInvoicePhotoUrl(null);
        setInvoiceExtractedItems([]);
        invoicesQuery.refetch();
      } catch { toast.error("Failed to log invoice"); }
    };

    return (
      <div className="h-screen bg-black flex flex-col overflow-y-auto pb-24 screen-enter">
        <ScreenHeader title="VENDOR INVOICES" subtitle="Track spend · Flag anomalies" />
        <div className="px-6 space-y-4">
          {/* Weekly Spend */}
          <div className="surface-base p-5">
            <p className="type-micro text-zinc-500 mb-3">This Week's Spend</p>
            <p className="text-2xl font-semibold text-white font-data">${weeklyTotal.toFixed(2)}</p>
            {vendorTotals.length > 0 && (
              <div className="mt-4 space-y-2">
                {vendorTotals.map(([vendor, total]) => (
                  <div key={vendor} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="type-caption text-zinc-400 flex-1">{vendor}</span>
                    <span className="type-caption text-white font-data">${total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* New Invoice Form */}
          <div className="surface-base p-5 space-y-3">
            <p className="type-micro text-zinc-500">Log New Invoice</p>
            <div>
              <p className="type-micro text-zinc-600 mb-1.5">Vendor</p>
              {!invoiceForm.customVendor ? (
                <select value={invoiceForm.vendorName} onChange={e => {
                  if (e.target.value === "__custom") setInvoiceForm(f => ({ ...f, vendorName: "", customVendor: true }));
                  else setInvoiceForm(f => ({ ...f, vendorName: e.target.value }));
                }} className="w-full bg-zinc-800/50 rounded-xl p-3 text-white type-body focus:outline-none focus:ring-1 focus:ring-amber-500/30">
                  <option value="">Select vendor...</option>
                  {COMMON_VENDORS.map(v => <option key={v} value={v}>{v}</option>)}
                  <option value="__custom">Other (type below)</option>
                </select>
              ) : (
                <div className="flex gap-2">
                  <input value={invoiceForm.vendorName} onChange={e => setInvoiceForm(f => ({ ...f, vendorName: e.target.value }))} placeholder="Enter vendor name" autoFocus className="flex-1 bg-zinc-800/50 rounded-xl p-3 text-white type-body placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/30" />
                  <button onClick={() => setInvoiceForm(f => ({ ...f, vendorName: "", customVendor: false }))} className="text-zinc-500 type-caption px-3 rounded-xl bg-zinc-800/50 hover:text-zinc-300 transition-colors">Back</button>
                </div>
              )}
            </div>
            <div className="flex gap-2.5">
              <input value={invoiceForm.totalAmount} onChange={e => setInvoiceForm(f => ({ ...f, totalAmount: e.target.value }))} placeholder="Total ($)" type="number" step="0.01" className="flex-1 bg-zinc-800/50 rounded-xl p-3 text-white type-body placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/30" />
              <input value={invoiceForm.invoiceNumber} onChange={e => setInvoiceForm(f => ({ ...f, invoiceNumber: e.target.value }))} placeholder="Invoice #" className="flex-1 bg-zinc-800/50 rounded-xl p-3 text-white type-body placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/30" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {INVOICE_CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setInvoiceForm(f => ({ ...f, category: cat }))}
                  className={`px-3 py-1.5 rounded-full type-micro transition-all ${invoiceForm.category === cat ? 'bg-amber-500/15 text-amber-500 ring-1 ring-amber-500/30' : 'bg-zinc-800/50 text-zinc-500'}`}>
                  {cat}
                </button>
              ))}
            </div>
            <div>
              <p className="type-micro text-zinc-600 mb-1.5">Invoice Photo</p>
              <label className={`flex items-center justify-center gap-2 py-3 rounded-xl cursor-pointer transition-all ${
                invoicePhotoUrl ? 'bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20' : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
              }`}>
                {uploadingInvoicePhoto ? <><Loader2 size={14} className="animate-spin" /><span className="type-caption">Uploading...</span></> :
                 invoicePhotoUrl ? <><CheckCircle2 size={14} /><span className="type-caption">Invoice Attached</span></> :
                 <><Camera size={14} /><span className="type-caption">Snap Invoice</span></>}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handlePhotoCapture(e, "invoice")} disabled={uploadingInvoicePhoto} />
              </label>
              {invoicePhotoUrl && <button onClick={() => setInvoicePhotoUrl(null)} className="text-zinc-600 type-micro mt-2 hover:text-red-400 transition-colors">Remove photo</button>}
            </div>
            <button onClick={handleSubmitInvoice} disabled={createInvoice.isPending || uploadingInvoicePhoto}
              className="w-full py-3 rounded-xl bg-amber-500 text-black font-semibold type-body disabled:opacity-50 glow-amber transition-all active:scale-[0.98]">
              {createInvoice.isPending ? "Saving..." : "Log Invoice"}
            </button>
          </div>

          {/* Recent Invoices */}
          {invoicesQuery.isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 size={20} className="text-amber-500 animate-spin" /></div>
          ) : allInvoices.length > 0 && (
            <div className="space-y-2">
              <p className="type-micro text-zinc-600">Recent</p>
              {allInvoices.map(inv => (
                <div key={inv.id} className="surface-base p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white type-body font-medium">{inv.vendorName}</p>
                      <p className="type-caption text-zinc-500">{new Date(inv.date).toLocaleDateString()} · {inv.category}{inv.invoiceNumber ? ` · #${inv.invoiceNumber}` : ''}</p>
                    </div>
                    <p className="text-amber-500 font-semibold font-data">${inv.totalAmount}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════
  // ─── VOID HUNTER ───────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════
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
      <div className="h-screen bg-black flex flex-col overflow-y-auto pb-24 screen-enter">
        <ScreenHeader title="VOID HUNTER" subtitle="Pattern tracking · This week" />
        <div className="px-6 space-y-4">
          <div className="surface-base p-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><p className="text-xl font-semibold text-white font-data">{voidCount}</p><p className="type-micro text-zinc-600 mt-0.5">Voids</p></div>
              <div><p className="text-xl font-semibold text-white font-data">{compCount}</p><p className="type-micro text-zinc-600 mt-0.5">Comps</p></div>
              <div><p className="text-xl font-semibold text-white font-data">{promoCount}</p><p className="type-micro text-zinc-600 mt-0.5">Promos</p></div>
            </div>
          </div>

          {voidsByStaff.length > 0 && (
            <div className="surface-base overflow-hidden">
              <div className="p-4 border-b border-white/5"><p className="type-micro text-zinc-500">By Employee</p></div>
              {voidsByStaff.map((vs, i) => (
                <div key={i} className={`flex items-center justify-between p-4 border-b border-white/5 last:border-0 ${vs.count >= 3 ? 'bg-red-950/10' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center"><span className="text-zinc-400 type-caption">{vs.initial}</span></div>
                    <span className="text-white type-body">{vs.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`type-body font-semibold font-data ${vs.count >= 3 ? 'text-red-400' : vs.count >= 2 ? 'text-amber-500' : 'text-zinc-400'}`}>{vs.count}</span>
                    {vs.count >= 3 && <AlertTriangle size={12} className="text-red-400" />}
                  </div>
                </div>
              ))}
            </div>
          )}

          {voidsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 size={20} className="text-amber-500 animate-spin" /></div>
          ) : (
            <div className="space-y-2">
              <p className="type-micro text-zinc-600">Recent Voids</p>
              {allVoids.length === 0 && <p className="type-body text-zinc-500 text-center py-8">No voids — clean week!</p>}
              {allVoids.slice(0, 10).map(v => {
                const staffName = allStaff.find(s => s.id === v.staffId);
                return (
                  <div key={v.id} className="surface-base p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white type-body font-medium">{staffName ? staffDisplayName(staffName) : `Staff #${v.staffId}`}</span>
                      <span className="type-caption text-zinc-600 font-data">{new Date(v.date).toLocaleDateString()}</span>
                    </div>
                    <p className="type-caption text-zinc-500">{v.type} · ${v.amount} — "{v.reason}"</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════
  // ─── DRIVER EOD ────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════
  const DriverEODScreen = () => {
    const handleSubmitEOD = async () => {
      if (!isAuthenticated) { toast.error("Please sign in via Manus to submit reports"); return; }
      if (!staffUser) return;
      try {
        await createDriverReport.mutateAsync({ staffId: staffUser.id, date: new Date(), totalDeliveries: 0, outOfTownRuns: driverEOD.outOfTown ? [{ destination: driverEOD.outOfTown }] : undefined, specialRuns: driverEOD.specialRuns ? [{ description: driverEOD.specialRuns }] : undefined, cashFromTill: driverEOD.cashFromTill || undefined, cashReason: driverEOD.notes || undefined, redeliveries: driverEOD.redeliveries ? [{ description: driverEOD.redeliveries }] : undefined, managerHandedCash: false });
        toast.success("EOD Report submitted");
        setDriverEOD({ outOfTown: "", specialRuns: "", cashFromTill: "", redeliveries: "", notes: "" });
      } catch { toast.error("Failed to submit — try again"); }
    };

    return (
      <div className="h-screen bg-black flex flex-col overflow-y-auto pb-24 screen-enter">
        <ScreenHeader title="DRIVER END OF DAY" subtitle="Required before clocking out" />
        <div className="px-6 space-y-4">
          <div className="bg-red-950/20 rounded-xl p-4">
            <p className="type-caption text-red-400 font-semibold">No sheet = No reimbursement. Manager must hand you cash — not front staff.</p>
          </div>
          {[
            { key: "outOfTown", label: "Out-of-Town Runs", placeholder: "Where? (leave blank if none)" },
            { key: "specialRuns", label: "Special Runs", placeholder: "Catering, non-standard deliveries" },
            { key: "cashFromTill", label: "Cash From Till", placeholder: "Amount + reason" },
            { key: "redeliveries", label: "Redeliveries", placeholder: "Ticket # + reason" },
            { key: "notes", label: "Notes", placeholder: "Anything else" },
          ].map(field => (
            <div key={field.key} className="surface-base p-4">
              <p className="type-micro text-zinc-500 mb-2">{field.label}</p>
              <textarea value={(driverEOD as any)[field.key]} onChange={e => setDriverEOD(d => ({ ...d, [field.key]: e.target.value }))} placeholder={field.placeholder}
                className="w-full bg-zinc-800/50 rounded-xl p-3 text-white type-body placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/30 min-h-[48px] resize-none" />
            </div>
          ))}
          <button onClick={handleSubmitEOD} disabled={createDriverReport.isPending}
            className="w-full py-3.5 rounded-xl bg-amber-500 text-black font-semibold type-body disabled:opacity-50 glow-amber transition-all active:scale-[0.98]">
            {createDriverReport.isPending ? "Submitting..." : "Submit EOD Report"}
          </button>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════
  // ─── FEEDBACK ──────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════
  const FeedbackScreen = () => {
    const handleSubmitFeedback = async () => {
      if (!isAuthenticated) { toast.error("Please sign in via Manus to submit feedback"); return; }
      if (!staffUser || !feedbackText.trim()) return;
      try {
        await createFeedback.mutateAsync({ staffId: staffUser.id, date: new Date(), comment: feedbackText, category: (feedbackCategory as any) || "other" });
        toast.success("+5 pts! Feedback submitted");
        setFeedbackText("");
        setFeedbackCategory(null);
      } catch { toast.error("Failed to submit — try again"); }
    };

    return (
      <div className="h-screen bg-black flex flex-col overflow-y-auto pb-24 screen-enter">
        <ScreenHeader title="SHIFT FEEDBACK" subtitle="Your voice matters · +5 pts" />
        <div className="px-6 space-y-4">
          <div className="surface-base p-5">
            <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="What worked? What didn't? What was blocked?"
              className="w-full bg-zinc-800/50 rounded-xl p-3 text-white type-body placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/30 min-h-[120px] resize-none" />
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {["equipment", "staffing", "inventory", "customer", "management"].map(t => (
                <button key={t} onClick={() => setFeedbackCategory(feedbackCategory === t ? null : t)}
                  className={`px-3 py-1.5 rounded-full type-micro transition-all ${feedbackCategory === t ? 'bg-amber-500/15 text-amber-500 ring-1 ring-amber-500/30' : 'bg-zinc-800/50 text-zinc-500'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleSubmitFeedback} disabled={createFeedback.isPending || !feedbackText.trim()}
            className="w-full py-3.5 rounded-xl bg-amber-500 text-black font-semibold type-body disabled:opacity-50 glow-amber transition-all active:scale-[0.98]">
            {createFeedback.isPending ? "Submitting..." : "Submit · +5 pts"}
          </button>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════
  // ─── ISSUES ────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════
  const IssuesScreen = () => {
    const handleSubmitIssue = async () => {
      if (!isAuthenticated) { toast.error("Please sign in via Manus to report issues"); return; }
      if (!staffUser || !issueTitle.trim()) { toast.error("Please enter an issue title"); return; }
      try {
        await createIssue.mutateAsync({ title: issueTitle, description: issueDesc || undefined, priority: issuePriority as any, category: issueCategory as any, reportedById: staffUser.id, date: new Date() });
        toast.success("Issue reported — management notified");
        setIssueTitle("");
        setIssueDesc("");
        setIssuePriority("medium");
        setIssueCategory("equipment");
      } catch { toast.error("Failed to report — try again"); }
    };

    return (
      <div className="h-screen bg-black flex flex-col overflow-y-auto pb-24 screen-enter">
        <ScreenHeader title="ISSUES" subtitle="Report · Route · Resolve" />
        <div className="px-6 space-y-4">
          <div className="surface-base p-5 space-y-3">
            <p className="type-micro text-zinc-500">Report New Issue</p>
            <input value={issueTitle} onChange={e => setIssueTitle(e.target.value)} placeholder="What's the issue?"
              className="w-full bg-zinc-800/50 rounded-xl p-3 text-white type-body placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/30" />
            <textarea value={issueDesc} onChange={e => setIssueDesc(e.target.value)} placeholder="Details (optional)"
              className="w-full bg-zinc-800/50 rounded-xl p-3 text-white type-body placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/30 min-h-[48px] resize-none" />
            <div>
              <p className="type-micro text-zinc-600 mb-1.5">Priority</p>
              <div className="flex gap-2">
                {["low", "medium", "high", "critical"].map(p => (
                  <button key={p} onClick={() => setIssuePriority(p)}
                    className={`px-3 py-1.5 rounded-full type-micro transition-all ${issuePriority === p
                      ? (p === 'critical' ? 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30' : 'bg-amber-500/15 text-amber-500 ring-1 ring-amber-500/30')
                      : 'bg-zinc-800/50 text-zinc-500'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="type-micro text-zinc-600 mb-1.5">Category</p>
              <div className="flex gap-2 flex-wrap">
                {["equipment", "staffing", "inventory", "safety", "other"].map(c => (
                  <button key={c} onClick={() => setIssueCategory(c)}
                    className={`px-3 py-1.5 rounded-full type-micro transition-all ${issueCategory === c ? 'bg-amber-500/15 text-amber-500 ring-1 ring-amber-500/30' : 'bg-zinc-800/50 text-zinc-500'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleSubmitIssue} disabled={createIssue.isPending || !issueTitle.trim()}
              className="w-full py-3 rounded-xl bg-red-500/80 text-white font-semibold type-body disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              {createIssue.isPending ? <><Loader2 size={14} className="animate-spin" /> Reporting...</> : <><Plus size={14} /> Report Issue</>}
            </button>
          </div>

          {issuesQuery.isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 size={20} className="text-amber-500 animate-spin" /></div>
          ) : openIssues.length > 0 && (
            <div className="space-y-2">
              <p className="type-micro text-zinc-600">{openIssues.length} Open</p>
              {openIssues.map(issue => (
                <div key={issue.id} className="surface-base p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white type-body font-medium">{issue.title}</p>
                    <span className={`type-micro px-2 py-0.5 rounded-full ${issue.priority === 'critical' ? 'bg-red-500/15 text-red-400' : issue.priority === 'high' ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-800 text-zinc-500'}`}>{issue.priority}</span>
                  </div>
                  <p className="type-caption text-zinc-500">{issue.category} · {new Date(issue.date).toLocaleDateString()}</p>
                  {issue.description && <p className="type-caption text-zinc-400 mt-1">{issue.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════
  // ─── LEADERBOARD ───────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════
  const LeaderboardScreen = () => (
    <div className="h-screen bg-black flex flex-col overflow-y-auto pb-24 screen-enter">
      <ScreenHeader title="LEADERBOARD" subtitle="Score = shift priority" />
      <div className="px-6">
        <div className="surface-base p-4 mb-4">
          <p className="type-caption text-amber-500">Higher score = first pick on preferred shifts. Execute, contribute, stay on the floor.</p>
        </div>
        {leaderboardQuery.isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 size={20} className="text-amber-500 animate-spin" /></div>
        ) : (
          <div className="space-y-2">
            {leaderboard.filter(s => s.jobRole !== "owner").map((s, i) => (
              <div key={s.id} className={`flex items-center gap-3 p-4 rounded-xl transition-all ${s.id === staffUser?.id ? 'bg-amber-500/8 ring-1 ring-amber-500/15' : 'surface-base'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold type-caption font-data ${
                  i === 0 ? 'bg-amber-500 text-black' : i === 1 ? 'bg-zinc-400 text-black' : i === 2 ? 'bg-amber-700 text-white' : 'bg-zinc-800 text-zinc-500'
                }`}>{i + 1}</div>
                <div className="flex-1">
                  <p className="text-white type-body font-medium">{staffDisplayName(s)}</p>
                  <div className="flex items-center gap-2">
                    <span className="type-caption text-zinc-500">{roleLabel(s.jobRole)}</span>
                    {s.isKeyEmployee && <span className="type-micro text-amber-500">KEY</span>}
                    {s.currentStreak > 7 && <span className="text-amber-600 type-caption flex items-center gap-0.5"><Flame size={10} />{s.currentStreak}d</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-amber-500 font-semibold type-body font-data">{s.totalPoints.toLocaleString()}</p>
                  {isManager && <p className="type-micro text-zinc-600">{s.weeklyVoids}v</p>}
                </div>
              </div>
            ))}
            {leaderboard.length === 0 && <p className="type-body text-zinc-500 text-center py-8">No leaderboard data yet</p>}
          </div>
        )}
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════
  // ─── COMMAND CENTER ────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════
  const CommandScreen = () => {
    if (!isManager) return <AccessDenied />;
    const todayPayouts = allPayouts.reduce((s, p) => s + parseFloat(p.amount), 0);
    const vendorSpend = allInvoices.reduce((s, inv) => s + parseFloat(inv.totalAmount), 0);
    const voidCount = allVoids.length;
    const flaggedPayouts = allPayouts.filter(p => p.flagged).length;

    return (
      <div className="h-screen bg-black flex flex-col overflow-y-auto pb-24 screen-enter">
        <ScreenHeader title="COMMAND CENTER" subtitle="Owner intelligence" />
        <div className="px-6 space-y-4">
          {/* KPIs — clean 2-column grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: "Yesterday Sales", value: briefing ? `$${briefing.salesYesterday || "—"}` : "—", sub: briefing ? `${briefing.ordersYesterday || 0} orders` : "—" },
              { label: "Pay Outs", value: `$${todayPayouts.toFixed(0)}`, sub: flaggedPayouts > 0 ? `${flaggedPayouts} flagged` : "Clean" },
              { label: "Voids", value: `${voidCount}`, sub: voidCount > 5 ? "Flag" : "Normal" },
              { label: "Active Staff", value: `${leaderboard.length}`, sub: "On leaderboard" },
              { label: "Vendor Spend", value: `$${vendorSpend.toFixed(0)}`, sub: "This week" },
              { label: "Open Issues", value: `${openIssues.length}`, sub: openIssues.length > 0 ? "Needs attention" : "All clear" },
            ].map((kpi, i) => (
              <div key={i} className="surface-base p-4">
                <p className="type-micro text-zinc-600">{kpi.label}</p>
                <p className="text-white text-lg font-semibold font-data mt-1">{kpi.value}</p>
                <p className="type-caption text-zinc-500 mt-0.5">{kpi.sub}</p>
              </div>
            ))}
          </div>

          {/* Quick Nav */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { icon: Receipt, label: "Pay Outs", s: "store-run" as Screen },
              { icon: ShieldAlert, label: "Voids", s: "voids" as Screen },
              { icon: Package, label: "Invoices", s: "invoices" as Screen },
            ].map(item => (
              <button key={item.s} onClick={() => navigateTo(item.s)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl surface-interactive">
                <item.icon size={18} className="text-amber-500" />
                <span className="type-micro text-zinc-400 normal-case">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Wi-Fi Proximity */}
          <div className="surface-base overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <p className="type-body text-white font-semibold flex items-center gap-2"><Wifi size={14} className="text-amber-500" />Wi-Fi Proximity</p>
            </div>
            {leaderboard.filter(s => s.jobRole !== "owner").slice(0, 8).map((s, i) => (
              <div key={i} className="flex items-center justify-between p-3.5 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-white type-caption">{staffDisplayName(s)}</span>
                </div>
                <span className="type-micro text-amber-500">On floor</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════
  // ─── PROFILE ───────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════
  const ProfileScreen = () => (
    <div className="h-screen bg-black flex flex-col overflow-y-auto pb-24 screen-enter">
      <ScreenHeader title="PROFILE" subtitle={staffUser ? staffDisplayName(staffUser) : ""} />
      <div className="px-6 space-y-4">
        {/* Hero Card */}
        <div className="surface-base p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-amber-500 text-2xl font-bold">{staffUser?.firstName?.charAt(0)}</span>
          </div>
          <p className="type-heading text-white">{staffUser ? staffDisplayName(staffUser) : ""}</p>
          <p className="type-caption text-zinc-500 mt-0.5">{staffUser ? roleLabel(staffUser.jobRole) : ""}</p>
          {staffUser?.isKeyEmployee && (
            <span className="type-micro text-amber-500 px-2.5 py-1 rounded-full bg-amber-500/10 inline-block mt-2">KEY EMPLOYEE</span>
          )}
          <div className="flex items-center justify-center gap-6 mt-5">
            <div className="text-center">
              <p className="text-amber-500 font-semibold text-lg font-data">{staffUser?.totalPoints?.toLocaleString()}</p>
              <p className="type-micro text-zinc-600 mt-0.5">Score</p>
            </div>
            <div className="w-px h-8 bg-zinc-800" />
            <div className="text-center">
              <p className="text-white font-semibold text-lg font-data">{staffUser?.currentStreak}</p>
              <p className="type-micro text-zinc-600 mt-0.5">Streak</p>
            </div>
            <div className="w-px h-8 bg-zinc-800" />
            <div className="text-center">
              <p className="text-white font-semibold text-lg font-data">{staffUser?.schedulePriority}</p>
              <p className="type-micro text-zinc-600 mt-0.5">Priority</p>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="surface-base p-5">
          <p className="type-micro text-zinc-500 mb-3">Details</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="type-caption text-zinc-500">Department</span>
              <span className="type-caption text-white capitalize">{staffUser?.department}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="type-caption text-zinc-500">Role</span>
              <span className="type-caption text-white">{staffUser ? roleLabel(staffUser.jobRole) : ""}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="type-caption text-zinc-500">Employee #</span>
              <span className="type-caption text-white font-data">{staffUser?.employeeNumber || "—"}</span>
            </div>
          </div>
        </div>

        {/* Self-only activity */}
        {!isManager && (
          <div className="surface-base p-5">
            <p className="type-micro text-zinc-500 mb-3">Your Activity</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-white font-semibold type-body font-data">{myVoids.length}</p>
                <p className="type-caption text-zinc-500">Voids</p>
              </div>
              <div>
                <p className="text-white font-semibold type-body font-data">{myPayouts.length}</p>
                <p className="type-caption text-zinc-500">Pay Outs</p>
              </div>
            </div>
          </div>
        )}

        {/* Sign Out */}
        <button onClick={async () => {
          try { await staffLogout.mutateAsync(); } catch {}
          setStaffUser(null);
          setScreen("login");
          setSelectedDept(null);
          setPin("");
          setChecklistProgress({});
          toast.success("Signed out");
        }} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-zinc-800/50 text-zinc-400 type-caption font-semibold hover:bg-zinc-800 hover:text-zinc-300 transition-all">
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════
  // ─── BOTTOM NAV — Glass, minimal, 4 items max ─────────────────
  // ════════════════════════════════════════════════════════════════
  const BottomNav = () => {
    const navItems: { icon: any; label: string; s: Screen }[] = [
      { icon: Home, label: "Home", s: "home" },
      { icon: Trophy, label: "Rank", s: "leaderboard" },
      { icon: Brain, label: "Brain", s: "ask-brain" },
      { icon: UserCircle, label: "Profile", s: "profile" },
    ];

    return (
      <div className="fixed bottom-0 left-0 right-0 nav-glass border-t border-white/5 z-50">
        <div className="flex items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] max-w-md mx-auto">
          {navItems.map(item => {
            const active = screen === item.s;
            return (
              <button key={item.s} onClick={() => setScreen(item.s)}
                className="flex flex-col items-center gap-0.5 py-1.5 px-4 transition-all">
                <item.icon size={20} className={`transition-colors ${active ? 'text-amber-500' : 'text-zinc-600'}`} />
                <span className={`text-[10px] font-medium transition-colors ${active ? 'text-amber-500' : 'text-zinc-600'}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════
  // ─── SCREEN ROUTER ─────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════
  const showNav = !["splash", "login", "welcome", "briefing"].includes(screen);

  const renderScreen = () => {
    switch (screen) {
      case "splash": return <SplashScreen />;
      case "login": return <LoginScreen />;
      case "welcome": return <WelcomeScreen />;
      case "briefing": return <BriefingScreen />;
      case "home": return <HomeScreen />;
      case "checklist": return <ChecklistScreen />;
      case "store-run": return <StoreRunScreen />;
      case "invoices": return <InvoiceScreen />;
      case "voids": return <VoidScreen />;
      case "driver-eod": return <DriverEODScreen />;
      case "feedback": return <FeedbackScreen />;
      case "issues": return <IssuesScreen />;
      case "leaderboard": return <LeaderboardScreen />;
      case "command": return <CommandScreen />;
      case "profile": return <ProfileScreen />;
      case "ask-brain": return <AskBrainScreen staffUser={staffUser!} onBack={() => setScreen("home")} />;
      case "photo-missions": return <PhotoMissionsScreen staffUser={staffUser!} onBack={() => setScreen("home")} />;
      case "achievements": return <AchievementsScreen staffUser={staffUser!} onBack={() => setScreen("home")} />;
      case "rewards-shop": return <RewardsShopScreen staffUser={staffUser!} onBack={() => setScreen("home")} />;
      case "order-guide": return <OrderGuideScreen staffUser={staffUser!} onBack={() => setScreen("home")} />;
      case "shift-handoff": return <ShiftHandoffScreen staffUser={staffUser!} onBack={() => setScreen("home")} />;
      case "worker-profile": return <WorkerProfileScreen staffUser={staffUser!} allStaff={allStaff as SafeStaff[]} onBack={() => setScreen("home")} />;
      case "sales-intel": return <SalesIntelligenceScreen staffUser={staffUser!} onBack={() => setScreen("home")} />;
      case "pos-training": return <POSTrainingScreen staffId={staffUser?.id} staffName={staffUser ? staffDisplayName(staffUser) : undefined} onBack={() => setScreen("home")} />;
      case "management-briefing": return <ManagementBriefingScreen staffUser={staffUser ? { id: staffUser.id, name: staffDisplayName(staffUser), department: staffUser.department, role: staffUser.jobRole } : null} onBack={() => setScreen("home")} />;
      case "forecast": return <ForecastScreen staffUser={staffUser ? { id: staffUser.id, name: staffDisplayName(staffUser), role: staffUser.jobRole } : null} onBack={() => setScreen("home")} />;
      case "recipe-cost": return <RecipeCostScreen staffUser={staffUser ? { id: staffUser.id, name: staffDisplayName(staffUser), role: staffUser.jobRole } : null} onBack={() => setScreen("home")} />;
      case "sku-tracker": return <SKUTrackerScreen staffUser={staffUser ? { id: staffUser.id, name: staffDisplayName(staffUser), role: staffUser.jobRole } : null} onBack={() => setScreen("home")} />;
      case "station-broadcast": return <StationBroadcastScreen staffUser={staffUser ? { id: staffUser.id, name: staffDisplayName(staffUser), role: staffUser.jobRole } : null} onBack={() => setScreen("home")} />;
      case "waste-log": return <WasteLogScreen staffUser={staffUser ? { id: staffUser.id, name: staffDisplayName(staffUser), role: staffUser.jobRole } : null} onBack={() => setScreen("home")} />;
      case "compliance-intel": return <ComplianceIntelScreen staffRole={staffUser?.jobRole} onBack={() => setScreen("home")} />;
      case "schedule": return <ScheduleScreen staffUser={staffUser!} allStaff={allStaff as SafeStaff[]} onBack={() => setScreen("home")} />;
      default: return <HomeScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {renderScreen()}
      {showNav && <BottomNav />}
    </div>
  );
}
