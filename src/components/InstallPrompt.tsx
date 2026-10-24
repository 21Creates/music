import { useState, useEffect } from 'react';
import { X, Share, Plus } from 'lucide-react';

let deferredPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

window.addEventListener('beforeinstallprompt', (e: Event) => {
  e.preventDefault();
  deferredPrompt = e as BeforeInstallPromptEvent;
  window.dispatchEvent(new CustomEvent('install-available'));
});

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
}

const DISMISS_KEY = 'vinyl-install-dismissed';
const DISMISS_DAYS = 14;

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [showIOS, setShowIOS] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const days = (Date.now() - parseInt(dismissed, 10)) / (1000 * 60 * 60 * 24);
      if (days < DISMISS_DAYS) return;
    }

    if (deferredPrompt) {
      setVisible(true);
      return;
    }

    const onAvailable = () => setVisible(true);
    window.addEventListener('install-available', onAvailable);

    if (isIOS() && !deferredPrompt) {
      setShowIOS(true);
      setVisible(true);
    }

    return () => window.removeEventListener('install-available', onAvailable);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'dismissed') {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    }
    deferredPrompt = null;
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-[150] animate-slide-up">
      <div className="glass-card p-4 shadow-2xl">
        <button onClick={handleDismiss} className="absolute top-2 right-2 btn-icon-sm">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-electric-500 to-electric-700 flex items-center justify-center shrink-0 shadow-lg shadow-electric-500/20">
            <svg viewBox="0 0 512 512" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
              <g transform="translate(256 256)">
                <circle r="140" fill="none" stroke="#fff" stroke-width="8" opacity="0.3"/>
                <circle r="56" fill="none" stroke="#fff" stroke-width="6"/>
                <circle r="8" fill="#fff"/>
              </g>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-ink-100">Install Vinyl</p>
            <p className="text-xs text-muted mt-0.5">
              {showIOS
                ? 'Tap the Share button below, then "Add to Home Screen"'
                : 'Add to your home screen for a full-screen experience'}
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          {showIOS ? (
            <div className="flex items-center gap-3 w-full text-xs text-muted">
              <div className="flex items-center gap-1.5">
                <Share className="w-4 h-4 text-electric-400" />
                <span>Share</span>
              </div>
              <div className="flex-1 h-px bg-white/[0.06]" />
              <div className="flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-electric-400" />
                <span>Add to Home Screen</span>
              </div>
            </div>
          ) : (
            <>
              <button onClick={handleDismiss} className="btn-ghost flex-1 !py-2 text-xs">
                Not now
              </button>
              <button onClick={handleInstall} className="btn-primary flex-1 !py-2 text-xs flex items-center justify-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Install
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
