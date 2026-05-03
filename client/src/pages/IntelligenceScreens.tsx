/**
 * AI-Native Intelligence Screens
 * Ask Brain, Photo Missions, Achievements, Rewards Shop
 * Night Shift Dark design — OLED black + amber
 */
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { SafeStaff } from "../../../shared/types";
import {
  Brain, Camera, Trophy, Gift, Send, ChevronLeft,
  Sparkles, Target, Star, Lock, CheckCircle2,
  Loader2, Image, Award, ShoppingBag, ArrowRight,
  MessageSquare, Zap, TrendingUp, Clock
} from "lucide-react";

// ─── ASK BRAIN SCREEN ──────────────────────────────────────────
export function AskBrainScreen({ staffUser, station, onBack }: { staffUser: SafeStaff; station?: string; onBack: () => void }) {
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai"; text: string; sources?: number }[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const askBrain = trpc.knowledge.ask.useMutation();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatHistory]);

  const handleAsk = async () => {
    if (!question.trim() || isAsking) return;
    const q = question.trim();
    setQuestion("");
    setChatHistory(prev => [...prev, { role: "user", text: q }]);
    setIsAsking(true);
    try {
      const result = await askBrain.mutateAsync({
        question: q,
        station: station || "general",
        staffName: staffUser.firstName,
      });
      setChatHistory(prev => [...prev, { role: "ai", text: typeof result.answer === "string" ? result.answer : String(result.answer), sources: result.sourcesUsed }]);
    } catch {
      setChatHistory(prev => [...prev, { role: "ai", text: "Sorry, I couldn't process that. Try asking differently." }]);
    }
    setIsAsking(false);
  };

  const quickQuestions = station === "pizza_line"
    ? ["How much cheese on a large?", "Do we have GF crust?", "Pizza cook time?"]
    : station === "fry_line"
    ? ["Fryer temperature?", "Wing sauce list?", "When to change oil?"]
    : station === "bar"
    ? ["How to make Old Fashioned?", "Moscow Mule recipe?", "Bar opening duties?"]
    : ["What are today's specials?", "Food allergy procedure?", "Who are our vendors?"];

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-zinc-900">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center">
            <ChevronLeft size={16} className="text-zinc-400" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Brain size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Ask the Brain</h2>
              <p className="text-[10px] text-zinc-500">{station ? `Station: ${station.replace("_", " ")}` : "General knowledge"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-32">
        {chatHistory.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-600/20 flex items-center justify-center mb-4">
              <Brain size={28} className="text-purple-400" />
            </div>
            <h3 className="text-white font-bold text-sm mb-1">What do you need to know?</h3>
            <p className="text-zinc-500 text-xs mb-4">Ask about recipes, procedures, vendors, or anything about the restaurant.</p>
            <div className="space-y-2">
              {quickQuestions.map((q, i) => (
                <button key={i} onClick={() => { setQuestion(q); }} className="w-full text-left px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:border-purple-500/30 transition-all">
                  <MessageSquare size={10} className="inline mr-2 text-purple-400" />{q}
                </button>
              ))}
            </div>
          </div>
        )}
        {chatHistory.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
              msg.role === "user"
                ? "bg-amber-500 text-black"
                : "bg-zinc-900 border border-zinc-800 text-zinc-200"
            }`}>
              {msg.text}
              {msg.sources !== undefined && msg.sources > 0 && (
                <div className="mt-1 text-[9px] text-zinc-500">{msg.sources} knowledge source{msg.sources > 1 ? "s" : ""} used</div>
              )}
            </div>
          </div>
        ))}
        {isAsking && (
          <div className="flex justify-start">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-400 flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" /> Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="fixed bottom-14 left-0 right-0 px-4 py-3 bg-black border-t border-zinc-900">
        <div className="flex gap-2">
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAsk()}
            placeholder="Ask anything..."
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:border-purple-500/50 outline-none"
          />
          <button onClick={handleAsk} disabled={!question.trim() || isAsking} className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center disabled:opacity-40">
            <Send size={14} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PHOTO MISSIONS SCREEN ──────────────────────────────────────
export function PhotoMissionsScreen({ staffUser, onBack }: { staffUser: SafeStaff; onBack: () => void }) {
  const missions = trpc.missions.active.useQuery();
  const myPhotos = trpc.photos.mySubmissions.useQuery({ staffId: staffUser.id });
  const analyzePhoto = trpc.photos.analyze.useMutation();
  const uploadPhoto = trpc.upload.receiptPhoto.useMutation();
  const [selectedMission, setSelectedMission] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoCapture = async (missionId: number, photoType: string) => {
    setSelectedMission(missionId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedMission) return;
    setUploading(true);
    try {
      // Convert file to base64 for upload via tRPC
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]); // Strip data:image/...;base64, prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Upload to S3 via existing upload.receiptPhoto
      const uploadResult = await uploadPhoto.mutateAsync({
        base64,
        filename: `mission-${selectedMission}-${Date.now()}.${file.name.split(".").pop() || "jpg"}`,
        mimeType: file.type || "image/jpeg",
        context: "issue" as const,
      });

      // Determine photo type from mission category
      const mission = missions.data?.find((m: any) => m.id === selectedMission);
      const photoType = (mission?.category || "station") as "invoice" | "shelf" | "station" | "equipment" | "plate" | "delivery" | "prep" | "other";

      // Analyze the uploaded photo with LLM vision
      await analyzePhoto.mutateAsync({
        photoUrl: uploadResult.url,
        photoType,
        staffId: staffUser.id,
        missionId: selectedMission,
      });
      toast.success("Photo submitted & analyzed! +5 pts");
      myPhotos.refetch();
    } catch {
      toast.error("Upload failed. Try again.");
    }
    setUploading(false);
    setSelectedMission(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="h-full overflow-y-auto bg-black pb-20">
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-zinc-900">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center">
            <ChevronLeft size={16} className="text-zinc-400" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Camera size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Photo Missions</h2>
              <p className="text-[10px] text-zinc-500">Earn points by documenting the restaurant</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Banner */}
      <div className="px-4 py-3">
        <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl p-3 border border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-emerald-400 font-medium">Photos Submitted</p>
              <p className="text-xl font-bold text-white">{myPhotos.data?.length || 0}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-emerald-400 font-medium">Points Earned</p>
              <p className="text-xl font-bold text-emerald-400">{(myPhotos.data?.length || 0) * 5}</p>
            </div>
            <Camera size={32} className="text-emerald-500/20" />
          </div>
        </div>
      </div>

      {/* Active Missions */}
      <div className="px-4 space-y-3">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Active Missions</h3>
        {missions.isLoading ? (
          <div className="text-center py-8"><Loader2 size={20} className="animate-spin text-zinc-500 mx-auto" /></div>
        ) : missions.data?.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-xs">No active missions right now. Check back later!</div>
        ) : (
          missions.data?.map((mission: any) => (
            <div key={mission.id} className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white">{mission.name}</h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{mission.description}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-400">+{mission.pointsPerPhoto} pts</span>
                  <p className="text-[9px] text-zinc-600">per photo</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1">
                  <Target size={10} className="text-zinc-500" />
                  <span className="text-[10px] text-zinc-500">{mission.targetPhotoCount} photos needed</span>
                </div>
                <button
                  onClick={() => handlePhotoCapture(mission.id, mission.category)}
                  disabled={uploading && selectedMission === mission.id}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black text-[10px] font-bold flex items-center gap-1 disabled:opacity-50"
                >
                  {uploading && selectedMission === mission.id ? (
                    <><Loader2 size={10} className="animate-spin" /> Uploading...</>
                  ) : (
                    <><Camera size={10} /> Take Photo</>
                  )}
                </button>
              </div>
              {mission.bonusPoints > 0 && (
                <div className="mt-2 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[9px] text-amber-400">🎯 Complete all {mission.targetPhotoCount} photos for +{mission.bonusPoints} bonus pts!</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── ACHIEVEMENTS SCREEN ──────────────────────────────────────
export function AchievementsScreen({ staffUser, onBack }: { staffUser: SafeStaff; onBack: () => void }) {
  const definitions = trpc.achievements.definitions.useQuery();
  const progress = trpc.achievements.myProgress.useQuery({ staffId: staffUser.id });
  const unlocks = trpc.achievements.myUnlocks.useQuery({ staffId: staffUser.id });
  const acknowledge = trpc.achievements.acknowledge.useMutation();

  const getProgress = (achievementId: number) => {
    return progress.data?.find((p: any) => p.achievementId === achievementId);
  };

  const isUnlocked = (achievementId: number) => {
    const p = getProgress(achievementId);
    return p?.status === "completed";
  };

  const progressPercent = (def: any) => {
    const p = getProgress(def.id);
    if (!p) return 0;
    return Math.min(100, Math.round((p.currentValue / def.thresholdValue) * 100));
  };

  const categoryOrder = ["onboarding", "reliability", "quality", "engagement", "leadership", "longevity"];
  const categoryLabels: Record<string, string> = {
    onboarding: "Getting Started",
    reliability: "Reliability",
    quality: "Quality",
    engagement: "Engagement",
    leadership: "Leadership",
    longevity: "Longevity",
  };

  const groupedDefs = categoryOrder.map(cat => ({
    category: cat,
    label: categoryLabels[cat] || cat,
    achievements: (definitions.data || []).filter((d: any) => d.category === cat),
  })).filter(g => g.achievements.length > 0);

  const totalEarned = (definitions.data || []).filter((d: any) => isUnlocked(d.id)).length;
  const totalAvailable = definitions.data?.length || 0;

  return (
    <div className="h-full overflow-y-auto bg-black pb-20">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-zinc-900">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center">
            <ChevronLeft size={16} className="text-zinc-400" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Trophy size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Achievements</h2>
              <p className="text-[10px] text-zinc-500">{totalEarned}/{totalAvailable} earned</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="px-4 py-3">
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl p-3 border border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Trophy size={24} className="text-amber-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{totalEarned} <span className="text-zinc-500 text-xs font-normal">of {totalAvailable}</span></p>
              <p className="text-[10px] text-zinc-400">achievements unlocked</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm font-bold text-amber-400">{staffUser.totalPoints || 0}</p>
              <p className="text-[9px] text-zinc-500">total pts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Achievement Groups */}
      <div className="px-4 space-y-4">
        {definitions.isLoading ? (
          <div className="text-center py-8"><Loader2 size={20} className="animate-spin text-zinc-500 mx-auto" /></div>
        ) : (
          groupedDefs.map(group => (
            <div key={group.category}>
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">{group.label}</h3>
              <div className="space-y-2">
                {group.achievements.map((def: any) => {
                  const unlocked = isUnlocked(def.id);
                  const pct = progressPercent(def);
                  const prog = getProgress(def.id);
                  return (
                    <div key={def.id} className={`rounded-xl p-3 border transition-all ${
                      unlocked
                        ? "bg-gradient-to-r from-amber-500/10 to-amber-600/5 border-amber-500/30"
                        : "bg-zinc-900 border-zinc-800"
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                          unlocked ? "bg-amber-500/20" : "bg-zinc-800 grayscale opacity-50"
                        }`}>
                          {def.badge}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className={`text-xs font-bold ${unlocked ? "text-amber-400" : "text-white"}`}>{def.name}</h4>
                            {unlocked && <CheckCircle2 size={12} className="text-amber-400" />}
                            {!unlocked && pct >= 80 && <Zap size={12} className="text-amber-500 animate-pulse" />}
                          </div>
                          <p className="text-[10px] text-zinc-500">{def.description}</p>
                          {!unlocked && (
                            <div className="mt-1.5">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[9px] text-zinc-600">{prog?.currentValue || 0}/{def.thresholdValue}</span>
                                <span className="text-[9px] text-zinc-600">{pct}%</span>
                              </div>
                              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-amber-500" : "bg-zinc-600"}`} style={{ width: `${pct}%` }} />
                              </div>
                              {prog?.bestValue != null && prog.bestValue > (prog.currentValue || 0) && (
                                <p className="text-[8px] text-zinc-600 mt-0.5 font-mono">Personal best: {prog.bestValue}</p>
                              )}
                            </div>
                          )}
                        </div>
                        {unlocked && (
                          <div className="text-right">
                            <span className="text-[10px] text-amber-400 font-bold">+{def.bonusPoints}</span>
                            <p className="text-[8px] text-zinc-600">pts</p>
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

// ─── REWARDS SHOP SCREEN ──────────────────────────────────────
export function RewardsShopScreen({ staffUser, onBack }: { staffUser: SafeStaff; onBack: () => void }) {
  const rewards = trpc.rewards.list.useQuery();
  const redeem = trpc.rewards.redeem.useMutation();
  const myRedemptions = trpc.rewards.myRedemptions.useQuery({ staffId: staffUser.id });
  const [redeeming, setRedeeming] = useState<number | null>(null);

  const currentPoints = staffUser.totalPoints || 0;

  const tierColors: Record<string, { bg: string; border: string; text: string }> = {
    bronze: { bg: "from-orange-800/20 to-orange-900/10", border: "border-orange-700/30", text: "text-orange-400" },
    silver: { bg: "from-zinc-400/10 to-zinc-500/5", border: "border-zinc-500/30", text: "text-zinc-300" },
    gold: { bg: "from-amber-500/15 to-amber-600/5", border: "border-amber-500/30", text: "text-amber-400" },
    platinum: { bg: "from-cyan-500/10 to-cyan-600/5", border: "border-cyan-500/30", text: "text-cyan-400" },
    diamond: { bg: "from-purple-500/10 to-purple-600/5", border: "border-purple-500/30", text: "text-purple-400" },
    legend: { bg: "from-red-500/10 to-red-600/5", border: "border-red-500/30", text: "text-red-400" },
  };

  const handleRedeem = async (rewardId: number, pointsCost: number) => {
    if (currentPoints < pointsCost) {
      toast.error("Not enough points!");
      return;
    }
    setRedeeming(rewardId);
    try {
      await redeem.mutateAsync({ staffId: staffUser.id, rewardId, pointsSpent: pointsCost });
      toast.success("Reward redeemed! A manager will approve it.");
      myRedemptions.refetch();
    } catch (err: any) {
      toast.error(err.message || "Redemption failed");
    }
    setRedeeming(null);
  };

  const tierOrder = ["bronze", "silver", "gold", "platinum", "diamond", "legend"];
  const groupedRewards = tierOrder.map(tier => ({
    tier,
    rewards: (rewards.data || []).filter((r: any) => r.tier === tier),
  })).filter(g => g.rewards.length > 0);

  return (
    <div className="h-full overflow-y-auto bg-black pb-20">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-zinc-900">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center">
            <ChevronLeft size={16} className="text-zinc-400" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
              <Gift size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Rewards Shop</h2>
              <p className="text-[10px] text-zinc-500">Spend your points on real rewards</p>
            </div>
          </div>
        </div>
      </div>

      {/* Points Balance */}
      <div className="px-4 py-3">
        <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/5 rounded-xl p-4 border border-amber-500/20 text-center">
          <p className="text-[10px] text-amber-400 font-medium mb-1">Your Balance</p>
          <p className="text-3xl font-bold text-white">{currentPoints}</p>
          <p className="text-[10px] text-zinc-500">points available</p>
        </div>
      </div>

      {/* Rewards by Tier */}
      <div className="px-4 space-y-4">
        {rewards.isLoading ? (
          <div className="text-center py-8"><Loader2 size={20} className="animate-spin text-zinc-500 mx-auto" /></div>
        ) : (
          groupedRewards.map(group => {
            const colors = tierColors[group.tier] || tierColors.bronze;
            return (
              <div key={group.tier}>
                <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${colors.text}`}>
                  {group.tier} Tier
                </h3>
                <div className="space-y-2">
                  {group.rewards.map((reward: any) => {
                    const canAfford = currentPoints >= reward.pointsCost;
                    return (
                      <div key={reward.id} className={`rounded-xl p-3 border bg-gradient-to-r ${colors.bg} ${colors.border}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="text-xs font-bold text-white">{reward.name}</h4>
                            <p className="text-[10px] text-zinc-500 mt-0.5">{reward.description}</p>
                          </div>
                          <div className="text-right ml-3">
                            <p className={`text-sm font-bold ${canAfford ? colors.text : "text-zinc-600"}`}>{reward.pointsCost}</p>
                            <p className="text-[8px] text-zinc-600">pts</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRedeem(reward.id, reward.pointsCost)}
                          disabled={!canAfford || redeeming === reward.id}
                          className={`w-full mt-2 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                            canAfford
                              ? "bg-amber-500 text-black hover:bg-amber-400"
                              : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                          }`}
                        >
                          {redeeming === reward.id ? (
                            <><Loader2 size={10} className="animate-spin" /> Redeeming...</>
                          ) : canAfford ? (
                            <><ShoppingBag size={10} /> Redeem</>
                          ) : (
                            <><Lock size={10} /> Need {reward.pointsCost - currentPoints} more pts</>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Recent Redemptions */}
      {(myRedemptions.data?.length || 0) > 0 && (
        <div className="px-4 mt-6">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Your Redemptions</h3>
          <div className="space-y-2">
            {myRedemptions.data?.map((r: any) => (
              <div key={r.id} className="bg-zinc-900 rounded-lg p-2 border border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-white font-medium">{r.rewardName || "Reward"}</p>
                  <p className="text-[9px] text-zinc-500">{r.pointsSpent} pts · {new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-full ${
                  r.status === "approved" ? "bg-emerald-500/20 text-emerald-400" :
                  r.status === "pending" ? "bg-amber-500/20 text-amber-400" :
                  "bg-red-500/20 text-red-400"
                }`}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
