/**
 * Security Records Screen — Audit Log Viewer for Managers/Owners
 * Shows all security events: logins, lockouts, PIN changes, clock in/out, unauthorized access
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { ChevronLeft, Shield, AlertTriangle, Lock, Clock, User, Filter, CheckCircle2, XCircle } from "lucide-react";

interface Props {
  onBack: () => void;
}

const EVENT_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  login_success: { label: "Login", icon: CheckCircle2, color: "text-emerald-400" },
  login_failed: { label: "Failed Login", icon: XCircle, color: "text-red-400" },
  lockout_triggered: { label: "Lockout", icon: Lock, color: "text-red-500" },
  lockout_expired: { label: "Lockout Expired", icon: Lock, color: "text-zinc-400" },
  pin_changed: { label: "PIN Changed", icon: Shield, color: "text-amber-400" },
  pin_change_failed: { label: "PIN Change Failed", icon: Shield, color: "text-red-400" },
  clock_in: { label: "Clock In", icon: Clock, color: "text-emerald-400" },
  clock_out: { label: "Clock Out", icon: Clock, color: "text-zinc-400" },
  unauthorized_access: { label: "Unauthorized", icon: AlertTriangle, color: "text-red-500" },
  prompt_injection_blocked: { label: "Injection Blocked", icon: Shield, color: "text-red-500" },
  staff_created: { label: "Staff Created", icon: User, color: "text-blue-400" },
  staff_deactivated: { label: "Staff Deactivated", icon: User, color: "text-zinc-500" },
};

const SEVERITY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  info: { label: "Info", bg: "bg-zinc-800", text: "text-zinc-300" },
  warning: { label: "Warning", bg: "bg-amber-900/30", text: "text-amber-400" },
  critical: { label: "Critical", bg: "bg-red-900/30", text: "text-red-400" },
};

export default function SecurityRecordsScreen({ onBack }: Props) {
  const [filter, setFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const { data: events = [], isLoading } = trpc.security.events.useQuery({
    limit: 200,
    eventType: filter !== "all" ? filter : undefined,
    severity: severityFilter !== "all" ? severityFilter : undefined,
  });

  const { data: stats } = trpc.security.stats.useQuery();
  const { data: recentLockouts = [] } = trpc.security.recentLockouts.useQuery({ hours: 24 });

  const resolveMutation = trpc.security.resolve.useMutation({
    onSuccess: () => {
      // Invalidate queries
    },
  });

  const formatTime = (date: string | Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };

  const parseDetails = (details: string | null): Record<string, any> => {
    if (!details) return {};
    try { return JSON.parse(details); } catch { return {}; }
  };

  return (
    <div className="h-screen bg-black flex flex-col overflow-y-auto pb-24 screen-enter">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-zinc-400 hover:text-white transition-colors">
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-white font-semibold text-base tracking-tight">Security Records</h1>
              <p className="text-zinc-500 text-xs">Audit log & event history</p>
            </div>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${showFilters ? "bg-amber-500/20 text-amber-400" : "text-zinc-400 hover:text-white"}`}
          >
            <Filter size={16} />
          </button>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 gap-2.5">
            <div className="surface-base p-3.5">
              <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Events (24h)</p>
              <p className="text-white text-lg font-semibold font-data mt-1">{stats.totalEvents24h}</p>
            </div>
            <div className={`surface-base p-3.5 ${stats.lockouts24h > 0 ? "border border-red-500/30" : ""}`}>
              <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Lockouts (24h)</p>
              <p className={`text-lg font-semibold font-data mt-1 ${stats.lockouts24h > 0 ? "text-red-400" : "text-white"}`}>{stats.lockouts24h}</p>
            </div>
            <div className={`surface-base p-3.5 ${stats.failedLogins24h > 3 ? "border border-amber-500/30" : ""}`}>
              <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Failed Logins</p>
              <p className={`text-lg font-semibold font-data mt-1 ${stats.failedLogins24h > 3 ? "text-amber-400" : "text-white"}`}>{stats.failedLogins24h}</p>
            </div>
            <div className="surface-base p-3.5">
              <p className="text-zinc-500 text-[10px] uppercase tracking-wider">PIN Changes</p>
              <p className="text-white text-lg font-semibold font-data mt-1">{stats.pinChanges24h}</p>
            </div>
          </div>
        )}

        {/* Critical Alert Banner */}
        {stats && stats.criticalEvents24h > 0 && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle size={18} className="text-red-400 shrink-0" />
            <div>
              <p className="text-red-400 text-sm font-semibold">{stats.criticalEvents24h} Critical Event{stats.criticalEvents24h > 1 ? "s" : ""}</p>
              <p className="text-red-300/60 text-xs mt-0.5">Requires immediate attention</p>
            </div>
          </div>
        )}

        {/* Recent Lockouts */}
        {recentLockouts.length > 0 && (
          <div className="surface-base overflow-hidden">
            <div className="p-3.5 border-b border-white/5 flex items-center gap-2">
              <Lock size={14} className="text-red-400" />
              <span className="text-white text-sm font-semibold">Recent Lockouts</span>
              <span className="ml-auto text-red-400 text-xs font-data">{recentLockouts.length}</span>
            </div>
            {recentLockouts.slice(0, 5).map((event: any, i: number) => (
              <div key={i} className="p-3.5 border-b border-white/5 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300 text-xs font-mono">{event.ipAddress}</span>
                  <span className="text-zinc-500 text-[10px]">{formatTime(event.createdAt)}</span>
                </div>
                {event.staffName && <p className="text-zinc-400 text-[10px] mt-1">{event.staffName}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <div className="surface-base p-4 space-y-3">
            <div>
              <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2">Event Type</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${filter === "all" ? "bg-amber-500/20 text-amber-400" : "bg-zinc-800 text-zinc-400"}`}
                >All</button>
                {Object.entries(EVENT_TYPE_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${filter === key ? "bg-amber-500/20 text-amber-400" : "bg-zinc-800 text-zinc-400"}`}
                  >{cfg.label}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2">Severity</p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setSeverityFilter("all")}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${severityFilter === "all" ? "bg-amber-500/20 text-amber-400" : "bg-zinc-800 text-zinc-400"}`}
                >All</button>
                {Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setSeverityFilter(key)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${severityFilter === key ? "bg-amber-500/20 text-amber-400" : "bg-zinc-800 text-zinc-400"}`}
                  >{cfg.label}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Event List */}
        <div className="surface-base overflow-hidden">
          <div className="p-3.5 border-b border-white/5 flex items-center justify-between">
            <span className="text-white text-sm font-semibold">Event Log</span>
            <span className="text-zinc-500 text-xs font-data">{events.length} events</span>
          </div>
          {isLoading ? (
            <div className="p-8 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center">
              <Shield size={24} className="text-zinc-600 mx-auto mb-2" />
              <p className="text-zinc-500 text-sm">No security events found</p>
            </div>
          ) : (
            events.map((event: any, i: number) => {
              const config = EVENT_TYPE_CONFIG[event.eventType] || { label: event.eventType, icon: Shield, color: "text-zinc-400" };
              const severity = SEVERITY_CONFIG[event.severity] || SEVERITY_CONFIG.info;
              const details = parseDetails(event.details);
              const Icon = config.icon;
              return (
                <div key={i} className={`p-3.5 border-b border-white/5 last:border-0 ${event.severity === "critical" ? "bg-red-900/10" : ""}`}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${config.color}`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-xs font-medium">{config.label}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${severity.bg} ${severity.text}`}>
                          {severity.label}
                        </span>
                        {event.resolved && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-900/30 text-emerald-400">Resolved</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {event.staffName && <span className="text-zinc-300 text-[10px]">{event.staffName}</span>}
                        <span className="text-zinc-600 text-[10px]">{event.ipAddress}</span>
                      </div>
                      {/* Details */}
                      {details && Object.keys(details).length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {Object.entries(details).map(([key, val]) => (
                            <span key={key} className="text-[9px] bg-zinc-800/80 text-zinc-400 px-1.5 py-0.5 rounded font-mono">
                              {key}: {String(val)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-zinc-600 text-[10px] whitespace-nowrap shrink-0">{formatTime(event.createdAt)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
