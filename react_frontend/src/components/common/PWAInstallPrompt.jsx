/**
 * PWA Install Prompt
 * 
 * Beautiful custom install prompt that replaces the default browser dialog.
 * Uses the app's database-driven theme colors (primary, button).
 * Intercepts `beforeinstallprompt` so the native Chrome modal never auto-shows.
 *
 * Event API (on window):
 *   pwa:installable  → fired when installable (navbar listens to show Install button)
 *   pwa:installed    → fired after install (navbar listens to hide Install button)
 *   pwa:show         → received to open modal (navbar button fires this)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Download, X, Monitor, Smartphone, WifiOff, Database, RefreshCw } from 'lucide-react';

export default function PWAInstallPrompt() {
  const promptRef = useRef(null);   // deferred prompt in a ref so event handlers never go stale
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Already running as installed standalone app
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Capture deferred install prompt — prevents Chrome's automatic dialog
    const onBeforeInstall = (e) => {
      e.preventDefault();
      promptRef.current = e;
      window.dispatchEvent(new CustomEvent('pwa:installable'));
      // Auto-show; respect 24h dismiss cooldown
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (dismissed && Date.now() - parseInt(dismissed, 10) < 86_400_000) return;
      setShowPrompt(true);
    };

    // App was installed (our modal or via address bar)
    const onInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      promptRef.current = null;
      window.dispatchEvent(new CustomEvent('pwa:installed'));
    };

    // Navbar "Install App" button fires this to open the modal
    const onShow = () => {
      if (promptRef.current) setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('pwa:show', onShow);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('pwa:show', onShow);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!promptRef.current) return;
    promptRef.current.prompt();
    const { outcome } = await promptRef.current.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    promptRef.current = null;
    setShowPrompt(false);
  }, []);

  const handleDismiss = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setShowPrompt(false);
      setIsClosing(false);
      localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    }, 250);
  }, []);

  if (!showPrompt || isInstalled) return null;

  const features = [
    { icon: WifiOff, label: 'Works offline', desc: 'Access your data anytime' },
    { icon: Smartphone, label: 'Mobile ready', desc: 'Feels like a native app' },
    { icon: Database, label: 'Auto-sync', desc: 'Changes sync when online' },
    { icon: RefreshCw, label: 'Always updated', desc: 'Latest version auto-installs' },
  ];

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm [-webkit-backdrop-filter:blur(4px)] ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
      onClick={handleDismiss}
    >
      <div
        className={`w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-primary-300 dark:border-primary-700 relative overflow-hidden ${isClosing ? 'animate-slideDown' : 'animate-slideUp'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient header */}
        <div className="relative bg-gradient-to-br from-button-600 via-button-500 to-primary-600 px-6 py-8 text-center overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-0 left-0 w-24 h-24 bg-white/10 rounded-full -translate-x-8 -translate-y-8" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-10 translate-y-10" />
          <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X size={18} />
          </button>

          {/* App icon */}
          <div className="relative mx-auto w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-4">
            <img
              src="/KJPLogo.png"
              alt="KJP Ricemill"
              className="w-14 h-14 object-contain rounded-lg"
            />
          </div>

          <h2 className="text-xl font-bold text-white relative">
            Install KJP Ricemill
          </h2>
          <p className="text-white/80 text-sm mt-1 relative">
            Get the full app experience on your device
          </p>
        </div>

        {/* Features grid */}
        <div className="px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
            {features.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-button-500/15 dark:bg-button-400/20 flex items-center justify-center">
                  <Icon size={16} className="text-button-600 dark:text-button-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-tight">
                    {label}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight mt-0.5">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-2.5 rounded-xl border-2 border-primary-200 dark:border-primary-700 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
          >
            Not Now
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 px-4 py-2.5 rounded-xl bg-button-500 hover:bg-button-600 text-white text-sm font-bold shadow-lg shadow-button-500/25 transition-all hover:shadow-xl hover:shadow-button-500/30 flex items-center justify-center gap-2"
          >
            <Download size={16} />
            Install App
          </button>
        </div>

        {/* Device indicator */}
        <div className="px-5 pb-4">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
            <Monitor size={12} />
            <span>Available on desktop &amp; mobile</span>
            <Smartphone size={12} />
          </div>
        </div>
      </div>
    </div>
  );
}
