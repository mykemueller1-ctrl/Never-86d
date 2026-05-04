/**
 * Knowledge Brain — Station-aware AI chat for CTAP workers
 * Ask anything about recipes, POS, storage, prep, procedures
 * Context-aware: knows time of day, station, and who's asking
 */
import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Send, Sparkles, ChevronLeft, Loader2,
  ThumbsUp, ThumbsDown, Clock, MapPin,
  Flame, Coffee, Truck, Users, ShieldAlert,
  BookOpen, ChefHat, GlassWater, Pizza,
} from "lucide-react";
import type { SafeStaff } from "../../../shared/types";

type Station = "pizza_line" | "fry_line" | "bar" | "waitstaff" | "bbq_room" | "store_room" | "dish_pit" | "general";

const STATION_CONFIG: Record<Station, { label: string; icon: any; color: string; bg: string; prompts: string[] }> = {
  pizza_line: {
    label: "Pizza Line", icon: Pizza, color: "text-red-500", bg: "bg-red-500/10",
    prompts: ["How do I make a Community Special?", "What temp for the pizza oven?", "Where are the GF crusts?", "How much cheese on a large?"],
  },
  fry_line: {
    label: "Fry Line", icon: Flame, color: "text-orange-500", bg: "bg-orange-500/10",
    prompts: ["Fry time for chicken strips?", "How to make Nashville Hot sauce?", "What oil temp for fries?", "Wing sauce portions?"],
  },
  bar: {
    label: "Bar", icon: GlassWater, color: "text-blue-500", bg: "bg-blue-500/10",
    prompts: ["Recipe for a Moscow Mule?", "How to close out bar tabs?", "Where's the Tito's kept?", "What's in a Community Sunset?"],
  },
  waitstaff: {
    label: "Waitstaff", icon: Users, color: "text-purple-500", bg: "bg-purple-500/10",
    prompts: ["How to split a check on POS?", "What's 86'd right now?", "Side options for steaks?", "How to handle a comp?"],
  },
  bbq_room: {
    label: "BBQ Room", icon: Flame, color: "text-amber-600", bg: "bg-amber-600/10",
    prompts: ["Brisket internal temp?", "How long to smoke ribs?", "Where's the rub recipe?", "Pulled pork portions?"],
  },
  store_room: {
    label: "Store Room", icon: BookOpen, color: "text-emerald-500", bg: "bg-emerald-500/10",
    prompts: ["Where's the mozzarella stored?", "PFG delivery day?", "Par level for pizza boxes?", "How to check in a delivery?"],
  },
  dish_pit: {
    label: "Dish Pit", icon: Coffee, color: "text-cyan-500", bg: "bg-cyan-500/10",
    prompts: ["Sanitizer concentration?", "Machine cycle time?", "Where do bus tubs go?", "Chemical safety?"],
  },
  general: {
    label: "General", icon: Sparkles, color: "text-amber-500", bg: "bg-amber-500/10",
    prompts: ["What's on the menu?", "Who's the bar manager?", "How to clock in?", "What are today's specials?"],
  },
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  station?: string;
  sourcesUsed?: number;
  entryId?: number;
}

