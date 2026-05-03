import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Brain, RefreshCw, AlertTriangle, Lightbulb, ClipboardList, Beer, ChefHat, CalendarClock, Eye } from "lucide-react";

interface Props {
  staffUser: { id: number; name: string; department: string; role: string } | null;
  onBack: () => void;
}

type RoleFilter = "all" | "michael" | "ashley" | "tom";

const ROLE_CONFIG: Record<string, { label: string; icon: typeof Brain; color: string; description: string }> = {
  michael: { label: "Mychael", icon: CalendarClock, color: "text-amber-400", description: "Full Schedule Picture" },
  ashley: { label: "Ashley", icon: Beer, color: "text-blue-400", description: "Bar Intelligence" },
  tom: { label: "Tom", icon: ChefHat, color: "text-green-400", description: "BOH / Kitchen" },
  all: { label: "All", icon: Brain, color: "text-white", description: "All Briefings" },
};

export default function ManagementBriefingScreen({ staffUser, onBack }: Props) {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);

  const briefingsQuery = trpc.briefings.list.useQuery(
    roleFilter !== "all" ? { role: roleFilter } : undefined,
    { refetchInterval: 30000 }
  );
  const markRead = trpc.briefings.markRead.useMutation({
    onSuccess: () => briefingsQuery.refetch(),
  });
  const generateBriefing = trpc.briefings.generate.useMutation({
    onSuccess: () => {
      briefingsQuery.refetch();
      setGenerating(false);
    },
    onError: () => setGenerating(false),
  });

  const briefings = briefingsQuery.data || [];

  const handleExpand = (id: number, isRead: boolean) => {
    setExpandedId(expandedId === id ? null : id);
    if (!isRead) {
      markRead.mutate({ id });
    }
  };

  const handleGenerate = () => {
    setGenerating(true);
    generateBriefing.mutate();
  };

  const formatTime = (ts: string | Date | null) => {
    if (!ts) return "";
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/10 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-lg tracking-wide">INTELLIGENCE BRIEFINGS</h1>
              <p className="text-xs text-white/50">Role-based insights for management</p>
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-3 py-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
            <span className="text-sm font-medium">{generating ? "Generating..." : "Generate New"}</span>
          </button>
        </div>

        {/* Role Filter Tabs */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {(["all", "michael", "ashley", "tom"] as RoleFilter[]).map((role) => {
            const config = ROLE_CONFIG[role];
            const Icon = config.icon;
            const isActive = roleFilter === role;
            return (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive ? "bg-white/15 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? config.color : ""}`} />
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Briefing List */}
      <div className="p-4 space-y-3">
        {briefingsQuery.isLoading && (
          <div className="text-center py-12 text-white/40">
            <Brain className="w-8 h-8 mx-auto mb-2 animate-pulse" />
            <p>Loading briefings...</p>
          </div>
        )}

        {!briefingsQuery.isLoading && briefings.length === 0 && (
          <div className="text-center py-12">
            <Brain className="w-12 h-12 mx-auto mb-3 text-white/20" />
            <p className="text-white/40 mb-4">No briefings yet</p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors"
            >
              Generate First Briefing
            </button>
          </div>
        )}

        {briefings.map((b: any) => {
          const isExpanded = expandedId === b.id;
          const isRead = !!b.readAt;
          const roleConfig = ROLE_CONFIG[b.targetRole] || ROLE_CONFIG.all;
          const RoleIcon = roleConfig.icon;
          const theories: string[] = Array.isArray(b.theories) ? (b.theories as string[]) : [];
          const actionItems: string[] = Array.isArray(b.actionItems) ? (b.actionItems as string[]) : [];
          const anomalyData = b.anomalies as any[] | null;
          const fullContent = typeof b.fullContent === 'string' ? b.fullContent : String(b.fullContent || '');

          return (
            <div
              key={b.id}
              className={`rounded-xl border transition-all ${
                isRead ? "border-white/5 bg-white/[0.02]" : "border-amber-500/30 bg-amber-500/5"
              }`}
            >
              {/* Briefing Header */}
              <button
                onClick={() => handleExpand(b.id, isRead)}
                className="w-full text-left p-4"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${isRead ? "bg-white/5" : "bg-amber-500/10"}`}>
                    <RoleIcon className={`w-5 h-5 ${roleConfig.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleConfig.color} bg-white/5`}>
                        {roleConfig.label}
                      </span>
                      <span className="text-xs text-white/30">{formatTime(b.generatedAt)}</span>
                      {!isRead && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                      {b.notificationSent && <span className="text-xs text-green-400/50">notified</span>}
                    </div>
                    <h3 className="font-semibold text-sm truncate">{b.title}</h3>
                    <p className="text-xs text-white/50 mt-1 line-clamp-2">{b.summary}</p>
                  </div>
                  <Eye className={`w-4 h-4 flex-shrink-0 mt-1 transition-transform ${isExpanded ? "text-amber-400" : "text-white/20"}`} />
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
                  {/* Anomaly Alerts */}
                  {anomalyData && anomalyData.length > 0 && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span className="text-sm font-semibold text-red-400">ANOMALIES DETECTED</span>
                      </div>
                      {anomalyData.slice(0, 5).map((a: any, i: number) => (
                        <p key={i} className="text-sm text-red-300/80 ml-6">• {a.description || a.metric || 'Anomaly'}{a.theory ? ` — ${a.theory}` : ''}</p>
                      ))}
                    </div>
                  )}

                  {/* Full Content */}
                  <div className="prose prose-invert prose-sm max-w-none">
                    <div
                      className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{
                        __html: fullContent
                          .replace(/## (.*)/g, '<h3 class="text-amber-400 font-bold mt-4 mb-2 text-sm">$1</h3>')
                          .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                          .replace(/\n/g, "<br/>"),
                      }}
                    />
                  </div>

                  {/* Theories */}
                  {theories.length > 0 && (
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-semibold text-purple-400">THEORIES</span>
                      </div>
                      {theories.map((theory: string, i: number) => (
                        <p key={i} className="text-sm text-purple-300/80 ml-6 mb-1">• {String(theory)}</p>
                      ))}
                    </div>
                  )}

                  {/* Action Items */}
                  {actionItems.length > 0 && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <ClipboardList className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-semibold text-green-400">ACTION ITEMS</span>
                      </div>
                      {actionItems.map((action: string, i: number) => (
                        <p key={i} className="text-sm text-green-300/80 ml-6 mb-1">• {String(action)}</p>
                      ))}
                    </div>
                  )}

                  {/* Data Context */}
                  {b.eventsContext && (b.eventsContext as any[]).length > 0 && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-xs font-medium text-white/40 mb-2">EVENTS WITHIN 30 MILES</p>
                      {(b.eventsContext as any[]).map((evt: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-white/50 mb-1">
                          <span className={`w-2 h-2 rounded-full ${evt.estimatedImpact === "high" ? "bg-red-400" : evt.estimatedImpact === "medium" ? "bg-amber-400" : "bg-green-400"}`} />
                          <span>{evt.eventName}</span>
                          <span className="text-white/30">— {evt.eventDate}</span>
                          {evt.distance && <span className="text-white/20">{evt.distance}mi</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
