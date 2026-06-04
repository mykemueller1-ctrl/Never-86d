/**
 * ScheduleScreen — Night Shift Design System
 * Manager: Weekly grid builder (create/edit/delete shifts)
 * Staff: "My Schedule" view (upcoming shifts, request time off, set availability)
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { SafeStaff } from "../../../shared/types";
import {
  ChevronLeft, ChevronRight, Plus, Calendar, Clock, X,
  Check, AlertTriangle, Loader2, Users, Trash2, Edit3
} from "lucide-react";

interface Props {
  staffUser: SafeStaff;
  allStaff: SafeStaff[];
  onBack: () => void;
}

const MANAGER_ROLES = ["owner", "key_manager", "kitchen_manager", "bar_manager"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DEPARTMENTS: Array<"bar" | "dining_room" | "kitchen_line" | "pizza_side" | "driver" | "dishwasher" | "management"> = ["bar", "dining_room", "kitchen_line", "pizza_side", "driver", "dishwasher", "management"];

type StaffShiftProfileData = {
  staffId: number;
  firstName: string;
  lastName: string;
  department: string;
  shiftProfile: {
    totalShiftsAnalyzed: number;
    usualPosition: string | null;
    typicalStartTime: string;
    typicalEndTime: string;
    avgHoursPerShift: number;
    averageHoursPerWeek: number;
    weeklyPattern: { day: string; frequency: number }[];
    reliabilityScore: number;
    crossTraining: boolean;
    lastShiftDate: string;
    streak: number;
  };
};

const DEPT_GROUPS: Record<string, string[]> = {
  bar: ["bar", "dining_room"],
  dining_room: ["bar", "dining_room"],
  kitchen_line: ["kitchen_line", "pizza_side", "dishwasher"],
  pizza_side: ["kitchen_line", "pizza_side", "dishwasher"],
  dishwasher: ["kitchen_line", "pizza_side", "dishwasher"],
  driver: ["driver"],
  management: ["bar", "dining_room", "kitchen_line", "pizza_side", "driver", "dishwasher", "management"],
};

function getWeekDates(offset: number): Date[] {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1 + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatWeekLabel(dates: Date[]): string {
  const start = dates[0];
  const end = dates[6];
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

function formatDepartmentLabel(department?: string | null): string {
  if (!department) return "Unassigned";
  return department.split("_").map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export default function ScheduleScreen({ staffUser, allStaff, onBack }: Props) {
  const isManager = MANAGER_ROLES.includes(staffUser.jobRole);
  const [weekOffset, setWeekOffset] = useState(0);
  const [tab, setTab] = useState<"schedule" | "availability" | "requests" | "hours">(isManager ? "schedule" : "schedule");
  const [showAddShift, setShowAddShift] = useState(false);
  const [editingShift, setEditingShift] = useState<number | null>(null);
  const [selectedProfileStaffId, setSelectedProfileStaffId] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const startDate = weekDates[0];
  const endDate = new Date(weekDates[6]);
  endDate.setHours(23, 59, 59, 999);
  const startDateKey = startDate.toISOString();
  const endDateKey = endDate.toISOString();

  // Queries
  const scheduleQuery = trpc.schedule.getWeek.useQuery({ startDate: startDateKey, endDate: endDateKey });

  const myAvailability = trpc.availability.getByStaff.useQuery();
  const myTimeOff = trpc.timeOff.myRequests.useQuery();
  const pendingTimeOff = isManager ? trpc.timeOff.pending.useQuery() : null;
  const pendingSwaps = isManager ? trpc.shiftSwaps.pending.useQuery() : null;

  const utils = trpc.useUtils();

  // Mutations
  const createShift = trpc.schedule.create.useMutation({
    onSuccess: () => { utils.schedule.getWeek.invalidate(); utils.schedule.getByStaff.invalidate(); toast.success("Shift added"); setShowAddShift(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateShift = trpc.schedule.update.useMutation({
    onSuccess: () => { utils.schedule.getWeek.invalidate(); utils.schedule.getByStaff.invalidate(); toast.success("Shift updated"); setEditingShift(null); },
    onError: (e) => toast.error(e.message),
  });
  const deleteShift = trpc.schedule.delete.useMutation({
    onSuccess: () => { utils.schedule.getWeek.invalidate(); utils.schedule.getByStaff.invalidate(); toast.success("Shift removed"); },
    onError: (e) => toast.error(e.message),
  });
  const approveTimeOffMut = trpc.timeOff.approve.useMutation({
    onSuccess: () => { pendingTimeOff?.refetch(); toast.success("Approved"); },
  });
  const denyTimeOffMut = trpc.timeOff.deny.useMutation({
    onSuccess: () => { pendingTimeOff?.refetch(); toast.success("Denied"); },
  });
  const requestTimeOff = trpc.timeOff.request.useMutation({
    onSuccess: () => { myTimeOff.refetch(); toast.success("Request submitted"); },
    onError: (e) => toast.error(e.message),
  });
  const setAvailability = trpc.availability.set.useMutation({
    onSuccess: () => { myAvailability.refetch(); toast.success("Availability updated"); },
  });

  const shifts = (scheduleQuery.data ?? []) as any[];
  const myDeptGroup = useMemo(() => DEPT_GROUPS[staffUser.department] || [staffUser.department], [staffUser.department]);
  const filteredShifts = useMemo(
    () => isManager ? shifts : shifts.filter((s: any) => myDeptGroup.includes(s.department)),
    [isManager, shifts, myDeptGroup]
  );

  // Group shifts by date for the grid
  const shiftsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const d of weekDates) {
      const key = d.toISOString().split("T")[0];
      map[key] = [];
    }
    for (const s of filteredShifts) {
      const key = new Date(s.date).toISOString().split("T")[0];
      if (map[key]) map[key].push(s);
    }
    return map;
  }, [filteredShifts, weekDates]);

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col screen-enter overscroll-contain">
      {/* Header */}
      <div className="px-6 pt-10 pb-2">
        <button onClick={onBack} className="text-amber-500 type-caption mb-3 flex items-center gap-1 hover:text-amber-400 transition-colors">
          <ChevronLeft size={16} /> Back
        </button>
        <div className="flex items-center justify-between">
          <h2 className="type-display text-slate-900">{isManager ? "Schedule" : "My Schedule"}</h2>
          {isManager && (
            <button onClick={() => { setSelectedDay(weekDates[0]); setShowAddShift(true); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 text-black type-caption font-semibold hover:bg-amber-400 transition-colors active:scale-95">
              <Plus size={14} /> Add Shift
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 py-3 flex gap-2 overflow-x-auto">
        {(["schedule", "availability", "requests", ...(isManager ? ["hours"] : [])] as const).map(t => (
          <button key={t} onClick={() => setTab(t as any)}
            className={`px-4 py-2 rounded-lg type-caption font-medium transition-colors whitespace-nowrap ${
              tab === t ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "text-slate-500 hover:text-slate-600"
            }`}>
            {t === "schedule" ? "Schedule" : t === "availability" ? "Availability" : t === "requests" ? "Requests" : "Hours"}
          </button>
        ))}
      </div>

      {/* Week Navigation */}
      {tab === "schedule" && (
        <div className="px-6 pb-3 flex items-center justify-between">
          <button onClick={() => setWeekOffset(o => o - 1)} className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-zinc-800 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <p className="type-caption text-slate-600 font-medium">{formatWeekLabel(weekDates)}</p>
            {weekOffset !== 0 && (
              <button onClick={() => setWeekOffset(0)} className="type-micro text-amber-500 mt-0.5">Today</button>
            )}
          </div>
          <button onClick={() => setWeekOffset(o => o + 1)} className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-zinc-800 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-32">
        {tab === "schedule" && (
          <ScheduleGrid
            weekDates={weekDates}
            shiftsByDate={shiftsByDate}
            staffUser={staffUser}
            allStaff={allStaff}
            isManager={isManager}
            myDeptGroup={myDeptGroup}
            onEdit={(id) => setEditingShift(id)}
            onDelete={(id) => deleteShift.mutate({ id })}
            onViewStaffProfile={isManager ? setSelectedProfileStaffId : undefined}
            isLoading={scheduleQuery.isLoading}
            isError={scheduleQuery.isError}
          />
        )}

        {tab === "availability" && (
          <AvailabilityView
            availability={myAvailability.data ?? []}
            onSet={(data) => setAvailability.mutate(data)}
          />
        )}

        {tab === "requests" && (
          <RequestsView
            staffUser={staffUser}
            isManager={isManager}
            myTimeOff={myTimeOff.data ?? []}
            pendingTimeOff={pendingTimeOff?.data ?? []}
            pendingSwaps={pendingSwaps?.data ?? []}
            onRequestTimeOff={(data) => requestTimeOff.mutate(data)}
            onApproveTimeOff={(id) => approveTimeOffMut.mutate({ id, approvedBy: staffUser.id })}
            onDenyTimeOff={(id) => denyTimeOffMut.mutate({ id, approvedBy: staffUser.id })}
          />
        )}

        {tab === "hours" && isManager && (
          <WeeklyHoursReport allStaff={allStaff} />
        )}
      </div>

      {/* Staff Shift Intelligence Modal */}
      {selectedProfileStaffId !== null && (
        <StaffProfileModal
          staffId={selectedProfileStaffId}
          onClose={() => setSelectedProfileStaffId(null)}
        />
      )}

      {/* Add Shift Modal */}
      {showAddShift && (
        <AddShiftModal
          allStaff={allStaff}
          selectedDay={selectedDay}
          weekDates={weekDates}
          createdBy={staffUser.id}
          onClose={() => setShowAddShift(false)}
          onSubmit={(data) => createShift.mutate(data)}
          isPending={createShift.isPending}
        />
      )}

      {/* Edit Shift Modal */}
      {editingShift !== null && (
        <EditShiftModal
          shift={shifts.find(s => s.id === editingShift)}
          allStaff={allStaff}
          onClose={() => setEditingShift(null)}
          onSubmit={(data) => updateShift.mutate(data)}
          isPending={updateShift.isPending}
        />
      )}
    </div>
  );
}

// ─── Schedule Grid ──────────────────────────────────────────────────────────
function ScheduleGrid({ weekDates, shiftsByDate, staffUser, allStaff, isManager, myDeptGroup, onEdit, onDelete, onViewStaffProfile, isLoading, isError }: {
  weekDates: Date[];
  shiftsByDate: Record<string, any[]>;
  staffUser: SafeStaff;
  allStaff: SafeStaff[];
  isManager: boolean;
  myDeptGroup: string[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onViewStaffProfile?: (staffId: number) => void;
  isLoading: boolean;
  isError: boolean;
}) {
  const today = new Date().toISOString().split("T")[0];
  const deptGroupStaff = useMemo(
    () => isManager ? [] : allStaff.filter(s => myDeptGroup.includes(s.department)),
    [allStaff, isManager, myDeptGroup]
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="skeleton h-16 w-full" />
        ))}
      </div>
    );
  }

  const totalShifts = Object.values(shiftsByDate).reduce((s, arr) => s + arr.length, 0);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertTriangle size={40} className="text-amber-500 mb-4" />
        <p className="type-heading text-slate-500 mb-2">Schedule unavailable</p>
        <p className="type-body text-zinc-600 text-center">We could not load schedule data right now. Try again in a moment.</p>
      </div>
    );
  }

  if (totalShifts === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Calendar size={40} className="text-zinc-700 mb-4" />
        <p className="type-heading text-slate-500 mb-2">{isManager ? "No schedules created yet" : "No shifts scheduled"}</p>
        <p className="type-body text-zinc-600 text-center">
          {isManager ? "Use Add Shift to build this week’s schedule." : "Your schedule for this week hasn't been posted yet. Check back later or ask your manager."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {weekDates.map(date => {
        const key = date.toISOString().split("T")[0];
        const dayShifts = shiftsByDate[key] || [];
        const isToday = key === today;
        const isPast = key < today;
        const dayLabel = date.toLocaleDateString("en-US", { weekday: "short" });
        const dateLabel = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const scheduledIds = new Set(dayShifts.map((shift: any) => shift.staffId));
        const offStaff = isManager ? [] : deptGroupStaff.filter(s => !scheduledIds.has(s.id));

        return (
          <div key={key} className={`rounded-xl p-4 transition-colors ${
            isToday ? "bg-amber-500/5 border border-amber-500/15" : "surface-base"
          } ${isPast ? "opacity-60" : ""}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`type-caption font-semibold ${isToday ? "text-amber-500" : "text-slate-600"}`}>
                  {dayLabel}
                </span>
                <span className="type-caption text-slate-500">{dateLabel}</span>
                {isToday && <span className="type-micro text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">Today</span>}
              </div>
              <span className="type-micro text-zinc-600">{dayShifts.length} shift{dayShifts.length !== 1 ? "s" : ""}</span>
            </div>

            {dayShifts.length === 0 && offStaff.length === 0 ? (
              <p className="type-caption text-zinc-600 italic">No shifts</p>
            ) : (
              <div className="space-y-1.5">
                {dayShifts.map((shift: any) => {
                  const staff = allStaff.find(s => s.id === shift.staffId);
                  const isMe = shift.staffId === staffUser.id;
                  return (
                    <div key={shift.id} className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                      isMe ? "bg-amber-500/8 border border-amber-500/10" : "bg-white/50"
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center type-micro font-semibold ${
                          isMe ? "bg-amber-500 text-black" : "bg-zinc-800 text-slate-500"
                        }`}>
                          {staff?.firstName?.charAt(0) || "?"}
                        </div>
                        <div>
                          {onViewStaffProfile ? (
                            <button
                              type="button"
                              onClick={() => onViewStaffProfile(shift.staffId)}
                              className={`type-caption font-medium text-left hover:text-amber-500 transition-colors ${isMe ? "text-amber-500" : "text-slate-700"}`}
                              title="View staff shift intelligence"
                            >
                              {staff ? `${staff.firstName} ${staff.lastName || ""}`.trim() : `Staff #${shift.staffId}`}
                              {isMe && <span className="text-amber-600 ml-1">(You)</span>}
                            </button>
                          ) : (
                            <p className={`type-caption font-medium ${isMe ? "text-amber-500" : "text-slate-700"}`}>
                              {staff ? `${staff.firstName} ${staff.lastName || ""}`.trim() : `Staff #${shift.staffId}`}
                              {isMe && <span className="text-amber-600 ml-1">(You)</span>}
                            </p>
                          )}
                          <p className="type-micro text-slate-500 normal-case">
                            {shift.startTime} – {shift.endTime}
                            {shift.position && <span className="ml-2 text-zinc-600">· {shift.position}</span>}
                          </p>
                        </div>
                      </div>
                      {isManager && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => onEdit(shift.id)} className="p-1.5 rounded-md text-zinc-600 hover:text-amber-500 hover:bg-zinc-800 transition-colors">
                            <Edit3 size={13} />
                          </button>
                          <button onClick={() => onDelete(shift.id)} className="p-1.5 rounded-md text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {offStaff.map((staff) => {
                  const isMe = staff.id === staffUser.id;
                  return (
                    <div key={`off-${key}-${staff.id}`} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-100/60 border border-slate-200/60">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center type-micro font-semibold bg-slate-200 text-slate-400">
                          {staff.firstName?.charAt(0) || "?"}
                        </div>
                        <div>
                          <p className={`type-caption font-medium ${isMe ? "text-slate-500" : "text-slate-400"}`}>
                            {`${staff.firstName} ${staff.lastName || ""}`.trim()}
                            {isMe && <span className="text-slate-400 ml-1">(You)</span>}
                          </p>
                          <p className="type-micro text-slate-400 normal-case">OFF</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Staff Shift Intelligence Modal ─────────────────────────────────────────
function ProfileMetricCard({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <div className="surface-base p-3 rounded-xl border border-slate-200/70">
      <p className="type-micro text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="type-caption font-semibold text-slate-900 mt-1">{value}</p>
      {helper && <p className="type-micro text-slate-400 mt-0.5 normal-case">{helper}</p>}
    </div>
  );
}

function StaffProfileModal({ staffId, onClose }: { staffId: number; onClose: () => void }) {
  const profileQuery = trpc.intelligence.staffShiftProfile.useQuery({ staffId });
  const profile = profileQuery.data as StaffShiftProfileData | null | undefined;
  const shiftProfile = profile?.shiftProfile;
  const reliabilityClass = !shiftProfile
    ? "text-slate-900"
    : shiftProfile.reliabilityScore >= 90
      ? "text-emerald-600"
      : shiftProfile.reliabilityScore >= 75
        ? "text-amber-600"
        : "text-red-500";
  const favoriteDays = shiftProfile?.weeklyPattern
    .filter((day) => day.frequency > 0)
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 3) ?? [];

  return (
    <div className="fixed inset-0 bg-slate-50/80 backdrop-blur-sm z-50 flex items-end justify-center" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-t-2xl p-6 space-y-4 screen-enter max-h-[88dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="type-heading text-slate-900">Staff Shift Intelligence</h3>
            <p className="type-micro text-slate-500 normal-case">Computed from the last 7 completed/no-show shifts.</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 transition-colors"><X size={20} /></button>
        </div>

        {profileQuery.isLoading && (
          <div className="flex items-center justify-center py-12 text-slate-500">
            <Loader2 size={20} className="animate-spin mr-2" />
            <span className="type-caption">Loading profile intelligence…</span>
          </div>
        )}

        {profileQuery.isError && (
          <div className="surface-base p-4 rounded-xl border border-red-200">
            <p className="type-caption text-red-500 font-medium">Profile unavailable</p>
            <p className="type-micro text-slate-500 normal-case mt-1">We could not load this staff member’s shift intelligence right now.</p>
          </div>
        )}

        {!profileQuery.isLoading && !profileQuery.isError && !profile && (
          <div className="surface-base p-4 rounded-xl">
            <p className="type-caption text-slate-600 font-medium">No staff profile found</p>
            <p className="type-micro text-slate-500 normal-case mt-1">This staff member may no longer exist or may not be visible to your account.</p>
          </div>
        )}

        {profile && shiftProfile && (
          <>
            <div className="rounded-xl bg-amber-500/8 border border-amber-500/15 p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-amber-500 text-black flex items-center justify-center type-caption font-bold">
                  {profile.firstName.charAt(0)}{profile.lastName?.charAt(0) || ""}
                </div>
                <div>
                  <p className="type-heading text-slate-900">{profile.firstName} {profile.lastName}</p>
                  <p className="type-micro text-slate-500 normal-case">{formatDepartmentLabel(profile.department)} · {shiftProfile.usualPosition || "No usual station yet"}</p>
                </div>
              </div>
            </div>

            {shiftProfile.totalShiftsAnalyzed === 0 ? (
              <div className="surface-base p-4 rounded-xl">
                <p className="type-caption text-slate-600 font-medium">Not enough completed shift history yet</p>
                <p className="type-micro text-slate-500 normal-case mt-1">Profile trends will appear after this staff member has completed scheduled shifts.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <ProfileMetricCard label="Typical Time" value={`${shiftProfile.typicalStartTime} – ${shiftProfile.typicalEndTime}`} helper="Average start/end" />
                  <ProfileMetricCard label="Avg Shift" value={`${shiftProfile.avgHoursPerShift} hrs`} helper="Per analyzed shift" />
                  <ProfileMetricCard label="Weekly Hours" value={`${shiftProfile.averageHoursPerWeek} hrs`} helper="From recent weeks" />
                  <ProfileMetricCard label="Streak" value={`${shiftProfile.streak} week${shiftProfile.streak === 1 ? "" : "s"}`} helper="Consecutive weeks" />
                </div>

                <div className="surface-base p-4 rounded-xl border border-slate-200/70">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="type-caption font-semibold text-slate-900">Reliability</p>
                      <p className="type-micro text-slate-500 normal-case">Completed shifts versus no-shows</p>
                    </div>
                    <p className={`type-heading ${reliabilityClass}`}>{shiftProfile.reliabilityScore}%</p>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, Math.max(0, shiftProfile.reliabilityScore))}%` }} />
                  </div>
                </div>

                <div className="surface-base p-4 rounded-xl border border-slate-200/70">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="type-caption font-semibold text-slate-900">Work Pattern</p>
                      <p className="type-micro text-slate-500 normal-case">Frequency by day in the analyzed shifts</p>
                    </div>
                    <span className="type-micro text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                      {shiftProfile.crossTraining ? "Cross-trained" : "Single department"}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {shiftProfile.weeklyPattern.map((day) => {
                      const maxFrequency = Math.max(1, ...shiftProfile.weeklyPattern.map((d) => d.frequency));
                      return (
                        <div key={day.day} className="grid grid-cols-[72px_1fr_24px] items-center gap-2">
                          <span className="type-micro text-slate-500">{day.day.slice(0, 3)}</span>
                          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                            <div className="h-full bg-slate-700" style={{ width: `${(day.frequency / maxFrequency) * 100}%` }} />
                          </div>
                          <span className="type-micro text-slate-500 text-right">{day.frequency}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-100/70">
                    <span className="type-micro text-slate-500">Usually works</span>
                    <span className="type-micro text-slate-700 font-medium">{favoriteDays.length ? favoriteDays.map((day) => day.day.slice(0, 3)).join(", ") : "No pattern"}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-100/70">
                    <span className="type-micro text-slate-500">Last shift</span>
                    <span className="type-micro text-slate-700 font-medium">{shiftProfile.lastShiftDate || "No completed shifts"}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-100/70">
                    <span className="type-micro text-slate-500">Shifts analyzed</span>
                    <span className="type-micro text-slate-700 font-medium">{shiftProfile.totalShiftsAnalyzed} of 7</span>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Availability View ──────────────────────────────────────────────────────
function AvailabilityView({ availability, onSet }: {
  availability: any[];
  onSet: (data: { dayOfWeek: number; startTime: string; endTime: string; preference?: "preferred" | "available" | "unavailable" }) => void;
}) {
  const FULL_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const getAvailForDay = (dow: number) => availability.find((a: any) => a.dayOfWeek === dow);

  const [editing, setEditing] = useState<number | null>(null);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("22:00");
  const [preference, setPreference] = useState<"preferred" | "available" | "unavailable">("available");

  const handleSave = (dow: number) => {
    onSet({ dayOfWeek: dow, startTime, endTime, preference });
    setEditing(null);
  };

  return (
    <div className="space-y-2">
      <p className="type-caption text-slate-500 mb-4">Set your weekly availability so managers know when you can work.</p>
      {FULL_DAYS.map((day, dow) => {
        const avail = getAvailForDay(dow);
        const isEditing = editing === dow;

        return (
          <div key={dow} className="surface-base p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="type-caption font-medium text-slate-700">{day}</p>
                {avail ? (
                  <p className="type-micro text-slate-500 normal-case">
                    {avail.startTime} – {avail.endTime}
                    <span className={`ml-2 ${
                      avail.preference === "preferred" ? "text-green-400" :
                      avail.preference === "unavailable" ? "text-red-400" : "text-slate-500"
                    }`}>({avail.preference})</span>
                  </p>
                ) : (
                  <p className="type-micro text-zinc-600 normal-case">Not set</p>
                )}
              </div>
              <button onClick={() => {
                if (avail) { setStartTime(avail.startTime); setEndTime(avail.endTime); setPreference(avail.preference); }
                setEditing(isEditing ? null : dow);
              }} className="text-amber-500 type-caption hover:text-amber-400 transition-colors">
                {isEditing ? "Cancel" : "Edit"}
              </button>
            </div>

            {isEditing && (
              <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="type-micro text-slate-500 mb-1 block">Start</label>
                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                      className="w-full bg-white border border-zinc-700 rounded-lg px-3 py-2 text-slate-900 type-caption" />
                  </div>
                  <div>
                    <label className="type-micro text-slate-500 mb-1 block">End</label>
                    <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                      className="w-full bg-white border border-zinc-700 rounded-lg px-3 py-2 text-slate-900 type-caption" />
                  </div>
                </div>
                <div className="flex gap-2">
                  {(["preferred", "available", "unavailable"] as const).map(p => (
                    <button key={p} onClick={() => setPreference(p)}
                      className={`flex-1 py-2 rounded-lg type-micro font-medium transition-colors ${
                        preference === p
                          ? p === "preferred" ? "bg-green-500/15 text-green-400 border border-green-500/30"
                            : p === "unavailable" ? "bg-red-500/15 text-red-400 border border-red-500/30"
                            : "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                          : "bg-zinc-800 text-slate-500"
                      }`}>
                      {p}
                    </button>
                  ))}
                </div>
                <button onClick={() => handleSave(dow)}
                  className="w-full py-2.5 rounded-lg bg-amber-500 text-black type-caption font-semibold hover:bg-amber-400 transition-colors active:scale-[0.98]">
                  Save
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Requests View ──────────────────────────────────────────────────────────
function RequestsView({ staffUser, isManager, myTimeOff, pendingTimeOff, pendingSwaps, onRequestTimeOff, onApproveTimeOff, onDenyTimeOff }: {
  staffUser: SafeStaff;
  isManager: boolean;
  myTimeOff: any[];
  pendingTimeOff: any[];
  pendingSwaps: any[];
  onRequestTimeOff: (data: { startDate: Date; endDate: Date; reason?: string }) => void;
  onApproveTimeOff: (id: number) => void;
  onDenyTimeOff: (id: number) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    if (!startDate || !endDate) { toast.error("Select both dates"); return; }
    onRequestTimeOff({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason: reason || undefined,
    });
    setShowForm(false);
    setStartDate("");
    setEndDate("");
    setReason("");
  };

  return (
    <div className="space-y-4">
      {/* My Requests */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="type-caption font-medium text-slate-600">My Time Off Requests</p>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 text-amber-500 type-caption hover:text-amber-400 transition-colors">
            <Plus size={14} /> Request
          </button>
        </div>

        {showForm && (
          <div className="surface-base p-4 rounded-xl mb-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="type-micro text-slate-500 mb-1 block">Start Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-white border border-zinc-700 rounded-lg px-3 py-2 text-slate-900 type-caption" />
              </div>
              <div>
                <label className="type-micro text-slate-500 mb-1 block">End Date</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="w-full bg-white border border-zinc-700 rounded-lg px-3 py-2 text-slate-900 type-caption" />
              </div>
            </div>
            <div>
              <label className="type-micro text-slate-500 mb-1 block">Reason (optional)</label>
              <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Family event, appointment, etc."
                className="w-full bg-white border border-zinc-700 rounded-lg px-3 py-2 text-slate-900 type-caption placeholder:text-slate-400" />
            </div>
            <button onClick={handleSubmit}
              className="w-full py-2.5 rounded-lg bg-amber-500 text-black type-caption font-semibold hover:bg-amber-400 transition-colors active:scale-[0.98]">
              Submit Request
            </button>
          </div>
        )}

        {myTimeOff.length === 0 ? (
          <div className="surface-base p-6 rounded-xl text-center">
            <p className="type-caption text-zinc-600">No time off requests</p>
          </div>
        ) : (
          <div className="space-y-2">
            {myTimeOff.map((req: any) => (
              <div key={req.id} className="surface-base p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="type-caption text-slate-700">
                    {new Date(req.startDate).toLocaleDateString()} – {new Date(req.endDate).toLocaleDateString()}
                  </p>
                  {req.reason && <p className="type-micro text-slate-500 normal-case">{req.reason}</p>}
                </div>
                <span className={`type-micro px-2 py-1 rounded-full ${
                  req.status === "approved" ? "bg-green-500/15 text-green-400" :
                  req.status === "denied" ? "bg-red-500/15 text-red-400" :
                  "bg-amber-500/10 text-amber-500"
                }`}>{req.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manager: Pending Approvals */}
      {isManager && pendingTimeOff.length > 0 && (
        <div>
          <p className="type-caption font-medium text-slate-600 mb-3">Pending Approvals ({pendingTimeOff.length})</p>
          <div className="space-y-2">
            {pendingTimeOff.map((req: any) => (
              <div key={req.id} className="surface-base p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <p className="type-caption text-slate-700 font-medium">Staff #{req.staffId}</p>
                  <p className="type-micro text-slate-500 normal-case">
                    {new Date(req.startDate).toLocaleDateString()} – {new Date(req.endDate).toLocaleDateString()}
                  </p>
                </div>
                {req.reason && <p className="type-caption text-slate-500 mb-3">{req.reason}</p>}
                <div className="flex gap-2">
                  <button onClick={() => onApproveTimeOff(req.id)}
                    className="flex-1 py-2 rounded-lg bg-green-500/15 text-green-400 type-caption font-medium hover:bg-green-500/25 transition-colors">
                    <Check size={13} className="inline mr-1" />Approve
                  </button>
                  <button onClick={() => onDenyTimeOff(req.id)}
                    className="flex-1 py-2 rounded-lg bg-red-500/15 text-red-400 type-caption font-medium hover:bg-red-500/25 transition-colors">
                    <X size={13} className="inline mr-1" />Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add Shift Modal ────────────────────────────────────────────────────────
function AddShiftModal({ allStaff, selectedDay, weekDates, createdBy, onClose, onSubmit, isPending }: {
  allStaff: SafeStaff[];
  selectedDay: Date | null;
  weekDates: Date[];
  createdBy: number;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
}) {
  const [staffId, setStaffId] = useState<number>(allStaff[0]?.id || 0);
  const [date, setDate] = useState(selectedDay?.toISOString().split("T")[0] || weekDates[0].toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("11:00");
  const [endTime, setEndTime] = useState("19:00");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState<string>("");

  const handleSubmit = () => {
    if (!staffId || !date || !startTime || !endTime) { toast.error("Fill required fields"); return; }
    onSubmit({
      staffId,
      date: new Date(date + "T00:00:00"),
      startTime,
      endTime,
      position: position || undefined,
      department: (department || undefined) as any,
      createdBy,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-50/80 backdrop-blur-sm z-50 flex items-end justify-center" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-t-2xl p-6 space-y-4 screen-enter" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="type-heading text-slate-900">Add Shift</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 transition-colors"><X size={20} /></button>
        </div>

        <div>
          <label className="type-micro text-slate-500 mb-1 block">Staff Member</label>
          <select value={staffId} onChange={e => setStaffId(Number(e.target.value))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-slate-900 type-caption">
            {allStaff.filter(s => s.status === "active").map(s => (
              <option key={s.id} value={s.id}>{s.firstName} {s.lastName || ""} — {s.department}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="type-micro text-slate-500 mb-1 block">Date</label>
          <select value={date} onChange={e => setDate(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-slate-900 type-caption">
            {weekDates.map(d => (
              <option key={d.toISOString()} value={d.toISOString().split("T")[0]}>
                {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="type-micro text-slate-500 mb-1 block">Start Time</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-slate-900 type-caption" />
          </div>
          <div>
            <label className="type-micro text-slate-500 mb-1 block">End Time</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-slate-900 type-caption" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="type-micro text-slate-500 mb-1 block">Position (optional)</label>
            <input value={position} onChange={e => setPosition(e.target.value)} placeholder="Bar, Grill, Register..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-slate-900 type-caption placeholder:text-slate-400" />
          </div>
          <div>
            <label className="type-micro text-slate-500 mb-1 block">Department</label>
            <select value={department} onChange={e => setDepartment(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-slate-900 type-caption">
              <option value="">Auto</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <button onClick={handleSubmit} disabled={isPending}
          className="w-full py-3 rounded-xl bg-amber-500 text-black font-semibold type-body hover:bg-amber-400 transition-colors active:scale-[0.98] disabled:opacity-50">
          {isPending ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Add Shift"}
        </button>
      </div>
    </div>
  );
}

// ─── Edit Shift Modal ───────────────────────────────────────────────────────
function EditShiftModal({ shift, allStaff, onClose, onSubmit, isPending }: {
  shift: any;
  allStaff: SafeStaff[];
  onClose: () => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
}) {
  if (!shift) return null;

  const [startTime, setStartTime] = useState(shift.startTime);
  const [endTime, setEndTime] = useState(shift.endTime);
  const [position, setPosition] = useState(shift.position || "");
  const [status, setStatus] = useState(shift.status);

  const handleSubmit = () => {
    onSubmit({
      id: shift.id,
      startTime,
      endTime,
      position: position || undefined,
      status,
    });
  };

  const staff = allStaff.find(s => s.id === shift.staffId);

  return (
    <div className="fixed inset-0 bg-slate-50/80 backdrop-blur-sm z-50 flex items-end justify-center" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-t-2xl p-6 space-y-4 screen-enter" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="type-heading text-slate-900">Edit Shift</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 transition-colors"><X size={20} /></button>
        </div>

        <div className="surface-base p-3 rounded-lg">
          <p className="type-caption text-slate-600 font-medium">{staff ? `${staff.firstName} ${staff.lastName || ""}`.trim() : `Staff #${shift.staffId}`}</p>
          <p className="type-micro text-slate-500 normal-case">{new Date(shift.date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="type-micro text-slate-500 mb-1 block">Start Time</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-slate-900 type-caption" />
          </div>
          <div>
            <label className="type-micro text-slate-500 mb-1 block">End Time</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-slate-900 type-caption" />
          </div>
        </div>

        <div>
          <label className="type-micro text-slate-500 mb-1 block">Position</label>
          <input value={position} onChange={e => setPosition(e.target.value)} placeholder="Bar, Grill, Register..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-slate-900 type-caption placeholder:text-slate-400" />
        </div>

        <div>
          <label className="type-micro text-slate-500 mb-1 block">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-slate-900 type-caption">
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="no_show">No Show</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <button onClick={handleSubmit} disabled={isPending}
          className="w-full py-3 rounded-xl bg-amber-500 text-black font-semibold type-body hover:bg-amber-400 transition-colors active:scale-[0.98] disabled:opacity-50">
          {isPending ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

// ─── Weekly Hours Report (Manager) ─────────────────────────────────────────
function WeeklyHoursReport({ allStaff }: { allStaff: SafeStaff[] }) {
  const hoursQuery = trpc.timeClock.allWeeklyHours.useQuery();
  const activeQuery = trpc.timeClock.allActive.useQuery();

  const hoursData = hoursQuery.data ?? [];
  const activeClocks = activeQuery.data ?? [];

  // Merge hours data with staff names
  const staffHours = useMemo(() => {
    const result = allStaff.map(s => {
      const hours = hoursData.find(h => h.staffId === s.id);
      const isActive = activeClocks.some((c: any) => c.staffId === s.id);
      return {
        ...s,
        totalHours: hours?.totalHours ?? 0,
        overtime: hours?.overtime ?? 0,
        shifts: hours?.shifts ?? 0,
        isActive,
      };
    });
    // Sort by hours descending
    return result.sort((a, b) => b.totalHours - a.totalHours);
  }, [allStaff, hoursData, activeClocks]);

  const totalLabor = staffHours.reduce((sum, s) => sum + s.totalHours, 0);
  const totalOvertime = staffHours.reduce((sum, s) => sum + s.overtime, 0);
  const activeClockedIn = staffHours.filter(s => s.isActive).length;

  if (hoursQuery.isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-16 rounded-xl bg-white animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="surface-base rounded-xl p-3 text-center">
          <p className="type-micro text-slate-500">Total Hours</p>
          <p className="type-heading text-slate-900">{totalLabor.toFixed(1)}</p>
        </div>
        <div className={`surface-base rounded-xl p-3 text-center ${totalOvertime > 0 ? "border border-red-500/30" : ""}`}>
          <p className="type-micro text-slate-500">Overtime</p>
          <p className={`type-heading ${totalOvertime > 0 ? "text-red-400" : "text-slate-900"}`}>{totalOvertime.toFixed(1)}</p>
        </div>
        <div className="surface-base rounded-xl p-3 text-center">
          <p className="type-micro text-slate-500">Clocked In</p>
          <p className="type-heading text-green-400">{activeClockedIn}</p>
        </div>
      </div>

      {/* Staff List */}
      <div className="space-y-2">
        {staffHours.map(s => {
          const pct = Math.min(100, (s.totalHours / 40) * 100);
          const isOvertime = s.overtime > 0;
          const isApproaching = s.totalHours >= 35 && !isOvertime;

          return (
            <div key={s.id} className="surface-base rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center type-micro font-bold ${
                    s.isActive ? "bg-green-500/20 text-green-400" : "bg-zinc-800 text-slate-500"
                  }`}>
                    {s.firstName[0]}
                  </div>
                  <div>
                    <p className="type-caption text-slate-900 font-medium">{s.firstName} {s.lastName}</p>
                    <p className="type-micro text-slate-500">{s.shifts} shifts • {s.department}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`type-body font-semibold ${isOvertime ? "text-red-400" : isApproaching ? "text-amber-400" : "text-slate-900"}`}>
                    {s.totalHours.toFixed(1)}h
                  </p>
                  {isOvertime && (
                    <p className="type-micro text-red-400 flex items-center gap-1">
                      <AlertTriangle size={10} /> +{s.overtime.toFixed(1)} OT
                    </p>
                  )}
                  {isApproaching && (
                    <p className="type-micro text-amber-400">Approaching 40</p>
                  )}
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isOvertime ? "bg-red-500" : isApproaching ? "bg-amber-500" : "bg-amber-500/60"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}

        {staffHours.length === 0 && (
          <div className="text-center py-12">
            <Clock className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
            <p className="type-caption text-slate-500">No hours logged this week</p>
          </div>
        )}
      </div>
    </div>
  );
}
