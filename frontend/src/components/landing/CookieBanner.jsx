import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X, Check } from 'lucide-react';
import {
  setCookieConsent,
  hasAnsweredCookieConsent
} from '../../services/storage';

export default function CookieBanner({ forceOpen = false, onCloseModal }) {
  const [isVisible, setIsVisible] = useState(() => {
    return !hasAnsweredCookieConsent() || forceOpen;
  });

  useEffect(() => {
    if (forceOpen) {
      setIsVisible(true);
    }
  }, [forceOpen]);

  useEffect(() => {
    const handleOpen = () => {
      setIsVisible(true);
    };

    window.addEventListener('mailchat_open_cookie_preferences', handleOpen);
    return () => window.removeEventListener('mailchat_open_cookie_preferences', handleOpen);
  }, []);

  const handleAccept = () => {
    setCookieConsent('accepted');
    setIsVisible(false);
    if (onCloseModal) onCloseModal();
  };

  const handleDecline = () => {
    setCookieConsent('essential');
    setIsVisible(false);
    if (onCloseModal) onCloseModal();
  };

  if (!isVisible) return null;

  return (
    <aside
      role="region"
      aria-label="Cookie consent banner"
      className="fixed bottom-3 inset-x-3 sm:bottom-5 sm:right-5 sm:left-auto sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xl shadow-slate-950/20 text-slate-900 dark:text-slate-100 transition-colors">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Cookie className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              We use cookies to secure your sign-in and save your preferences instead of local storage.
            </p>
            <div className="mt-1.5 flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-semibold">
              <Link to="/cookies" className="hover:underline">Cookie Policy</Link>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <Link to="/privacy" className="hover:underline">Privacy</Link>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <Link to="/terms" className="hover:underline">Terms</Link>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDecline}
            className="p-1 -mr-1 -mt-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
            aria-label="Dismiss cookie notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleDecline}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Essential Only
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Accept
          </button>
        </div>
      </div>
    </aside>
  );
}
