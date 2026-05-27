/**
 * AI-Native Intelligence Screens
 * Ask Brain, Photo Missions, Achievements, Rewards Shop
 * Night Shift Design System — amber-only, surfaces over borders
 */
import { useState, useRef, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { SafeStaff } from "../../../shared/types";
import {
  Brain, Camera, Trophy, Gift, Send, ChevronLeft,
  Target, Lock, CheckCircle2,
  Loader2, Award, ShoppingBag,
  MessageSquare, Zap
} from "lucide-react";

// ─── Shared Header ─────────────────────────────────────────────
function ScreenHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack: () => void }) {
  return (
    <div className="px-6 pt-10 pb-4">
      <button onClick={onBack} className="text-amber-500 type-caption mb-3 flex items-center gap-1 hover:text-amber-400 transition-colors">
        <ChevronLeft size={16} /> Back
      </button>
      <h2 className="type-display text-slate-900">{title}</h2>
      {subtitle && <p className="type-caption text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ─── ASK BRAIN ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
export function AskBrainScreen({ staffUser, station, onBack }: { staffUser: SafeStaff; station?: string; onBack: () => void }) {
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai"; text: string; sources?: number }[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const askBrain = trpc.knowledge.ask.useMutation();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatHistory]);

  const handleAsk = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!question.trim() || isAsking || askBrain.isPending) return;
    const q = question.trim();
    setQuestion("");
    setChatHistory(prev => [...prev, { role: "user", text: q }]);
    setIsAsking(true);
    try {
      const result = await askBrain.mutateAsync({ question: q, station: station || "general" });
      setChatHistory(prev => [...prev, { role: "ai", text: typeof result.answer === "string" ? result.answer : String(result.answer), sources: result.sourcesUsed }]);
    } catch {
      setChatHistory(prev => [...prev, { role: "ai", text: "Sorry, I couldn't process that. Try asking differently." }]);
    }
    setIsAsking(false);
  };

  const quickQuestions = station === "pizza_line"
    ? ["How much cheese goes on a large pizza?", "What temp is the deck oven set at?", "How do I make pizza dough from scratch?"]
    : station === "fry_line"
    ? ["What temperature should the fryer be at?", "What wing flavors do we have?", "How do I know when to change the fryer oil?"]
    : station === "bar"
    ? ["How do I make a Bloody Mary?", "What's our well vodka?", "How do I split a check on PDQ?"]
    : station === "expo"
    ? ["What's the food allergy procedure?", "How do I handle a food complaint?", "What are the food safe temps?"]
    : ["What did we do in sales yesterday?", "Who do I call about a broken keg?", "What does 86'd mean?"];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-slate-50 screen-enter overscroll-contain">
      <ScreenHeader title="ASK THE BRAIN" subtitle={station ? `Station: ${station.replace("_", " ")}` : "General knowledge"} onBack={onBack} />

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-6 space-y-3 pb-48">
        {chatHistory.length === 0 && (
          <div className="text-center py-8">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
              <Brain size={24} className="text-amber-500" />
            </div>
            <h3 className="text-slate-900 font-semibold type-body mb-1">What do you need to know?</h3>
            <p className="type-caption text-slate-500 mb-5">Recipes, procedures, vendors — anything about the restaurant.</p>
            <div className="space-y-2">
              {quickQuestions.map((q, i) => (
                <button key={i} onClick={() => setQuestion(q)}
                  className="w-full text-left px-4 py-3 rounded-xl surface-interactive type-caption text-slate-600">
                  <MessageSquare size={12} className="inline mr-2 text-amber-500" />{q}
                </button>
              ))}
            </div>
          </div>
        )}
        {chatHistory.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-xl px-4 py-2.5 type-body ${
              msg.role === "user" ? "bg-amber-500 text-black" : "surface-base text-slate-700"
            }`}>
              {msg.text}
              {msg.sources !== undefined && msg.sources > 0 && (
                <div className="mt-1 type-micro text-slate-500">{msg.sources} source{msg.sources > 1 ? "s" : ""} used</div>
              )}
            </div>
          </div>
        ))}
        {isAsking && (
          <div className="flex justify-start">
            <div className="surface-base rounded-xl px-4 py-2.5 type-body text-slate-500 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-amber-500" /> Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleAsk} className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] left-0 right-0 z-[60] px-6 py-4 nav-glass border-t border-slate-200">
        <div className="flex gap-2.5">
          <input value={question} onChange={e => setQuestion(e.target.value)}
            placeholder="Ask anything..."
            className="flex-1 bg-zinc-800/50 rounded-xl px-4 py-3 type-body text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500/30" />
          <button type="submit" disabled={!question.trim() || isAsking || askBrain.isPending}
            className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center disabled:opacity-40 glow-amber transition-all active:scale-95">
            {isAsking || askBrain.isPending ? <Loader2 size={16} className="animate-spin text-black" /> : <Send size={16} className="text-black" />}
          </button>
        </div>
      </form>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ─── PHOTO MISSIONS ────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
export function PhotoMissionsScreen({ staffUser, onBack }: { staffUser: SafeStaff; onBack: () => void }) {
  const missions = trpc.missions.active.useQuery();
  const myPhotos = trpc.photos.mySubmissions.useQuery();
  const analyzePhoto = trpc.photos.analyze.useMutation();
  const uploadPhoto = trpc.upload.receiptPhoto.useMutation();
  const [selectedMission, setSelectedMission] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoCapture = async (missionId: number) => {
    setSelectedMission(missionId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedMission) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const uploadResult = await uploadPhoto.mutateAsync({
        base64, filename: `mission-${selectedMission}-${Date.now()}.${file.name.split(".").pop() || "jpg"}`,
        mimeType: file.type || "image/jpeg", context: "issue" as const,
      });
      const mission = missions.data?.find((m: any) => m.id === selectedMission);
      const photoType = (mission?.category || "station") as "invoice" | "shelf" | "station" | "equipment" | "plate" | "delivery" | "prep" | "other";
      await analyzePhoto.mutateAsync({ photoUrl: uploadResult.url, photoType, staffId: staffUser.id, missionId: selectedMission });
      toast.success("Photo submitted & analyzed! +5 pts");
      myPhotos.refetch();
    } catch { toast.error("Upload failed. Try again."); }
    setUploading(false);
    setSelectedMission(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-[100dvh] overflow-y-auto overscroll-contain bg-slate-50 pb-32 screen-enter">
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
      <ScreenHeader title="PHOTO MISSIONS" subtitle="Earn points by documenting the restaurant" onBack={onBack} />

      {/* Stats */}
      <div className="px-6 mb-4">
        <div className="surface-base p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="type-micro text-slate-500">Photos Submitted</p>
              <p className="text-xl font-semibold text-slate-900 font-data">{myPhotos.data?.length || 0}</p>
            </div>
            <div className="text-right">
              <p className="type-micro text-slate-500">Points Earned</p>
              <p className="text-xl font-semibold text-amber-500 font-data">{(myPhotos.data?.length || 0) * 5}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Missions */}
      <div className="px-6 space-y-3">
        <p className="type-micro text-zinc-600">Active Missions</p>
        {missions.isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 size={20} className="text-amber-500 animate-spin" /></div>
        ) : missions.isError ? (
          <div className="surface-base p-5 text-center">
            <p className="type-body text-red-300 font-medium">Photo missions unavailable</p>
            <p className="type-caption text-slate-500 mt-1">Refresh the page or ask a manager to confirm missions are enabled.</p>
          </div>
        ) : !missions.data || missions.data.length === 0 ? (
          <div className="surface-base p-5 text-center">
            <Camera size={22} className="text-zinc-600 mx-auto mb-3" />
            <p className="type-body text-slate-500 font-medium">No active missions right now</p>
            <p className="type-caption text-zinc-600 mt-1">When managers create photo missions, they will appear here.</p>
          </div>
        ) : (
          missions.data.map((mission: any) => (
            <div key={mission.id} className="surface-base p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="type-body font-semibold text-slate-900">{mission.name}</h4>
                  <p className="type-caption text-slate-500 mt-0.5">{mission.description}</p>
                </div>
                <span className="type-caption font-semibold text-amber-500 font-data">+{mission.pointsPerPhoto}</span>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-1.5">
                  <Target size={12} className="text-zinc-600" />
                  <span className="type-caption text-slate-500">{mission.targetPhotoCount} photos needed</span>
                </div>
                <button onClick={() => handlePhotoCapture(mission.id)} disabled={uploading && selectedMission === mission.id}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-black type-caption font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-all active:scale-95">
                  {uploading && selectedMission === mission.id
                    ? <><Loader2 size={12} className="animate-spin" /> Uploading...</>
                    : <><Camera size={12} /> Take Photo</>}
                </button>
              </div>
              {mission.bonusPoints > 0 && (
                <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-amber-500/5">
                  <span className="type-micro text-amber-500">Complete all {mission.targetPhotoCount} for +{mission.bonusPoints} bonus</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ─── ACHIEVEMENTS ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
export function AchievementsScreen({ staffUser, onBack }: { staffUser: SafeStaff; onBack: () => void }) {
  const definitions = trpc.achievements.definitions.useQuery();
  const progress = trpc.achievements.myProgress.useQuery();

  const getProgress = (achievementId: number) => progress.data?.find((p: any) => p.achievementId === achievementId);
  const isUnlocked = (achievementId: number) => getProgress(achievementId)?.status === "completed";
  const progressPercent = (def: any) => {
    const p = getProgress(def.id);
    if (!p) return 0;
    return Math.min(100, Math.round((p.currentValue / def.thresholdValue) * 100));
  };

  const categoryOrder = ["onboarding", "reliability", "quality", "engagement", "leadership", "longevity"];
  const categoryLabels: Record<string, string> = {
    onboarding: "Getting Started", reliability: "Reliability", quality: "Quality",
    engagement: "Engagement", leadership: "Leadership", longevity: "Longevity",
  };

  const groupedDefs = useMemo(() => categoryOrder.map(cat => ({
    category: cat, label: categoryLabels[cat] || cat,
    achievements: (definitions.data || []).filter((d: any) => d.category === cat),
  })).filter(g => g.achievements.length > 0), [definitions.data]);

  const totalEarned = (definitions.data || []).filter((d: any) => isUnlocked(d.id)).length;
  const totalAvailable = definitions.data?.length || 0;

  return (
    <div className="h-screen overflow-y-auto bg-slate-50 pb-24 screen-enter">
      <ScreenHeader title="ACHIEVEMENTS" subtitle={`${totalEarned} of ${totalAvailable} earned`} onBack={onBack} />

      {/* Summary */}
      <div className="px-6 mb-4">
        <div className="surface-base p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Trophy size={22} className="text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold text-slate-900 font-data">{totalEarned} <span className="text-slate-500 type-caption font-normal">of {totalAvailable}</span></p>
              <p className="type-caption text-slate-500">achievements unlocked</p>
            </div>
            <div className="text-right">
              <p className="type-body font-semibold text-amber-500 font-data">{staffUser.totalPoints || 0}</p>
              <p className="type-micro text-zinc-600">total pts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Achievement Groups */}
      <div className="px-6 space-y-5">
        {definitions.isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 size={20} className="text-amber-500 animate-spin" /></div>
        ) : (
          groupedDefs.map(group => (
            <div key={group.category}>
              <p className="type-micro text-zinc-600 mb-2">{group.label}</p>
              <div className="space-y-2">
                {group.achievements.map((def: any) => {
                  const unlocked = isUnlocked(def.id);
                  const pct = progressPercent(def);
                  const prog = getProgress(def.id);
                  return (
                    <div key={def.id} className={`rounded-xl p-4 transition-all ${unlocked ? 'bg-amber-500/5 ring-1 ring-amber-500/15' : 'surface-base'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${unlocked ? 'bg-amber-500/15' : 'bg-zinc-800 grayscale opacity-50'}`}>
                          {def.badge}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className={`type-body font-semibold ${unlocked ? 'text-amber-500' : 'text-slate-900'}`}>{def.name}</h4>
                            {unlocked && <CheckCircle2 size={14} className="text-amber-500" />}
                            {!unlocked && pct >= 80 && <Zap size={14} className="text-amber-500 animate-pulse" />}
                          </div>
                          <p className="type-caption text-slate-500">{def.description}</p>
                          {!unlocked && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="type-micro text-zinc-600 font-data">{prog?.currentValue || 0}/{def.thresholdValue}</span>
                                <span className="type-micro text-zinc-600 font-data">{pct}%</span>
                              </div>
                              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${pct >= 80 ? 'bg-amber-500' : 'bg-zinc-600'}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          )}
                        </div>
                        {unlocked && (
                          <div className="text-right">
                            <span className="type-caption text-amber-500 font-semibold font-data">+{def.bonusPoints}</span>
                            <p className="type-micro text-zinc-600">pts</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ─── REWARDS SHOP ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
export function RewardsShopScreen({ staffUser, onBack }: { staffUser: SafeStaff; onBack: () => void }) {
  const rewards = trpc.rewards.list.useQuery();
  const redeem = trpc.rewards.redeem.useMutation();
  const myRedemptions = trpc.rewards.myRedemptions.useQuery();
  const [redeeming, setRedeeming] = useState<number | null>(null);
  const currentPoints = staffUser.totalPoints || 0;

  const handleRedeem = async (rewardId: number, pointsCost: number) => {
    if (currentPoints < pointsCost) { toast.error("Not enough points!"); return; }
    setRedeeming(rewardId);
    try {
      await redeem.mutateAsync({ staffId: staffUser.id, rewardId, pointsSpent: pointsCost });
      toast.success("Reward redeemed! A manager will approve it.");
      myRedemptions.refetch();
    } catch (err: any) { toast.error(err.message || "Redemption failed"); }
    setRedeeming(null);
  };

  const tierOrder = ["bronze", "silver", "gold", "platinum", "diamond", "legend"];
  const groupedRewards = useMemo(() => tierOrder.map(tier => ({
    tier, rewards: (rewards.data || []).filter((r: any) => r.tier === tier),
  })).filter(g => g.rewards.length > 0), [rewards.data]);

  return (
    <div className="h-screen overflow-y-auto bg-slate-50 pb-24 screen-enter">
      <ScreenHeader title="REWARDS SHOP" subtitle="Spend your points on real rewards" onBack={onBack} />

      {/* Balance */}
      <div className="px-6 mb-4">
        <div className="surface-base p-6 text-center">
          <p className="type-micro text-slate-500 mb-1">Your Balance</p>
          <p className="text-3xl font-semibold text-slate-900 font-data">{currentPoints}</p>
          <p className="type-caption text-slate-500">points available</p>
        </div>
      </div>

      {/* Rewards by Tier */}
      <div className="px-6 space-y-5">
        {rewards.isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 size={20} className="text-amber-500 animate-spin" /></div>
        ) : (
          groupedRewards.map(group => (
            <div key={group.tier}>
              <p className="type-micro text-zinc-600 mb-2 capitalize">{group.tier} Tier</p>
              <div className="space-y-2">
                {group.rewards.map((reward: any) => {
                  const canAfford = currentPoints >= reward.pointsCost;
                  return (
                    <div key={reward.id} className="surface-base p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="type-body font-semibold text-slate-900">{reward.name}</h4>
                          <p className="type-caption text-slate-500 mt-0.5">{reward.description}</p>
                        </div>
                        <div className="text-right ml-3">
                          <p className={`type-body font-semibold font-data ${canAfford ? 'text-amber-500' : 'text-zinc-600'}`}>{reward.pointsCost}</p>
                          <p className="type-micro text-zinc-600">pts</p>
                        </div>
                      </div>
                      <button onClick={() => handleRedeem(reward.id, reward.pointsCost)} disabled={!canAfford || redeeming === reward.id}
                        className={`w-full mt-3 py-2.5 rounded-xl type-caption font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
                          canAfford ? 'bg-amber-500 text-black glow-amber' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                        }`}>
                        {redeeming === reward.id ? <><Loader2 size={12} className="animate-spin" /> Redeeming...</>
                          : canAfford ? <><ShoppingBag size={12} /> Redeem</>
                          : <><Lock size={12} /> Need {reward.pointsCost - currentPoints} more</>}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Recent Redemptions */}
      {(myRedemptions.data?.length || 0) > 0 && (
        <div className="px-6 mt-6">
          <p className="type-micro text-zinc-600 mb-2">Your Redemptions</p>
          <div className="space-y-2">
            {myRedemptions.data?.map((r: any) => (
              <div key={r.id} className="surface-base p-3 flex items-center justify-between">
                <div>
                  <p className="type-body text-slate-900 font-medium">{r.rewardName || "Reward"}</p>
                  <p className="type-caption text-slate-500">{r.pointsSpent} pts · {new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`type-micro px-2 py-0.5 rounded-full ${
                  r.status === "approved" ? "bg-amber-500/15 text-amber-500" :
                  r.status === "pending" ? "bg-zinc-800 text-slate-500" :
                  "bg-red-500/15 text-red-400"
                }`}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
