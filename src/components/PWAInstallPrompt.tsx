import React, { useState, useEffect } from 'react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode (already installed)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iosDevice);

    // Check if user dismissed recently in this session
    const dismissed = sessionStorage.getItem('pwa_prompt_dismissed');

    // Handle Android / Chrome / Desktop PWA prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // For iOS devices not yet in standalone mode, show friendly guide if not dismissed
    if (iosDevice && !standalone && !dismissed) {
      // Delay slightly for smooth page load
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 1500);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setMinimized(true);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (isStandalone) return null;

  return (
    <>
      {/* Floating mini-button when dismissed */}
      {minimized && !showPrompt && (
        <button
          onClick={() => setShowPrompt(true)}
          className="fixed bottom-20 right-4 z-40 bg-navy text-white px-3.5 py-2 rounded-2xl shadow-xl border border-white/20 flex items-center gap-2 text-xs font-display font-bold hover:scale-105 active:scale-95 transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Install App
        </button>
      )}

      {/* Main Install Popup Modal / Banner */}
      {showPrompt && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-border space-y-4">
            {/* Header with App Logo */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <img 
                  src="/apple-touch-icon.png" 
                  alt="MetroAttend" 
                  className="w-14 h-14 rounded-2xl shadow-md border border-slate-100 object-cover" 
                />
                <div>
                  <h3 className="text-base font-display font-800 text-slate-900">Install MetroAttend</h3>
                  <p className="text-slate-500 text-xs mt-0.5">MetroWorks Infrastructure Services</p>
                  <span className="inline-block mt-1 bg-emerald-50 text-emerald-700 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full">
                    OFFICIAL APPLICATION
                  </span>
                </div>
              </div>
              <button 
                onClick={handleDismiss}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                title="Close"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-600 text-xs leading-relaxed">
              Install the official mobile app to your home screen for high-precision GPS check-ins, shift notifications, and offline operation.
            </p>

            {/* iOS Specific Instructions */}
            {isIOS ? (
              <div className="bg-navy-50 border border-navy/10 rounded-2xl p-4 space-y-2.5">
                <div className="text-xs font-display font-bold text-navy flex items-center gap-1.5">
                  <span>📱 Apple iOS Installation:</span>
                </div>
                <div className="space-y-2 text-xs text-navy/80">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-navy text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">1</span>
                    <span>Tap the <strong>Share button</strong> in Safari (
                      <svg className="inline-block -mt-1 mx-0.5 text-navy" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                      )
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-navy text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">2</span>
                    <span>Scroll down and select <strong>Add to Home Screen</strong></span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-navy text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">3</span>
                    <span>Tap <strong>Add</strong> at top right to complete installation</span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleDismiss}
                className="flex-1 py-3 px-4 rounded-xl border border-border text-slate-600 font-display font-bold text-xs hover:bg-surface transition-colors"
              >
                Not Now
              </button>
              
              {!isIOS ? (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="flex-1 py-3 px-4 rounded-xl bg-navy text-white font-display font-bold text-xs hover:bg-navy-dark transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Install App
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="flex-1 py-3 px-4 rounded-xl bg-navy text-white font-display font-bold text-xs hover:bg-navy-dark transition-all shadow-md text-center"
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
