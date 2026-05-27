/**
 * Worker Profile Screen — Portable career record for each staff member.
 * Training completions, skill certifications, evaluations, write-ups, career track.
 * Managers see full profile + can add records. Staff sees their own read-only view.
 */
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { SafeStaff } from "../../../shared/types";
import {
  ChevronLeft, GraduationCap, Award, Star, AlertTriangle,
  TrendingUp, CheckCircle2, Circle, Clock, Shield,
  ChevronRight, FileText, User, Plus, ArrowUp,
} from "lucide-react";

interface Props {
  staffUser: SafeStaff;
  targetStaffId?: number; // if viewing someone else's profile (manager only)
  allStaff: SafeStaff[];
  onBack: () => void;
}

const TRACK_LABELS: Record<string, string> = {
  kitchen: "Kitchen Track", pizza: "Pizza Track", foh: "Front of House", driver: "Driver Track",
};

const TRACK_COLORS: Record<string, string> = {
  kitchen: "amber", pizza: "red", foh: "blue", driver: "green",
};

const LEVEL_TITLES: Record<string, Record<number, string>> = {
  kitchen: { 1: "Dishwasher", 2: "Fry Line — 1st Off", 3: "Fry Line — 2nd Off", 4: "Fry Line — 3rd Off", 5: "Fry Line Closer", 6: "Kitchen Manager" },
  pizza: { 1: "Stocking", 2: "Phone Taker", 3: "Dough Roller", 4: "Pizza Maker", 5: "Pizza Closer" },
  foh: { 1: "Server Trainee", 2: "Pizza Side Server", 3: "Bar Side Server", 4: "Bartender", 5: "Bar Manager" },
  driver: { 1: "Dishwasher/Driver", 2: "Delivery Driver", 3: "Phone Taker/Driver" },
};

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  verbal: { label: "Verbal Warning", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  written: { label: "Written Warning", color: "text-orange-400", bg: "bg-orange-500/10" },
  final: { label: "Final Warning", color: "text-red-400", bg: "bg-red-500/10" },
  termination: { label: "Termination", color: "text-red-500", bg: "bg-red-500/20" },
};

type Tab = "overview" | "training" | "evaluations" | "writeups" | "career";

