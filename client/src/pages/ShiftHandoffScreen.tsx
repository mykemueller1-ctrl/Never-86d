/**
 * Shift Handoff Screen
 * 
 * Two modes:
 * 1. WRITE mode — outgoing shift writes end-of-shift notes
 * 2. READ mode — incoming shift reads the structured handoff
 * 
 * The AI structures raw notes into categories:
 * 86'd items, prep status, equipment issues, customer notes, staffing notes
 */
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  ChevronLeft, Send, Loader2, AlertTriangle,
  CheckCircle2, Clock, ChefHat, Wrench,
  Users, MessageSquare, Sparkles, ArrowRight,
  FileText, Zap
} from "lucide-react";
import type { SafeStaff } from "../../../shared/types";

type Props = {
  staffUser: SafeStaff;
  onBack: () => void;
};

type HandoffCategory = {
  key: string;
  label: string;
  icon: any;
  color: string;
  bg: string;
};

const HANDOFF_CATEGORIES: HandoffCategory[] = [
  { key: "eightySixed", label: "86'd Items", icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10" },
  { key: "prepStatus", label: "Prep Status", icon: ChefHat, color: "text-amber-400", bg: "bg-amber-500/10" },
  { key: "equipment", label: "Equipment", icon: Wrench, color: "text-blue-400", bg: "bg-blue-500/10" },
  { key: "customers", label: "Customer Notes", icon: MessageSquare, color: "text-purple-400", bg: "bg-purple-500/10" },
  { key: "staffing", label: "Staffing", icon: Users, color: "text-green-400", bg: "bg-green-500/10" },
  { key: "other", label: "Other", icon: FileText, color: "text-slate-500", bg: "bg-zinc-500/10" },
];

type HandoffData = Record<string, string[]>;

export default function ShiftHandoffScreen({ staffUser, onBack }: Props) {
  const [mode, setMode] = useState<"choose" | "write" | "read">("choose");
  const [notes, setNotes] = useState("");
  const [structuredData, setStructuredData] = useState<HandoffData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Quick-add buttons for common notes
  const quickNotes = [
    "86'd: ", "Low on: ", "Equipment issue: ", "VIP table: ",
    "Prep needed: ", "Closing note: ", "Staff called off: ",
  ];

  const createMemory = trpc.briefingMemory.create.useMutation();
  const memoriesQuery = trpc.briefingMemory.relevant.useQuery(undefined, {
    enabled: mode === "read",
  });

  // Parse the latest handoff from briefing memories
  const latestHandoff = useMemo(() => {
    if (!memoriesQuery.data) return null;
    const handoffMemories = memoriesQuery.data.filter(m =>
      m.sourceType === "shift_handoff"
    );
    if (handoffMemories.length === 0) return null;

    // Group by factType
    const grouped: HandoffData = {};
    for (const m of handoffMemories) {
      const key = m.factType;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m.fact);
    }
    return grouped;
  }, [memoriesQuery.data]);

  // AI-structure the raw notes
  const processNotes = async () => {
    if (!notes.trim()) {
      toast.error("Write some notes first");
      return;
    }
    setIsProcessing(true);
    try {
      // Use the knowledge.ask endpoint to structure notes via AI
      // We'll structure them client-side into categories and save as briefing memories
      const categories: HandoffData = {
        eightySixed: [],
        prepStatus: [],
        equipment: [],
        customers: [],
        staffing: [],
        other: [],
      };

      // Simple keyword-based categorization (fast, no AI needed for basic notes)
      const lines = notes.split("\n").filter(l => l.trim());
      for (const line of lines) {
        const lower = line.toLowerCase();
        if (lower.includes("86") || lower.includes("out of") || lower.includes("ran out")) {
          categories.eightySixed.push(line.trim());
        } else if (lower.includes("prep") || lower.includes("cut") || lower.includes("make") || lower.includes("dough") || lower.includes("sauce")) {
          categories.prepStatus.push(line.trim());
        } else if (lower.includes("equipment") || lower.includes("broken") || lower.includes("fix") || lower.includes("oven") || lower.includes("fridge") || lower.includes("cooler")) {
          categories.equipment.push(line.trim());
        } else if (lower.includes("customer") || lower.includes("vip") || lower.includes("complaint") || lower.includes("table") || lower.includes("regular")) {
          categories.customers.push(line.trim());
        } else if (lower.includes("staff") || lower.includes("called") || lower.includes("shift") || lower.includes("cover") || lower.includes("late")) {
          categories.staffing.push(line.trim());
        } else {
          categories.other.push(line.trim());
        }
      }

      setStructuredData(categories);

      // Save each non-empty category as a briefing memory
      const factTypeMap: Record<string, "shortage" | "equipment_issue" | "staff_pattern" | "custom" | "event_pattern"> = {
        eightySixed: "shortage",
        prepStatus: "custom",
        equipment: "equipment_issue",
        customers: "event_pattern",
        staffing: "staff_pattern",
        other: "custom",
      };

      for (const [key, items] of Object.entries(categories)) {
        if (items.length === 0) continue;
        for (const item of items) {
          await createMemory.mutateAsync({
            factType: factTypeMap[key] || "custom",
            fact: item,
            relevanceScore: key === "eightySixed" ? 90 : key === "equipment" ? 80 : 60,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // expires in 24h
            sourceType: "shift_handoff",
          });
        }
      }

      setSubmitted(true);
      toast.success("Handoff notes saved — next shift will see them!");
    } catch (err) {
      toast.error("Failed to process notes");
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── Choose Mode ──────────────────────────────────────
  if (mode === "choose") {
    return (
      <div className="h-screen bg-slate-50 flex flex-col overflow-y-auto pb-20">
        <div className="p-3 border-b border-zinc-900 flex items-center gap-2">
          <button onClick={onBack} className="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
            <ChevronLeft size={14} className="text-slate-500" />
          </button>
          <div>
            <h2 className="text-slate-900 font-black text-sm" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.04em" }}>
              SHIFT HANDOFF
            </h2>
            <p className="text-slate-500 text-[9px]">Pass the torch to the next crew</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center mb-2">
            <Zap size={28} className="text-amber-500" />
          </div>

          <button
            onClick={() => setMode("write")}
            className="w-full max-w-xs bg-gradient-to-r from-amber-500/20 to-amber-600/10 rounded-xl p-5 border border-amber-500/30 hover:border-amber-500/50 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <Send size={20} className="text-amber-500 shrink-0" />
              <div>
                <h3 className="text-slate-900 font-bold text-sm">End My Shift</h3>
                <p className="text-slate-500 text-[10px] mt-0.5">Write handoff notes for the next crew</p>
              </div>
              <ArrowRight size={14} className="text-amber-500 ml-auto" />
            </div>
          </button>

          <button
            onClick={() => setMode("read")}
            className="w-full max-w-xs bg-white rounded-xl p-5 border border-slate-200 hover:border-amber-500/30 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <FileText size={20} className="text-blue-400 shrink-0" />
              <div>
                <h3 className="text-slate-900 font-bold text-sm">Read Handoff</h3>
                <p className="text-slate-500 text-[10px] mt-0.5">See what the last shift left for you</p>
              </div>
              <ArrowRight size={14} className="text-slate-500 ml-auto" />
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ─── Write Mode ──────────────────────────────────────
  if (mode === "write") {
    if (submitted && structuredData) {
      return (
        <div className="h-screen bg-slate-50 flex flex-col overflow-y-auto pb-20">
          <div className="p-3 border-b border-zinc-900 flex items-center gap-2">
            <button onClick={onBack} className="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
              <ChevronLeft size={14} className="text-slate-500" />
            </button>
            <div>
              <h2 className="text-slate-900 font-black text-sm" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>HANDOFF SAVED</h2>
              <p className="text-slate-500 text-[9px]">Next shift will see this</p>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20 text-center">
              <CheckCircle2 size={32} className="text-green-500 mx-auto mb-2" />
              <p className="text-green-400 font-bold text-sm">Handoff Complete</p>
              <p className="text-slate-500 text-xs mt-1">Your notes have been structured and saved</p>
            </div>
            {HANDOFF_CATEGORIES.map(cat => {
              const items = structuredData[cat.key] || [];
              if (items.length === 0) return null;
              return (
                <div key={cat.key} className={`${cat.bg} rounded-xl p-3 border border-slate-200`}>
                  <div className="flex items-center gap-2 mb-2">
                    <cat.icon size={14} className={cat.color} />
                    <span className={`${cat.color} text-xs font-bold`}>{cat.label}</span>
                    <span className="text-slate-500 text-[9px]">({items.length})</span>
                  </div>
                  {items.map((item, i) => (
                    <p key={i} className="text-slate-900 text-xs ml-5 mb-1">• {item}</p>
                  ))}
                </div>
              );
            })}
            <button onClick={onBack} className="w-full py-3 rounded-xl bg-amber-500 text-black font-bold text-sm">
              Done — Clock Out
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="h-screen bg-slate-50 flex flex-col overflow-y-auto pb-20">
        <div className="p-3 border-b border-zinc-900 flex items-center gap-2">
          <button onClick={() => setMode("choose")} className="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
            <ChevronLeft size={14} className="text-slate-500" />
          </button>
          <div>
            <h2 className="text-slate-900 font-black text-sm" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>END OF SHIFT NOTES</h2>
            <p className="text-slate-500 text-[9px]">What does the next crew need to know?</p>
          </div>
        </div>

        <div className="p-4 space-y-3 flex-1">
          {/* Quick-add buttons */}
          <div className="flex flex-wrap gap-1.5">
            {quickNotes.map((qn, i) => (
              <button
                key={i}
                onClick={() => setNotes(prev => prev + (prev && !prev.endsWith("\n") ? "\n" : "") + qn)}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 text-[9px] hover:border-amber-500/30 hover:text-amber-400 transition-all"
              >
                {qn.replace(": ", "")}
              </button>
            ))}
          </div>

          {/* Notes textarea */}
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Write your shift notes here...\n\nExamples:\n• 86'd: pepperoni, ranch\n• Low on pizza dough — need to make more\n• Oven 2 running hot, set 25° lower\n• VIP table 12 — regular, comp their appetizer\n• Jake called off tomorrow, need cover"
            className="w-full h-64 bg-white border border-slate-200 rounded-xl p-4 text-slate-900 text-sm placeholder:text-slate-400 resize-none focus:outline-none focus:border-amber-500/50"
          />

          <div className="flex items-center gap-2 text-slate-500 text-[9px]">
            <Sparkles size={10} className="text-amber-500" />
            <span>Notes will be auto-categorized for the next shift</span>
          </div>

          <button
            onClick={processNotes}
            disabled={isProcessing || !notes.trim()}
            className="w-full py-3 rounded-xl bg-amber-500 text-black font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send size={14} />
                Submit Handoff
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ─── Read Mode ──────────────────────────────────────
  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-y-auto pb-20">
      <div className="p-3 border-b border-zinc-900 flex items-center gap-2">
        <button onClick={() => setMode("choose")} className="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
          <ChevronLeft size={14} className="text-slate-500" />
        </button>
        <div>
          <h2 className="text-slate-900 font-black text-sm" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>SHIFT HANDOFF</h2>
          <p className="text-slate-500 text-[9px]">Notes from the last crew</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {memoriesQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="text-amber-500 animate-spin" />
          </div>
        ) : !latestHandoff || Object.values(latestHandoff).every(v => v.length === 0) ? (
          <div className="text-center py-12">
            <FileText size={32} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No handoff notes</p>
            <p className="text-zinc-600 text-xs mt-1">The previous shift didn't leave any notes</p>
          </div>
        ) : (
          <>
            {/* Map factTypes to display categories */}
            {(() => {
              const factTypeToCategory: Record<string, HandoffCategory> = {
                shortage: HANDOFF_CATEGORIES[0],      // 86'd
                custom: HANDOFF_CATEGORIES[1],         // Prep / Other
                equipment_issue: HANDOFF_CATEGORIES[2], // Equipment
                event_pattern: HANDOFF_CATEGORIES[3],  // Customers
                staff_pattern: HANDOFF_CATEGORIES[4],  // Staffing
              };

              return Object.entries(latestHandoff).map(([factType, items]) => {
                if (items.length === 0) return null;
                const cat = factTypeToCategory[factType] || HANDOFF_CATEGORIES[5];
                return (
                  <div key={factType} className={`${cat.bg} rounded-xl p-3 border border-slate-200`}>
                    <div className="flex items-center gap-2 mb-2">
                      <cat.icon size={14} className={cat.color} />
                      <span className={`${cat.color} text-xs font-bold`}>{cat.label}</span>
                      <span className="text-slate-500 text-[9px]">({items.length})</span>
                    </div>
                    {items.map((item, i) => (
                      <p key={i} className="text-slate-900 text-xs ml-5 mb-1">• {item}</p>
                    ))}
                  </div>
                );
              });
            })()}

            <div className="bg-white rounded-xl p-3 border border-slate-200 flex items-center gap-2">
              <Clock size={12} className="text-slate-500" />
              <span className="text-slate-500 text-[9px]">Notes expire after 24 hours</span>
            </div>
          </>
        )}

        <button onClick={onBack} className="w-full py-3 rounded-xl bg-white border border-slate-200 text-slate-900 font-bold text-sm">
          Back to Home
        </button>
      </div>
    </div>
  );
}
