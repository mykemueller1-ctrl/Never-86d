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
const DEPARTMENTS: Array<"bar" | "kitchen" | "driver" | "server" | "management"> = ["bar", "kitchen", "driver", "server", "management"];

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

export default function ScheduleScreen({ staffUser, allStaff, onBack }: Props) {
  const isManager = MANAGER_ROLES.includes(staffUser.jobRole);
  const [weekOffset, setWeekOffset] = useState(0);
  const [tab, setTab] = useState<"schedule" | "availability" | "requests">(isManager ? "schedule" : "schedule");
  const [showAddShift, setShowAddShift] = useState(false);
  const [editingShift, setEditingShift] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const startDate = weekDates[0];
  const endDate = new Date(weekDates[6]);
  endDate.setHours(23, 59, 59, 999);

  // Queries
  const scheduleQuery = isManager
    ? trpc.schedule.getWeek.useQuery({ startDate, endDate })
    : trpc.schedule.getByStaff.useQuery({ staffId: staffUser.id, startDate, endDate });

  const myAvailability = trpc.availability.getByStaff.useQuery({ staffId: staffUser.id });
  const myTimeOff = trpc.timeOff.myRequests.useQuery({ staffId: staffUser.id });
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

  // Group shifts by date for the grid
  const shiftsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const d of weekDates) {
      const key = d.toISOString().split("T")[0];
      map[key] = [];
    }
    for (const s of shifts) {
      const key = new Date(s.date).toISOString().split("T")[0];
      if (map[key]) map[key].push(s);
    }
    return map;
  }, [shifts, weekDates]);

  return (
    <div className="h-screen bg-black flex flex-col screen-enter">
      {/* Header */}
      <div className="px-6 pt-10 pb-2">
        <button onClick={onBack} className="text-amber-500 type-caption mb-3 flex items-center gap-1 hover:text-amber-400 transition-colors">
          <ChevronLeft size={16} /> Back
        </button>
        <div className="flex items-center justify-between">
          <h2 className="type-display text-white">{isManager ? "Schedule" : "My Schedule"}</h2>
          {isManager && (
            <button onClick={() => { setSelectedDay(weekDates[0]); setShowAddShift(true); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 text-black type-caption font-semibold hover:bg-amber-400 transition-colors active:scale-95">
              <Plus size={14} /> Add Shift
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 py-3 flex gap-2">
        {["schedule", "availability", "requests"].map(t => (
          <button key={t} onClick={() => setTab(t as any)}
            className={`px-4 py-2 rounded-lg type-caption font-medium transition-colors ${
              tab === t ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "text-zinc-500 hover:text-zinc-300"
            }`}>
            {t === "schedule" ? "Schedule" : t === "availability" ? "Availability" : "Requests"}
          </button>
        ))}
      </div>

      {/* Week Navigation */}
      {tab === "schedule" && (
        <div className="px-6 pb-3 flex items-center justify-between">
          <button onClick={() => setWeekOffset(o => o - 1)} className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <p className="type-caption text-zinc-300 font-medium">{formatWeekLabel(weekDates)}</p>
            {weekOffset !== 0 && (
              <button onClick={() => setWeekOffset(0)} className="type-micro text-amber-500 mt-0.5">Today</button>
            )}
          </div>
          <button onClick={() => setWeekOffset(o => o + 1)} className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-8">
        {tab === "schedule" && (
          <ScheduleGrid
            weekDates={weekDates}
            shiftsByDate={shiftsByDate}
            staffUser={staffUser}
            allStaff={allStaff}
            isManager={isManager}
            onEdit={(id) => setEditingShift(id)}
            onDelete={(id) => deleteShift.mutate({ id })}
            isLoading={scheduleQuery.isLoading}
          />
        )}

        {tab === "availability" && (
          <AvailabilityView
            staffId={staffUser.id}
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
      </div>

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
function ScheduleGrid({ weekDates, shiftsByDate, staffUser, allStaff, isManager, onEdit, onDelete, isLoading }: {
  weekDates: Date[];
  shiftsByDate: Record<string, any[]>;
  staffUser: SafeStaff;
  allStaff: SafeStaff[];
  isManager: boolean;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  isLoading: boolean;
}) {
  const today = new Date().toISOString().split("T")[0];

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

  if (totalShifts === 0 && !isManager) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Calendar size={40} className="text-zinc-700 mb-4" />
        <p className="type-heading text-zinc-400 mb-2">No shifts scheduled</p>
        <p className="type-body text-zinc-600 text-center">Your schedule for this week hasn't been posted yet. Check back later or ask your manager.</p>
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

        return (
          <div key={key} className={`rounded-xl p-4 transition-colors ${
            isToday ? "bg-amber-500/5 border border-amber-500/15" : "surface-base"
          } ${isPast ? "opacity-60" : ""}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`type-caption font-semibold ${isToday ? "text-amber-500" : "text-zinc-300"}`}>
                  {dayLabel}
                </span>
                <span className="type-caption text-zinc-500">{dateLabel}</span>
                {isToday && <span className="type-micro text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">Today</span>}
              </div>
              <span className="type-micro text-zinc-600">{dayShifts.length} shift{dayShifts.length !== 1 ? "s" : ""}</span>
            </div>

            {dayShifts.length === 0 ? (
              <p className="type-caption text-zinc-600 italic">No shifts</p>
            ) : (
              <div className="space-y-1.5">
                {dayShifts.map((shift: any) => {
                  const staff = allStaff.find(s => s.id === shift.staffId);
                  const isMe = shift.staffId === staffUser.id;
                  return (
                    <div key={shift.id} className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                      isMe ? "bg-amber-500/8 border border-amber-500/10" : "bg-zinc-900/50"
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center type-micro font-semibold ${
                          isMe ? "bg-amber-500 text-black" : "bg-zinc-800 text-zinc-400"
                        }`}>
                          {staff?.firstName?.charAt(0) || "?"}
                        </div>
                        <div>
                          <p className={`type-caption font-medium ${isMe ? "text-amber-500" : "text-zinc-200"}`}>
                            {staff ? `${staff.firstName} ${staff.lastName || ""}`.trim() : `Staff #${shift.staffId}`}
                            {isMe && <span className="text-amber-600 ml-1">(You)</span>}
                          </p>
                          <p className="type-micro text-zinc-500 normal-case">
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
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Availability View ──────────────────────────────────────────────────────
function AvailabilityView({ staffId, availability, onSet }: {
  staffId: number;
  availability: any[];
  onSet: (data: { staffId: number; dayOfWeek: number; startTime: string; endTime: string; preference?: "preferred" | "available" | "unavailable" }) => void;
}) {
  const FULL_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const getAvailForDay = (dow: number) => availability.find((a: any) => a.dayOfWeek === dow);

  const [editing, setEditing] = useState<number | null>(null);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("22:00");
  const [preference, setPreference] = useState<"preferred" | "available" | "unavailable">("available");

  const handleSave = (dow: number) => {
    onSet({ staffId, dayOfWeek: dow, startTime, endTime, preference });
    setEditing(null);
  };

  return (
    <div className="space-y-2">
      <p className="type-caption text-zinc-500 mb-4">Set your weekly availability so managers know when you can work.</p>
      {FULL_DAYS.map((day, dow) => {
        const avail = getAvailForDay(dow);
        const isEditing = editing === dow;

        return (
          <div key={dow} className="surface-base p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="type-caption font-medium text-zinc-200">{day}</p>
                {avail ? (
                  <p className="type-micro text-zinc-500 normal-case">
                    {avail.startTime} – {avail.endTime}
                    <span className={`ml-2 ${
                      avail.preference === "preferred" ? "text-green-400" :
                      avail.preference === "unavailable" ? "text-red-400" : "text-zinc-400"
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
              <div className="mt-3 pt-3 border-t border-zinc-800 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="type-micro text-zinc-500 mb-1 block">Start</label>
                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white type-caption" />
                  </div>
                  <div>
                    <label className="type-micro text-zinc-500 mb-1 block">End</label>
                    <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white type-caption" />
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
                          : "bg-zinc-800 text-zinc-500"
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
  onRequestTimeOff: (data: { staffId: number; startDate: Date; endDate: Date; reason?: string }) => void;
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
      staffId: staffUser.id,
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
          <p className="type-caption font-medium text-zinc-300">My Time Off Requests</p>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 text-amber-500 type-caption hover:text-amber-400 transition-colors">
            <Plus size={14} /> Request
          </button>
        </div>

        {showForm && (
          <div className="surface-base p-4 rounded-xl mb-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="type-micro text-zinc-500 mb-1 block">Start Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white type-caption" />
              </div>
              <div>
                <label className="type-micro text-zinc-500 mb-1 block">End Date</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white type-caption" />
              </div>
            </div>
            <div>
              <label className="type-micro text-zinc-500 mb-1 block">Reason (optional)</label>
              <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Family event, appointment, etc."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white type-caption placeholder:text-zinc-600" />
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
                  <p className="type-caption text-zinc-200">
                    {new Date(req.startDate).toLocaleDateString()} – {new Date(req.endDate).toLocaleDateString()}
                  </p>
                  {req.reason && <p className="type-micro text-zinc-500 normal-case">{req.reason}</p>}
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
          <p className="type-caption font-medium text-zinc-300 mb-3">Pending Approvals ({pendingTimeOff.length})</p>
          <div className="space-y-2">
            {pendingTimeOff.map((req: any) => (
              <div key={req.id} className="surface-base p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <p className="type-caption text-zinc-200 font-medium">Staff #{req.staffId}</p>
                  <p className="type-micro text-zinc-500 normal-case">
                    {new Date(req.startDate).toLocaleDateString()} – {new Date(req.endDate).toLocaleDateString()}
                  </p>
                </div>
                {req.reason && <p className="type-caption text-zinc-500 mb-3">{req.reason}</p>}
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center" onClick={onClose}>
      <div className="w-full max-w-md bg-zinc-900 rounded-t-2xl p-6 space-y-4 screen-enter" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="type-heading text-white">Add Shift</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        <div>
          <label className="type-micro text-zinc-500 mb-1 block">Staff Member</label>
          <select value={staffId} onChange={e => setStaffId(Number(e.target.value))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white type-caption">
            {allStaff.filter(s => s.status === "active").map(s => (
              <option key={s.id} value={s.id}>{s.firstName} {s.lastName || ""} — {s.department}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="type-micro text-zinc-500 mb-1 block">Date</label>
          <select value={date} onChange={e => setDate(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white type-caption">
            {weekDates.map(d => (
              <option key={d.toISOString()} value={d.toISOString().split("T")[0]}>
                {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="type-micro text-zinc-500 mb-1 block">Start Time</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white type-caption" />
          </div>
          <div>
            <label className="type-micro text-zinc-500 mb-1 block">End Time</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white type-caption" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="type-micro text-zinc-500 mb-1 block">Position (optional)</label>
            <input value={position} onChange={e => setPosition(e.target.value)} placeholder="Bar, Grill, Register..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white type-caption placeholder:text-zinc-600" />
          </div>
          <div>
            <label className="type-micro text-zinc-500 mb-1 block">Department</label>
            <select value={department} onChange={e => setDepartment(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white type-caption">
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center" onClick={onClose}>
      <div className="w-full max-w-md bg-zinc-900 rounded-t-2xl p-6 space-y-4 screen-enter" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="type-heading text-white">Edit Shift</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        <div className="surface-base p-3 rounded-lg">
          <p className="type-caption text-zinc-300 font-medium">{staff ? `${staff.firstName} ${staff.lastName || ""}`.trim() : `Staff #${shift.staffId}`}</p>
          <p className="type-micro text-zinc-500 normal-case">{new Date(shift.date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="type-micro text-zinc-500 mb-1 block">Start Time</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white type-caption" />
          </div>
          <div>
            <label className="type-micro text-zinc-500 mb-1 block">End Time</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white type-caption" />
          </div>
        </div>

        <div>
          <label className="type-micro text-zinc-500 mb-1 block">Position</label>
          <input value={position} onChange={e => setPosition(e.target.value)} placeholder="Bar, Grill, Register..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white type-caption placeholder:text-zinc-600" />
        </div>

        <div>
          <label className="type-micro text-zinc-500 mb-1 block">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white type-caption">
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
