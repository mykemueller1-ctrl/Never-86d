/**
 * Achievements & Rewards — Badge gallery, progress tracking, and reward store
 * Workers see their progress, unlock celebrations, and redeem points
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Trophy, Star, ChevronLeft, Loader2,
  Gift, Lock, CheckCircle2, Sparkles,
  ShoppingBag, Clock, Award, Target,
  Flame, X,
} from "lucide-react";
import type { SafeStaff } from "../../../shared/types";

type Tab = "achievements" | "rewards";

// Achievement category grouping
const CATEGORY_ORDER = ["onboarding", "reliability", "quality", "engagement", "leadership", "longevity"];
const CATEGORY_LABELS: Record<string, string> = {
  onboarding: "Getting Started",
  reliability: "Reliability",
  quality: "Quality",
  engagement: "Engagement",
  leadership: "Leadership",
  longevity: "Longevity",
};

// Reward tier colors
const TIER_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  bronze: { border: "border-amber-700/50", bg: "bg-amber-700/10", text: "text-amber-600" },
  silver: { border: "border-zinc-400/50", bg: "bg-zinc-400/10", text: "text-zinc-300" },
  gold: { border: "border-yellow-500/50", bg: "bg-yellow-500/10", text: "text-yellow-500" },
  platinum: { border: "border-cyan-400/50", bg: "bg-cyan-400/10", text: "text-cyan-400" },
  diamond: { border: "border-purple-400/50", bg: "bg-purple-400/10", text: "text-purple-400" },
  legend: { border: "border-red-500/50", bg: "bg-red-500/10", text: "text-red-400" },
};

export default function AchievementsRewards({ staffUser, onBack }: { staffUser: SafeStaff; onBack: () => void }) {
  const [tab, setTab] = useState<Tab>("achievements");
  const [celebratingAchievement, setCelebratingAchievement] = useState<any>(null);

  const { data: definitions, isLoading: defsLoading } = trpc.achievements.definitions.useQuery();
  const { data: progress, isLoading: progressLoading } = trpc.achievements.myProgress.useQuery({ staffId: staffUser.id });
  const { data: unlocks } = trpc.achievements.myUnlocks.useQuery({ staffId: staffUser.id });
  const { data: rewards, isLoading: rewardsLoading } = trpc.rewards.list.useQuery();
  const { data: myRedemptions } = trpc.rewards.myRedemptions.useQuery({ staffId: staffUser.id });

  const acknowledgeUnlock = trpc.achievements.acknowledge.useMutation();
  const redeemReward = trpc.rewards.redeem.useMutation();
  const utils = trpc.useUtils();

  // Show celebration for unacknowledged unlocks
  useEffect(() => {
    if (unlocks && unlocks.length > 0 && definitions) {
      const firstUnlock = unlocks[0];
      const def = definitions.find((d: any) => d.id === firstUnlock.achievementId);
      if (def) {
        setCelebratingAchievement(def);
      }
    }
  }, [unlocks, definitions]);

  const handleAcknowledge = async () => {
    if (!celebratingAchievement) return;
    try {
      await acknowledgeUnlock.mutateAsync({ staffId: staffUser.id, achievementId: celebratingAchievement.id });
      setCelebratingAchievement(null);
      utils.achievements.myUnlocks.invalidate();
    } catch {}
  };

  const handleRedeem = async (reward: any) => {
    if (staffUser.totalPoints < reward.pointsCost) {
      toast.error("Not enough points!");
      return;
    }
    try {
      await redeemReward.mutateAsync({
        staffId: staffUser.id,
        rewardId: reward.id,
        pointsSpent: reward.pointsCost,
      });
      toast.success(`Redeemed: ${reward.name}! 🎉`);
      utils.rewards.myRedemptions.invalidate();
      utils.staff.byId.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Couldn't redeem reward");
    }
  };

  const getProgressForAchievement = (achievementId: number) => {
    if (!progress) return null;
    return (progress as any[]).find((p: any) => p.achievementId === achievementId);
  };

  const isUnlocked = (achievementId: number) => {
    const p = getProgressForAchievement(achievementId);
    return p?.status === "unlocked";
  };

  const getProgressPercent = (def: any) => {
    const p = getProgressForAchievement(def.id);
    if (!p) return 0;
    if (p.status === "unlocked") return 100;
    return Math.min(100, Math.round((p.currentValue / def.thresholdValue) * 100));
  };

  const earnedCount = definitions ? definitions.filter((d: any) => isUnlocked(d.id)).length : 0;

  const isLoading = defsLoading || progressLoading;

  return (
    <div className="h-screen bg-black flex flex-col">
      {/* Celebration Overlay */}
      {celebratingAchievement && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6" onClick={handleAcknowledge}>
          <div className="animate-bounce mb-4">
            <div className="w-24 h-24 rounded-3xl bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center">
              <span className="text-5xl">{celebratingAchievement.badge}</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-amber-500 text-xs uppercase font-bold mb-1 tracking-widest">Achievement Unlocked!</p>
            <h2 className="text-3xl font-black text-white mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              {celebratingAchievement.name}
            </h2>
            <p className="text-zinc-400 text-sm mb-4">{celebratingAchievement.description}</p>
            {celebratingAchievement.bonusPoints > 0 && (
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30">
                <Sparkles size={12} className="text-amber-500" />
                <span className="text-amber-500 text-sm font-bold">+{celebratingAchievement.bonusPoints} pts</span>
              </div>
            )}
          </div>
          <p className="text-zinc-600 text-[10px] mt-6">Tap anywhere to continue</p>
        </div>
      )}

      {/* Header */}
      <div className="p-4 pb-2 flex items-center gap-3 border-b border-zinc-900">
        <button onClick={onBack} className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0">
          <ChevronLeft size={14} className="text-zinc-400" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-black text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            {tab === "achievements" ? "ACHIEVEMENTS" : "REWARDS"}
          </h1>
          <p className="text-zinc-500 text-[10px]">
            {tab === "achievements" ? `${earnedCount}/${definitions?.length || 0} unlocked` : `${staffUser.totalPoints?.toLocaleString()} pts available`}
          </p>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
          <Trophy size={10} className="text-amber-500" />
          <span className="text-amber-500 text-xs font-bold">{staffUser.totalPoints?.toLocaleString()}</span>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex p-4 pb-0 gap-2">
        <button
          onClick={() => setTab("achievements")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tab === "achievements" ? "bg-amber-500 text-black" : "bg-zinc-900 text-zinc-400 border border-zinc-800"}`}
        >
          <Award size={12} className="inline mr-1" />Achievements
        </button>
        <button
          onClick={() => setTab("rewards")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tab === "rewards" ? "bg-amber-500 text-black" : "bg-zinc-900 text-zinc-400 border border-zinc-800"}`}
        >
          <Gift size={12} className="inline mr-1" />Rewards
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading || rewardsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="text-amber-500 animate-spin" />
          </div>
        ) : tab === "achievements" ? (
          /* Achievement Gallery */
          <>
            {CATEGORY_ORDER.map(cat => {
              const catDefs = definitions?.filter((d: any) => d.category === cat) || [];
              if (catDefs.length === 0) return null;
              return (
                <div key={cat}>
                  <p className="text-zinc-500 text-[10px] uppercase font-semibold mb-2 tracking-wider">{CATEGORY_LABELS[cat] || cat}</p>
                  <div className="space-y-2">
                    {catDefs.map((def: any) => {
                      const unlocked = isUnlocked(def.id);
                      const pct = getProgressPercent(def);
                      const prog = getProgressForAchievement(def.id);
                      return (
                        <div key={def.id} className={`rounded-xl p-3 border transition-all ${unlocked ? "bg-amber-500/5 border-amber-500/30" : "bg-zinc-900 border-zinc-800"}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${unlocked ? "bg-amber-500/20" : "bg-zinc-800 grayscale opacity-50"}`}>
                              {def.badge}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-semibold ${unlocked ? "text-white" : "text-zinc-400"}`}>{def.name}</span>
                                {unlocked && <CheckCircle2 size={12} className="text-amber-500" />}
                              </div>
                              <p className="text-zinc-500 text-[10px]">{def.description}</p>
                            </div>
                            {!unlocked && (
                              <span className="text-zinc-600 text-[10px] font-mono">{pct}%</span>
                            )}
                          </div>
                          {!unlocked && (
                            <div className="mt-2">
                              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500/50 rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-zinc-600 text-[8px]">{prog?.currentValue || 0}/{def.thresholdValue}</span>
                                {prog?.personalBest > 0 && prog.personalBest > (prog?.currentValue || 0) && (
                                  <span className="text-zinc-600 text-[8px]">Best: {prog.personalBest}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          /* Rewards Store */
          <>
            <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-500 text-[10px] uppercase">Your Balance</p>
                  <p className="text-2xl font-black text-amber-500" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                    {staffUser.totalPoints?.toLocaleString()} PTS
                  </p>
                </div>
                <Trophy size={24} className="text-amber-500/30" />
              </div>
            </div>

            {/* Pending redemptions */}
            {myRedemptions && (myRedemptions as any[]).filter((r: any) => r.status === "pending").length > 0 && (
              <div className="mb-4">
                <p className="text-zinc-500 text-[10px] uppercase font-semibold mb-2">Pending Approval</p>
                {(myRedemptions as any[]).filter((r: any) => r.status === "pending").map((r: any) => (
                  <div key={r.id} className="bg-amber-500/5 rounded-lg p-2 border border-amber-500/20 flex items-center gap-2 mb-1">
                    <Clock size={12} className="text-amber-500" />
                    <span className="text-white text-xs">Reward #{r.rewardId} — awaiting manager approval</span>
                  </div>
                ))}
              </div>
            )}

            {/* Available rewards */}
            <div className="space-y-2">
              {rewards?.map((reward: any) => {
                const tier = TIER_COLORS[reward.tier] || TIER_COLORS.bronze;
                const canAfford = staffUser.totalPoints >= reward.pointsCost;
                return (
                  <div key={reward.id} className={`rounded-xl p-3 border ${tier.border} ${tier.bg} transition-all`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tier.bg}`}>
                        <Gift size={18} className={tier.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-semibold">{reward.name}</span>
                          <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded ${tier.bg} ${tier.text}`}>{reward.tier}</span>
                        </div>
                        <p className="text-zinc-500 text-[10px]">{reward.description}</p>
                      </div>
                      <button
                        onClick={() => handleRedeem(reward)}
                        disabled={!canAfford || redeemReward.isPending}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${canAfford ? "bg-amber-500 text-black hover:bg-amber-400" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}
                      >
                        {reward.pointsCost} pts
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
