import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

/**
 * PWA Install Prompt — shows a subtle banner when the app can be installed.
 * Dismisses permanently after user clicks "Install" or "X".
 */
export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    if (localStorage.getItem("pwa-install-dismissed")) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (dismissed || !deferredPrompt) return null;

  const handleInstall = async () => {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem("pwa-install-dismissed", "1");
    }
    setDeferredPrompt(null);
    setDismissed(true);
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa-install-dismissed", "1");
    setDismissed(true);
  };

  return (
    <div className="fixed top-4 left-4 right-4 z-[9999] animate-in slide-in-from-top">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3 shadow-xl">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">Install Never 86'd</p>
          <p className="text-xs text-zinc-400">Add to home screen for quick access</p>
        </div>
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 bg-amber-500 text-black text-xs font-semibold rounded-lg shrink-0"
        >
          Install
        </button>
        <button onClick={handleDismiss} className="p-1 text-zinc-500 hover:text-zinc-300">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
