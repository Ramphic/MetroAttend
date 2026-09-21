import React, { useState, useEffect } from 'react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem('pwa_prompt_dismissed') === 'true';
  });

  useEffect(() => {
    // Check if already running in standalone mode (installed PWA)
    const standalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (navigator as any).standalone === true ||
      document.referrer.includes('android-app://');
      
    setIsStandalone(standalone);
    if (standalone) return;

    // Detect device environment
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    const androidDevice = /android/.test(userAgent);
    setIsIOS(iosDevice);
    setIsAndroid(androidDevice);

    // Capture Chrome / Edge / Android install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Auto-show prompt on first visit if not dismissed
      if (!sessionStorage.getItem('pwa_prompt_dismissed')) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // If on iOS or mobile device and not dismissed, show install helper after 2 seconds
    if (!standalone && !sessionStorage.getItem('pwa_prompt_dismissed')) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2500);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setShowPrompt(false);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    } else {
      // If deferredPrompt is not yet ready, show manual guide
      setShowPrompt(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  // If already installed, hide everything
  if (isStandalone) return null;

  return (
    <>
      {/* Persistent floating button on bottom-left so user can install anytime */}
      {!showPrompt && (
        <div className="fixed bottom-20 sm:bottom-4 left-4 z-40">
          <button
            onClick={() => setShowPrompt(true)}
            className="flex items-center gap-2 bg-navy hover:bg-navy-dark text-white px-3.5 py-2 rounded-2xl shadow-xl border border-white/20 text-xs font-display font-bold transition-all active:scale-95 cursor-pointer group"
            title="Install MetroAttend to your device"
          >
            <div className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center text-xs">
              📲
            </div>
            <span>Install App</span>
          </button>
        </div>
      )}

      {/* Main Install Guide & Trigger Modal */}
      {showPrompt && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-border space-y-4 animate-in slide-in-from-bottom-4 duration-300">
            {/* Header with App Logo */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <img 
                  src="/apple-touch-icon.png" 
                  alt="MetroAttend" 
                  className="w-13 h-13 rounded-2xl shadow-md border border-slate-100 object-cover" 
                />
                <div>
                  <h3 className="text-base font-display font-800 text-slate-900">Install MetroAttend</h3>
                  <p className="text-slate-500 text-xs mt-0.5">MetroWorks Infrastructure Services</p>
                  <span className="inline-block mt-1 bg-emerald-50 text-emerald-700 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full">
                    OFFICIAL MOBILE APPLICATION
                  </span>
                </div>
              </div>
              <button 
                onClick={handleDismiss}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-600 text-xs leading-relaxed">
              Install the MetroAttend app to your home screen for high-precision GPS geofencing, shift notifications, and fast clock-in without entering URLs.
            </p>

            {/* If browser supports 1-click install (Chrome / Edge / Android with prompt) */}
            {deferredPrompt && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-xs text-emerald-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">✓</span>
                  <span className="font-semibold">Your device is ready for 1-click install</span>
                </div>
              </div>
            )}

            {/* Apple iOS Safari Instructions */}
            {isIOS && (
              <div className="bg-navy-50 border border-navy/15 rounded-2xl p-4 space-y-2.5">
                <div className="text-xs font-display font-bold text-navy flex items-center gap-1.5">
                  <span>📱 Apple iOS Safari Installation:</span>
                </div>
                <div className="space-y-2.5 text-xs text-navy/80">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-navy text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">1</span>
                    <span>Tap the <strong>Share icon</strong> at the bottom of Safari (
                      <svg className="inline-block -mt-1 mx-0.5 text-navy" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                      )
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-navy text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">2</span>
                    <span>Scroll down and tap <strong>Add to Home Screen</strong></span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-navy text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">3</span>
                    <span>Tap <strong>Add</strong> in the top-right corner</span>
                  </div>
                </div>
              </div>
            )}

            {/* Android / Chrome Manual Instructions (when prompt is waiting) */}
            {!isIOS && !deferredPrompt && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                <div className="text-xs font-display font-bold text-slate-800 flex items-center gap-1.5">
                  <span>🌐 Browser Installation Steps:</span>
                </div>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">1</span>
                    <span>Tap the <strong>three dots (⋮)</strong> menu in the top-right corner of Chrome / Edge.</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">2</span>
                    <span>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleDismiss}
                className="flex-1 py-3 px-4 rounded-xl border border-border text-slate-600 font-display font-bold text-xs hover:bg-surface transition-colors cursor-pointer"
              >
                Close
              </button>
              
              {deferredPrompt ? (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="flex-1 py-3 px-4 rounded-xl bg-navy text-white font-display font-bold text-xs hover:bg-navy-dark transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Install App Now
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="flex-1 py-3 px-4 rounded-xl bg-navy text-white font-display font-bold text-xs hover:bg-navy-dark transition-all shadow-md text-center cursor-pointer"
                >
                  Got It
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