export default function WorkerProfileScreen({ staffUser, targetStaffId, allStaff, onBack }: Props) {
  const viewingId = targetStaffId || staffUser.id;
  const viewingSelf = viewingId === staffUser.id;
  const isManager = ["owner", "key_manager", "kitchen_manager", "bar_manager"].includes(staffUser.jobRole);
  const targetStaff = allStaff.find(s => s.id === viewingId) || staffUser;

  const [tab, setTab] = useState<Tab>("overview");
  const [showEvalForm, setShowEvalForm] = useState(false);
  const [showWriteUpForm, setShowWriteUpForm] = useState(false);

  // Queries
  const { data: modules = [] } = trpc.training.modules.useQuery();
  const { data: completions = [] } = trpc.training.completions.useQuery({ staffId: viewingId });
  const { data: skills = [] } = trpc.skills.list.useQuery({ staffId: viewingId });
  const { data: evaluations = [] } = trpc.evaluations.list.useQuery({ staffId: viewingId });
  const { data: writeUps = [] } = trpc.writeUps.list.useQuery({ staffId: viewingId });
  const { data: activeWriteUps = [] } = trpc.writeUps.active.useQuery({ staffId: viewingId });
  const { data: careerTracks = [] } = trpc.career.track.useQuery({ staffId: viewingId });

  const utils = trpc.useUtils();

  // Computed
  const completedModuleIds = useMemo(() => new Set(completions.filter(c => c.passed).map(c => c.moduleId)), [completions]);
  const trainingProgress = modules.length > 0 ? Math.round((completedModuleIds.size / modules.length) * 100) : 0;
  const latestEval = evaluations[0];
  const primaryTrack = careerTracks[0];

  const TABS: { key: Tab; label: string; icon: any; count?: number }[] = [
    { key: "overview", label: "Overview", icon: User },
    { key: "training", label: "Training", icon: GraduationCap, count: completedModuleIds.size },
    { key: "evaluations", label: "Reviews", icon: Star, count: evaluations.length },
    { key: "writeups", label: "Write-Ups", icon: AlertTriangle, count: activeWriteUps.length },
    { key: "career", label: "Career", icon: TrendingUp },
  ];

  // ─── Overview Tab ───
  const OverviewTab = () => (
    <div className="space-y-3">
      {/* Identity Card */}
      <div className="bg-white rounded-xl p-4 border border-slate-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-black font-black text-xl">
            {targetStaff.firstName.charAt(0)}{targetStaff.lastName?.charAt(0) || ""}
          </div>
          <div className="flex-1">
            <h3 className="text-slate-900 font-bold text-lg">{targetStaff.firstName} {targetStaff.lastName}</h3>
            <p className="text-amber-500 text-xs font-medium">{targetStaff.jobRole.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</p>
            <p className="text-slate-500 text-[10px]">{targetStaff.department} · #{targetStaff.employeeNumber || "—"}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <StatBox label="Points" value={targetStaff.totalPoints?.toLocaleString() || "0"} color="text-amber-500" />
          <StatBox label="Streak" value={`${targetStaff.currentStreak || 0}d`} color="text-orange-500" />
          <StatBox label="Training" value={`${trainingProgress}%`} color="text-green-500" />
        </div>
      </div>

      {/* Career Position */}
      {primaryTrack && (
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-slate-500 text-[10px] uppercase mb-2 font-semibold">Career Position</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-900 font-semibold text-sm">{TRACK_LABELS[primaryTrack.track] || primaryTrack.track}</p>
              <p className="text-amber-500 text-xs">Level {primaryTrack.currentLevel}: {LEVEL_TITLES[primaryTrack.track]?.[primaryTrack.currentLevel] || "—"}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 text-[10px]">Readiness</p>
              <p className="text-slate-900 font-bold text-lg">{primaryTrack.advancementReadinessScore}%</p>
            </div>
          </div>
          <div className="mt-2 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${primaryTrack.advancementReadinessScore}%` }} />
          </div>
        </div>
      )}

      {/* Skills Snapshot */}
      {skills.length > 0 && (
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-slate-500 text-[10px] uppercase mb-2 font-semibold">Certified Skills ({skills.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {skills.map(s => (
              <span key={s.id} className="px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-medium">
                {s.skillName}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Latest Evaluation */}
      {latestEval && (
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-slate-500 text-[10px] uppercase mb-2 font-semibold">Latest Evaluation</p>
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-900 text-sm font-semibold">Avg: {latestEval.averageScore}/5.00</p>
            <p className="text-slate-500 text-[10px]">{new Date(latestEval.evaluatedAt).toLocaleDateString()}</p>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {[
              { label: "Quality", val: latestEval.workQuality },
              { label: "Attendance", val: latestEval.attendance },
              { label: "Knowledge", val: latestEval.jobKnowledge },
              { label: "Teamwork", val: latestEval.teamwork },
              { label: "Tasks", val: latestEval.finishingTasks },
              { label: "Attitude", val: latestEval.overallAttitude },
              { label: "Customer", val: latestEval.customerInteraction },
              { label: "Multitask", val: latestEval.multitasking },
              { label: "Computer", val: latestEval.computerSkills },
            ].map(({ label, val }) => (
              <div key={label} className="text-center">
                <p className="text-slate-500 text-[8px]">{label}</p>
                <p className={`text-sm font-bold ${val >= 4 ? "text-green-400" : val >= 3 ? "text-amber-400" : "text-red-400"}`}>{val}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Write-Ups */}
      {activeWriteUps.length > 0 && (
        <div className="bg-red-950/20 rounded-xl p-4 border border-red-900/30">
          <p className="text-red-400 text-[10px] uppercase mb-2 font-semibold flex items-center gap-1">
            <AlertTriangle size={10} /> Active Write-Ups ({activeWriteUps.length})
          </p>
          {activeWriteUps.map(wu => {
            const cfg = SEVERITY_CONFIG[wu.severity] || SEVERITY_CONFIG.verbal;
            return (
              <div key={wu.id} className="flex items-center justify-between py-1.5 border-b border-red-900/20 last:border-0">
                <div>
                  <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                  <p className="text-slate-500 text-[10px]">{wu.category} · {new Date(wu.issuedAt).toLocaleDateString()}</p>
                </div>
                {!wu.acknowledgedAt && (
                  <span className="text-[9px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">Unacknowledged</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ─── Training Tab ───
  const TrainingTab = () => {
    const byCategory = useMemo(() => {
      const grouped: Record<string, typeof modules> = {};
      modules.forEach(m => {
        if (!grouped[m.category]) grouped[m.category] = [];
        grouped[m.category].push(m);
      });
      return grouped;
    }, [modules]);

    return (
      <div className="space-y-3">
        <div className="bg-white rounded-xl p-3 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-900 font-semibold text-sm">Training Progress</p>
            <p className="text-amber-500 text-xs font-bold">{completedModuleIds.size}/{modules.length}</p>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${trainingProgress}%` }} />
          </div>
        </div>

        {Object.entries(byCategory).map(([cat, mods]) => (
          <div key={cat} className="bg-white rounded-xl p-3 border border-slate-200">
            <p className="text-slate-500 text-[10px] uppercase mb-2 font-semibold">{cat.replace(/_/g, " ")}</p>
            {mods.map(m => {
              const done = completedModuleIds.has(m.id);
              const completion = completions.find(c => c.moduleId === m.id && c.passed);
              return (
                <div key={m.id} className="flex items-center gap-2 py-1.5 border-b border-slate-200/50 last:border-0">
                  {done ? (
                    <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                  ) : (
                    <Circle size={14} className="text-zinc-600 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${done ? "text-slate-900" : "text-slate-500"}`}>{m.name}</p>
                    <p className="text-zinc-600 text-[9px]">
                      {m.assessmentType.replace(/_/g, " ")}
                      {m.passingScore ? ` · ${m.passingScore}% to pass` : ""}
                      {m.estimatedMinutes ? ` · ~${m.estimatedMinutes}min` : ""}
                    </p>
                  </div>
                  {completion && (
                    <span className="text-[9px] text-green-400">{new Date(completion.completedAt).toLocaleDateString()}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  // ─── Evaluations Tab ───
  const EvaluationsTab = () => (
    <div className="space-y-3">
      {isManager && (
        <button
          onClick={() => setShowEvalForm(!showEvalForm)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm font-medium hover:bg-amber-500/20 transition-all"
        >
          <Plus size={14} /> New Evaluation
        </button>
      )}

      {showEvalForm && <EvaluationForm staffId={viewingId} evaluatorId={staffUser.id} onDone={() => { setShowEvalForm(false); utils.evaluations.list.invalidate(); }} />}

      {evaluations.length === 0 && (
        <div className="text-center py-8">
          <Star size={32} className="text-zinc-700 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No evaluations yet</p>
        </div>
      )}

      {evaluations.map(ev => {
        const evaluator = allStaff.find(s => s.id === ev.evaluatorId);
        return (
          <div key={ev.id} className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-slate-900 font-semibold text-sm">Avg: {ev.averageScore}/5.00</p>
                <p className="text-slate-500 text-[10px]">By {evaluator ? `${evaluator.firstName} ${evaluator.lastName}` : "Unknown"}</p>
              </div>
              <p className="text-slate-500 text-[10px]">{new Date(ev.evaluatedAt).toLocaleDateString()}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Work Quality", val: ev.workQuality },
                { label: "Attendance", val: ev.attendance },
                { label: "Job Knowledge", val: ev.jobKnowledge },
                { label: "Teamwork", val: ev.teamwork },
                { label: "Finishing Tasks", val: ev.finishingTasks },
                { label: "Attitude", val: ev.overallAttitude },
                { label: "Customer", val: ev.customerInteraction },
                { label: "Multitasking", val: ev.multitasking },
                { label: "Computer", val: ev.computerSkills },
              ].map(({ label, val }) => (
                <div key={label} className="bg-zinc-800/50 rounded-lg p-1.5 text-center">
                  <p className="text-slate-500 text-[8px]">{label}</p>
                  <p className={`text-sm font-bold ${val >= 4 ? "text-green-400" : val >= 3 ? "text-amber-400" : "text-red-400"}`}>{val}</p>
                </div>
              ))}
            </div>
            {ev.overallSuccession && (
              <div className="mt-2 p-2 bg-green-500/5 rounded-lg border border-green-500/10">
                <p className="text-green-400 text-[9px] font-semibold mb-0.5">Strengths</p>
                <p className="text-slate-600 text-[10px]">{ev.overallSuccession}</p>
              </div>
            )}
            {ev.needsImprovement && (
              <div className="mt-1.5 p-2 bg-amber-500/5 rounded-lg border border-amber-500/10">
                <p className="text-amber-400 text-[9px] font-semibold mb-0.5">Needs Improvement</p>
                <p className="text-slate-600 text-[10px]">{ev.needsImprovement}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ─── Write-Ups Tab ───
  const WriteUpsTab = () => {
    const acknowledgeWriteUp = trpc.writeUps.acknowledge.useMutation({
      onSuccess: () => { toast.success("Write-up acknowledged"); utils.writeUps.list.invalidate(); utils.writeUps.active.invalidate(); },
    });

    return (
      <div className="space-y-3">
        {isManager && (
          <button
            onClick={() => setShowWriteUpForm(!showWriteUpForm)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium hover:bg-red-500/20 transition-all"
          >
            <Plus size={14} /> Issue Write-Up
          </button>
        )}

        {showWriteUpForm && <WriteUpForm staffId={viewingId} issuedById={staffUser.id} onDone={() => { setShowWriteUpForm(false); utils.writeUps.list.invalidate(); utils.writeUps.active.invalidate(); }} />}

        {writeUps.length === 0 && (
          <div className="text-center py-8">
            <Shield size={32} className="text-green-700 mx-auto mb-2" />
            <p className="text-green-500 text-sm font-medium">Clean Record</p>
            <p className="text-slate-500 text-[10px]">No write-ups on file</p>
          </div>
        )}

        {writeUps.map(wu => {
          const cfg = SEVERITY_CONFIG[wu.severity] || SEVERITY_CONFIG.verbal;
          const issuer = allStaff.find(s => s.id === wu.issuedById);
          const isActive = !wu.resolvedAt && (!wu.expiresAt || new Date(wu.expiresAt) > new Date());
          return (
            <div key={wu.id} className={`rounded-xl p-4 border ${isActive ? "bg-red-950/20 border-red-900/30" : "bg-white border-slate-200"}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                <p className="text-slate-500 text-[10px]">{new Date(wu.issuedAt).toLocaleDateString()}</p>
              </div>
              <p className="text-slate-500 text-[10px] mb-1">Category: {wu.category} · By {issuer ? `${issuer.firstName} ${issuer.lastName}` : "Unknown"}</p>
              <p className="text-slate-900 text-xs">{wu.description}</p>
              {wu.employeeResponse && (
                <div className="mt-2 p-2 bg-zinc-800/50 rounded-lg">
                  <p className="text-slate-500 text-[9px] font-semibold mb-0.5">Employee Response</p>
                  <p className="text-slate-600 text-[10px]">{wu.employeeResponse}</p>
                </div>
              )}
              <div className="flex items-center justify-between mt-2">
                {wu.acknowledgedAt ? (
                  <span className="text-[9px] text-green-400 flex items-center gap-1"><CheckCircle2 size={9} /> Acknowledged {new Date(wu.acknowledgedAt).toLocaleDateString()}</span>
                ) : viewingSelf ? (
                  <button
                    onClick={() => acknowledgeWriteUp.mutate({ id: wu.id })}
                    className="text-[10px] text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full hover:bg-amber-500/20 transition-all"
                  >
                    Acknowledge
                  </button>
                ) : (
                  <span className="text-[9px] text-red-400">Not yet acknowledged</span>
                )}
                {!isActive && <span className="text-[9px] text-zinc-600">{wu.resolvedAt ? "Resolved" : "Expired"}</span>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ─── Career Tab ───
  const CareerTab = () => (
    <div className="space-y-3">
      {careerTracks.length === 0 && (
        <div className="text-center py-8">
          <TrendingUp size={32} className="text-zinc-700 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No career track assigned yet</p>
          {isManager && <p className="text-zinc-600 text-[10px]">Assign a track to start progression</p>}
        </div>
      )}

      {careerTracks.map(ct => {
        const maxLevel = Object.keys(LEVEL_TITLES[ct.track] || {}).length;
        const nextLevel = ct.currentLevel + 1;
        const nextTitle = LEVEL_TITLES[ct.track]?.[nextLevel];
        const reqs = ct.nextLevelRequirements as any;

        return (
          <div key={ct.id} className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-amber-500 text-[10px] uppercase font-semibold">{TRACK_LABELS[ct.track]}</p>
                <p className="text-slate-900 font-bold text-lg">Level {ct.currentLevel}</p>
                <p className="text-slate-500 text-xs">{LEVEL_TITLES[ct.track]?.[ct.currentLevel] || "—"}</p>
              </div>
              <div className="w-16 h-16 rounded-full border-4 border-amber-500/30 flex items-center justify-center">
                <span className="text-amber-500 font-black text-xl">{ct.advancementReadinessScore}%</span>
              </div>
            </div>

            {/* Level progression */}
            <div className="flex items-center gap-0.5 mb-3">
              {Array.from({ length: maxLevel }, (_, i) => i + 1).map(lvl => (
                <div
                  key={lvl}
                  className={`flex-1 h-2 rounded-full ${lvl <= ct.currentLevel ? "bg-amber-500" : lvl === nextLevel ? "bg-amber-500/30" : "bg-zinc-800"}`}
                />
              ))}
            </div>

            {/* Next level */}
            {nextTitle && (
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUp size={12} className="text-amber-500" />
                  <p className="text-slate-900 text-xs font-semibold">Next: {nextTitle}</p>
                </div>
                {reqs && Array.isArray(reqs) && reqs.map((req: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 py-0.5">
                    {req.met ? (
                      <CheckCircle2 size={10} className="text-green-500 shrink-0" />
                    ) : (
                      <Circle size={10} className="text-zinc-600 shrink-0" />
                    )}
                    <span className={`text-[10px] ${req.met ? "text-green-400" : "text-slate-500"}`}>{req.label}</span>
                  </div>
                ))}
              </div>
            )}

            {ct.promotedAt && (
              <p className="text-slate-500 text-[9px] mt-2">Last promoted: {new Date(ct.promotedAt).toLocaleDateString()}</p>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-2 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-900 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <h2 className="text-slate-900 font-bold text-base" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.03em" }}>
            {viewingSelf ? "My Profile" : `${targetStaff.firstName}'s Profile`}
          </h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-2 flex gap-1 overflow-x-auto shrink-0">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-all ${
              tab === t.key ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" : "bg-white text-slate-500 border border-slate-200"
            }`}
          >
            <t.icon size={10} />
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`ml-0.5 px-1 py-0 rounded-full text-[8px] ${tab === t.key ? "bg-amber-500/30" : "bg-zinc-800"}`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-20">
        {tab === "overview" && <OverviewTab />}
        {tab === "training" && <TrainingTab />}
        {tab === "evaluations" && <EvaluationsTab />}
        {tab === "writeups" && <WriteUpsTab />}
        {tab === "career" && <CareerTab />}
      </div>
    </div>
  );
}

// ─── Evaluation Form ───
function EvaluationForm({ staffId, evaluatorId, onDone }: { staffId: number; evaluatorId: number; onDone: () => void }) {
  const [scores, setScores] = useState({
    workQuality: 3, attendance: 3, jobKnowledge: 3, teamwork: 3,
    finishingTasks: 3, overallAttitude: 3, customerInteraction: 3,
    multitasking: 3, computerSkills: 3,
  });
  const [notes, setNotes] = useState({ overallSuccession: "", needsImprovement: "", employeeConcerns: "" });

  const createEval = trpc.evaluations.create.useMutation({
    onSuccess: () => { toast.success("Evaluation saved"); onDone(); },
    onError: (e) => toast.error(e.message),
  });

  const SCORE_FIELDS = [
    { key: "workQuality", label: "Work Quality" },
    { key: "attendance", label: "Attendance" },
    { key: "jobKnowledge", label: "Job Knowledge" },
    { key: "teamwork", label: "Teamwork" },
    { key: "finishingTasks", label: "Finishing Tasks" },
    { key: "overallAttitude", label: "Overall Attitude" },
    { key: "customerInteraction", label: "Customer Interaction" },
    { key: "multitasking", label: "Multitasking" },
    { key: "computerSkills", label: "Computer Skills" },
  ] as const;

  return (
    <div className="bg-white rounded-xl p-4 border border-amber-500/20 space-y-3">
      <p className="text-amber-500 text-xs font-semibold">New Evaluation</p>
      {SCORE_FIELDS.map(({ key, label }) => (
        <div key={key} className="flex items-center justify-between">
          <span className="text-slate-500 text-xs">{label}</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(v => (
              <button
                key={v}
                onClick={() => setScores(s => ({ ...s, [key]: v }))}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                  scores[key] === v ? "bg-amber-500 text-black" : "bg-zinc-800 text-slate-500 hover:bg-zinc-700"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      ))}
      <textarea
        placeholder="Strengths / succession notes..."
        value={notes.overallSuccession}
        onChange={e => setNotes(n => ({ ...n, overallSuccession: e.target.value }))}
        className="w-full bg-zinc-800 rounded-lg p-2 text-slate-900 text-xs border border-zinc-700 focus:border-amber-500/50 outline-none resize-none h-16"
      />
      <textarea
        placeholder="Needs improvement..."
        value={notes.needsImprovement}
        onChange={e => setNotes(n => ({ ...n, needsImprovement: e.target.value }))}
        className="w-full bg-zinc-800 rounded-lg p-2 text-slate-900 text-xs border border-zinc-700 focus:border-amber-500/50 outline-none resize-none h-16"
      />
      <button
        onClick={() => createEval.mutate({ staffId, evaluatorId, evaluatedAt: new Date(), ...scores, ...notes })}
        disabled={createEval.isPending}
        className="w-full py-2 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition-all disabled:opacity-50"
      >
        {createEval.isPending ? "Saving..." : "Submit Evaluation"}
      </button>
    </div>
  );
}

// ─── Write-Up Form ───
function WriteUpForm({ staffId, issuedById, onDone }: { staffId: number; issuedById: number; onDone: () => void }) {
  const [severity, setSeverity] = useState<"verbal" | "written" | "final" | "termination">("verbal");
  const [category, setCategory] = useState<"attendance" | "performance" | "conduct" | "safety" | "policy">("performance");
  const [description, setDescription] = useState("");

  const createWriteUp = trpc.writeUps.create.useMutation({
    onSuccess: () => { toast.success("Write-up issued"); onDone(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="bg-white rounded-xl p-4 border border-red-500/20 space-y-3">
      <p className="text-red-500 text-xs font-semibold">Issue Write-Up</p>
      <div>
        <p className="text-slate-500 text-[10px] mb-1">Severity</p>
        <div className="flex gap-1">
          {(["verbal", "written", "final", "termination"] as const).map(s => {
            const cfg = SEVERITY_CONFIG[s];
            return (
              <button
                key={s}
                onClick={() => setSeverity(s)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                  severity === s ? `${cfg.bg} ${cfg.color} border border-current` : "bg-zinc-800 text-slate-500"
                }`}
              >
                {cfg.label.split(" ")[0]}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="text-slate-500 text-[10px] mb-1">Category</p>
        <div className="flex gap-1 flex-wrap">
          {(["attendance", "performance", "conduct", "safety", "policy"] as const).map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                category === c ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" : "bg-zinc-800 text-slate-500"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <textarea
        placeholder="Describe the incident..."
        value={description}
        onChange={e => setDescription(e.target.value)}
        className="w-full bg-zinc-800 rounded-lg p-2 text-slate-900 text-xs border border-zinc-700 focus:border-red-500/50 outline-none resize-none h-20"
      />
      <button
        onClick={() => description.trim() && createWriteUp.mutate({ staffId, issuedById, issuedAt: new Date(), severity, category, description })}
        disabled={!description.trim() || createWriteUp.isPending}
        className="w-full py-2 rounded-xl bg-red-500 text-slate-900 font-bold text-sm hover:bg-red-400 transition-all disabled:opacity-50"
      >
        {createWriteUp.isPending ? "Issuing..." : "Issue Write-Up"}
      </button>
    </div>
  );
}

// ─── Stat Box ───
function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
      <p className="text-slate-500 text-[8px]">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  );
}
