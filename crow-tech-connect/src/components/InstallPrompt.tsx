import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "crowtech_install_dismissed_at";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const InstallPrompt = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Skip if already installed (running standalone)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    // Respect recent dismissal
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL_MS) return;

    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !/Android/.test(ua);
    setIsIOS(ios);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS doesn't fire beforeinstallprompt — show manual instructions banner
    if (ios) {
      const t = setTimeout(() => setVisible(true), 1500);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onPrompt);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted" || outcome === "dismissed") {
      dismiss();
      setDeferred(null);
    }
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Install CrowTech"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-1.5rem)] max-w-md animate-in slide-in-from-bottom-4 fade-in"
    >
      <div className="rounded-2xl border border-border bg-card text-card-foreground shadow-2xl p-4 flex items-center gap-3">
        <img
          src="/pwa-192x192.png"
          alt="CrowTech"
          className="h-12 w-12 rounded-xl flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Install CrowTech</p>
          <p className="text-xs text-muted-foreground truncate">
            {isIOS
              ? "Tap Share, then Add to Home Screen"
              : "Get faster access from your home screen"}
          </p>
        </div>
        {!isIOS && deferred && (
          <Button size="sm" onClick={install} className="flex-shrink-0">
            <Download className="h-4 w-4 mr-1" />
            Install
          </Button>
        )}
        <button
          aria-label="Dismiss"
          onClick={dismiss}
          className="p-1 rounded-md hover:bg-muted flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
