/**
 * PIN Change Screen — Staff can change their own PIN
 * Requires current PIN verification before allowing change
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ChevronLeft, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import type { SafeStaff } from "../../../shared/types";

interface Props {
  staffUser: SafeStaff;
  onBack: () => void;
}

export default function PinChangeScreen({ staffUser, onBack }: Props) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [success, setSuccess] = useState(false);

  const changePinMutation = trpc.pinManagement.changePin.useMutation({
    onSuccess: () => {
      setSuccess(true);
      toast.success("PIN changed successfully");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to change PIN");
    },
  });

  const handleSubmit = () => {
    if (!currentPin || currentPin.length < 4) {
      toast.error("Enter your current PIN (4+ digits)");
      return;
    }
    if (!newPin || newPin.length < 4) {
      toast.error("New PIN must be at least 4 digits");
      return;
    }
    if (newPin !== confirmPin) {
      toast.error("New PINs don't match");
      return;
    }
    if (currentPin === newPin) {
      toast.error("New PIN must be different from current PIN");
      return;
    }
    changePinMutation.mutate({ currentPin, newPin });
  };

  if (success) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center px-6 screen-enter">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
          <CheckCircle2 size={32} className="text-emerald-400" />
        </div>
        <h2 className="text-white text-lg font-semibold mb-2">PIN Changed</h2>
        <p className="text-zinc-400 text-sm text-center mb-6">Your new PIN is active. Use it next time you log in.</p>
        <button
          onClick={onBack}
          className="px-6 py-3 bg-amber-500 text-black font-semibold rounded-xl text-sm"
        >
          Back to Profile
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex flex-col overflow-y-auto pb-24 screen-enter">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center gap-3 px-5 py-4">
          <button onClick={onBack} className="text-zinc-400 hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-white font-semibold text-base tracking-tight">Change PIN</h1>
            <p className="text-zinc-500 text-xs">Update your login PIN</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Security Notice */}
        <div className="bg-amber-900/20 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
          <Lock size={16} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-amber-400 text-xs font-semibold">Security Notice</p>
            <p className="text-amber-300/60 text-[10px] mt-1">
              Your PIN is your identity. Never share it. Choose something only you would know.
              PINs must be 4-8 digits.
            </p>
          </div>
        </div>

        {/* Current PIN */}
        <div className="space-y-2">
          <label className="text-zinc-400 text-xs uppercase tracking-wider">Current PIN</label>
          <div className="relative">
            <input
              type={showCurrent ? "text" : "password"}
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="Enter current PIN"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 font-mono tracking-widest"
              inputMode="numeric"
            />
            <button
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/5" />

        {/* New PIN */}
        <div className="space-y-2">
          <label className="text-zinc-400 text-xs uppercase tracking-wider">New PIN</label>
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="Enter new PIN (4-8 digits)"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 font-mono tracking-widest"
              inputMode="numeric"
            />
            <button
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {newPin.length > 0 && newPin.length < 4 && (
            <p className="text-red-400 text-[10px]">PIN must be at least 4 digits</p>
          )}
        </div>

        {/* Confirm New PIN */}
        <div className="space-y-2">
          <label className="text-zinc-400 text-xs uppercase tracking-wider">Confirm New PIN</label>
          <input
            type="password"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="Re-enter new PIN"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 font-mono tracking-widest"
            inputMode="numeric"
          />
          {confirmPin.length > 0 && confirmPin !== newPin && (
            <p className="text-red-400 text-[10px]">PINs don't match</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={changePinMutation.isPending || !currentPin || !newPin || !confirmPin || newPin !== confirmPin || newPin.length < 4}
          className="w-full py-3.5 bg-amber-500 text-black font-semibold rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {changePinMutation.isPending ? "Changing..." : "Change PIN"}
        </button>
      </div>
    </div>
  );
}