export default function KnowledgeBrain({ staffUser, onBack }: { staffUser: SafeStaff; onBack: () => void }) {
  const [station, setStation] = useState<Station | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [showCorrection, setShowCorrection] = useState<number | null>(null);
  const [correctionText, setCorrectionText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const askBrain = trpc.knowledge.ask.useMutation();
  const submitCorrection = trpc.knowledge.correct.useMutation();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-detect station from department
  useEffect(() => {
    if (staffUser.department === "bar") setStation("bar");
    else if (staffUser.department === "kitchen_line") setStation("fry_line");
    else if (staffUser.department === "pizza_side") setStation("pizza_line");
    else if (staffUser.department === "dining_room") setStation("waitstaff");
    else if (staffUser.department === "dishwasher") setStation("dish_pit");
    else if (staffUser.department === "driver") setStation("general");
    else setStation("general");
  }, [staffUser]);

  const handleSend = async (question?: string) => {
    const q = question || input.trim();
    if (!q || isAsking) return;

    setInput("");
    setMessages(prev => [...prev, { role: "user", content: q }]);
    setIsAsking(true);

    try {
      const result = await askBrain.mutateAsync({
        question: q,
        station: station || "general",
        staffName: staffUser.firstName,
      });
      setMessages(prev => [...prev, {
        role: "assistant",
        content: typeof result.answer === "string" ? result.answer : String(result.answer),
        station: result.station,
        sourcesUsed: result.sourcesUsed,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I couldn't find an answer right now. Try asking a manager.",
      }]);
    } finally {
      setIsAsking(false);
    }
  };

  const handleCorrection = async (msgIndex: number) => {
    if (!correctionText.trim()) return;
    try {
      await submitCorrection.mutateAsync({
        entryId: 0, // Will be matched server-side
        correctedByStaffId: staffUser.id,
        oldAnswer: messages[msgIndex].content,
        newAnswer: correctionText,
        reason: "Worker correction from chat",
      });
      toast.success("Correction submitted! +10 pts 🎉");
      setShowCorrection(null);
      setCorrectionText("");
    } catch {
      toast.error("Couldn't submit correction");
    }
  };

  const hour = new Date().getHours();
  const timeContext = hour < 11 ? "morning prep" : hour < 14 ? "lunch rush" : hour < 17 ? "afternoon" : hour < 21 ? "dinner rush" : "closing";

  // Station picker
  if (!station) {
    return (
      <div className="h-screen bg-black flex flex-col">
        <div className="p-4 flex items-center gap-3 border-b border-zinc-900">
          <button onClick={onBack} className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center">
            <ChevronLeft size={14} className="text-zinc-400" />
          </button>
          <div>
            <h1 className="text-lg font-black text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>KNOWLEDGE BRAIN</h1>
            <p className="text-zinc-500 text-[10px]">Pick your station</p>
          </div>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
          {(Object.entries(STATION_CONFIG) as [Station, typeof STATION_CONFIG[Station]][]).map(([key, cfg]) => (
            <button key={key} onClick={() => setStation(key)} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/30 transition-all">
              <div className={`w-10 h-10 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                <cfg.icon size={18} className={cfg.color} />
              </div>
              <span className="text-white text-xs font-medium">{cfg.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const stationCfg = STATION_CONFIG[station];

  return (
    <div className="h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="p-4 pb-2 flex items-center gap-3 border-b border-zinc-900">
        <button onClick={onBack} className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0">
          <ChevronLeft size={14} className="text-zinc-400" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-black text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>KNOWLEDGE BRAIN</h1>
          <div className="flex items-center gap-2 text-[10px]">
            <button onClick={() => setStation(null)} className="flex items-center gap-1 text-amber-500 hover:text-amber-400">
              <MapPin size={8} />{stationCfg.label} ▾
            </button>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-500 flex items-center gap-1"><Clock size={8} />{timeContext}</span>
          </div>
        </div>
        <div className={`w-8 h-8 rounded-lg ${stationCfg.bg} flex items-center justify-center shrink-0`}>
          <stationCfg.icon size={14} className={stationCfg.color} />
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className={`w-14 h-14 rounded-2xl ${stationCfg.bg} flex items-center justify-center mb-3`}>
              <Sparkles size={24} className="text-amber-500" />
            </div>
            <p className="text-white font-semibold text-sm mb-1">Ask me anything</p>
            <p className="text-zinc-500 text-[10px] text-center mb-4">Recipes, POS, storage, prep — I know this restaurant</p>
            <div className="grid grid-cols-1 gap-2 w-full">
              {stationCfg.prompts.map((prompt, i) => (
                <button key={i} onClick={() => handleSend(prompt)} className="text-left p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-amber-500/30 transition-all">
                  <span className="text-zinc-300 text-xs">{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-xl p-3 ${msg.role === "user" ? "bg-amber-500 text-black" : "bg-zinc-900 border border-zinc-800 text-white"}`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              {msg.role === "assistant" && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-800">
                  {msg.sourcesUsed !== undefined && msg.sourcesUsed > 0 && (
                    <span className="text-zinc-500 text-[9px]">{msg.sourcesUsed} sources</span>
                  )}
                  <div className="flex-1" />
                  <button onClick={() => toast.success("Thanks! 👍")} className="text-zinc-600 hover:text-green-500 transition-colors">
                    <ThumbsUp size={10} />
                  </button>
                  <button onClick={() => setShowCorrection(showCorrection === i ? null : i)} className="text-zinc-600 hover:text-red-500 transition-colors">
                    <ThumbsDown size={10} />
                  </button>
                </div>
              )}
              {showCorrection === i && (
                <div className="mt-2 pt-2 border-t border-zinc-800">
                  <p className="text-amber-500 text-[9px] mb-1 font-semibold">What's the correct answer? (+10 pts)</p>
                  <textarea
                    value={correctionText}
                    onChange={e => setCorrectionText(e.target.value)}
                    className="w-full bg-zinc-800 rounded-lg p-2 text-xs text-white resize-none border border-zinc-700 focus:border-amber-500 outline-none"
                    rows={2}
                    placeholder="Type the correct answer..."
                  />
                  <button onClick={() => handleCorrection(i)} className="mt-1 px-3 py-1 rounded-lg bg-amber-500 text-black text-[10px] font-bold">
                    Submit Correction
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isAsking && (
          <div className="flex justify-start">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center gap-2">
              <Loader2 size={12} className="text-amber-500 animate-spin" />
              <span className="text-zinc-400 text-xs">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 pt-2 border-t border-zinc-900">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={`Ask about ${stationCfg.label.toLowerCase()}...`}
            className="flex-1 bg-zinc-900 rounded-xl px-4 py-3 text-sm text-white border border-zinc-800 focus:border-amber-500 outline-none placeholder:text-zinc-600"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isAsking}
            className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center disabled:opacity-30 transition-opacity"
          >
            <Send size={16} className="text-black" />
          </button>
        </div>
      </div>
    </div>
  );
}
