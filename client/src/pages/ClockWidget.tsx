/**
 * ClockWidget — Night Shift Design System
 * Inline widget for the home screen showing clock status + actions.
 * PIN login = implicit clock in. Explicit clock out button.
 * Shows: current status, time since clock in, break controls.
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Clock, Coffee, LogOut, Play, Pause, Loader2 } from "lucide-react";

interface Props {
  staffId: number;
  staffName: string;
}

function formatElapsed(startTime: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - new Date(startTime).getTime()) / 1000);
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function ClockWidget({ staffId, staffName }: Props) {
  const [now, setNow] = useState(new Date());

  // Refresh every 30 seconds for the elapsed timer
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const activeEntry = trpc.timeClock.active.useQuery();
  const weeklyHours = trpc.timeClock.weeklyHours.useQuery();
  const utils = trpc.useUtils();

  const clockInMut = trpc.timeClock.clockIn.useMutation({
    onSuccess: () => { utils.timeClock.active.invalidate(); utils.timeClock.weeklyHours.invalidate(); toast.success("Clocked in"); },
    onError: (e) => toast.error(e.message),
  });
  const clockOutMut = trpc.timeClock.clockOut.useMutation({
    onSuccess: () => { utils.timeClock.active.invalidate(); utils.timeClock.weeklyHours.invalidate(); toast.success("Clocked out"); },
    onError: (e) => toast.error(e.message),
  });
  const startBreakMut = trpc.timeClock.startBreak.useMutation({
    onSuccess: () => { utils.timeClock.active.invalidate(); utils.timeClock.weeklyHours.invalidate(); toast.success("Break started"); },
    onError: (e) => toast.error(e.message),
  });
  const endBreakMut = trpc.timeClock.endBreak.useMutation({
    onSuccess: () => { utils.timeClock.active.invalidate(); utils.timeClock.weeklyHours.invalidate(); toast.success("Break ended"); },
    onError: (e) => toast.error(e.message),
  });

  const entry = activeEntry.data as any;
  const hours = weeklyHours.data as any;
  const isClockedIn = Boolean(entry && entry.status !== "clocked_out");
  const isOnBreak = entry?.status === "on_break";
  const isPending = clockInMut.isPending || clockOutMut.isPending || startBreakMut.isPending || endBreakMut.isPending;

  if (activeEntry.isLoading || activeEntry.isFetching) {
    return (
      <div className="surface-base p-5 rounded-2xl shadow-[0_18px_55px_rgba(0,0,0,0.22)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-center">
              <Loader2 size={18} className="text-amber-500 animate-spin" />
            </div>
            <div>
              <p className="type-caption text-slate-300">Checking clock status...</p>
              {hours?.totalHours && (
                <p className="type-micro text-slate-400 normal-case">{Number(hours.totalHours).toFixed(1)}h this week</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeEntry.isError) {
    return (
      <div className="surface-base p-5 rounded-2xl border border-red-400/20 shadow-[0_18px_55px_rgba(0,0,0,0.22)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <Clock size={18} className="text-red-400" />
          </div>
          <div>
            <p className="type-caption text-red-300">Clock status unavailable</p>
            <p className="type-micro text-slate-400 normal-case">Refresh or ask a manager before starting work.</p>
          </div>
        </div>
      </div>
    );
  }

  // Not clocked in
  if (!isClockedIn) {
    return (
      <div className="surface-base p-5 rounded-2xl shadow-[0_18px_55px_rgba(0,0,0,0.22)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-center">
              <Clock size={18} className="text-amber-300" />
            </div>
            <div>
              <p className="type-caption text-slate-300">Not clocked in</p>
              {hours?.totalHours && (
                <p className="type-micro text-slate-400 normal-case">{Number(hours.totalHours).toFixed(1)}h this week</p>
              )}
            </div>
          </div>
          <button onClick={() => clockInMut.mutate()} disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 text-[#07111f] type-caption font-semibold hover:from-amber-200 hover:to-amber-400 transition-colors active:scale-95 disabled:opacity-50 shadow-[0_12px_28px_rgba(245,158,11,0.22)]">
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Clock In
          </button>
        </div>
      </div>
    );
  }

  // Clocked in (active or on break)
  return (
    <div className={`p-5 rounded-2xl border transition-colors shadow-[0_18px_55px_rgba(0,0,0,0.22)] ${
      isOnBreak
        ? "bg-blue-400/10 border-blue-300/20"
        : "bg-green-400/10 border-green-300/20"
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isOnBreak ? "bg-blue-400/15" : "bg-green-400/15"
          }`}>
            {isOnBreak ? <Coffee size={18} className="text-blue-400" /> : <Clock size={18} className="text-green-400" />}
          </div>
          <div>
            <p className={`type-caption font-medium ${isOnBreak ? "text-blue-400" : "text-green-400"}`}>
              {isOnBreak ? "On Break" : "Clocked In"}
            </p>
            <p className="type-micro text-slate-400 normal-case">
              {entry.clockIn && formatElapsed(entry.clockIn)} elapsed
              {hours?.totalHours && <span className="ml-2">· {Number(hours.totalHours).toFixed(1)}h this week</span>}
            </p>
          </div>
        </div>
        <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${isOnBreak ? "bg-blue-400" : "bg-green-400"}`} />
      </div>

      <div className="flex gap-2">
        {isOnBreak ? (
          <button onClick={() => endBreakMut.mutate()} disabled={isPending}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-400/15 text-blue-300 type-caption font-medium hover:bg-blue-400/25 transition-colors active:scale-[0.98] disabled:opacity-50">
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
            End Break
          </button>
        ) : (
          <button onClick={() => startBreakMut.mutate()} disabled={isPending}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#13233a] text-slate-300 type-caption font-medium hover:bg-[#182b45] transition-colors active:scale-[0.98] disabled:opacity-50">
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Coffee size={13} />}
            Break
          </button>
        )}
        <button onClick={() => clockOutMut.mutate()} disabled={isPending}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-500/10 text-red-300 type-caption font-medium hover:bg-red-500/20 transition-colors active:scale-[0.98] disabled:opacity-50">
          {isPending ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
          Clock Out
        </button>
      </div>
    </div>
  );
}
