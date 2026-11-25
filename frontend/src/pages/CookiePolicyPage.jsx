import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, ArrowLeft, Sun, Moon, Check, RotateCcw } from 'lucide-react';
import Footer from '../components/landing/Footer';
import {
  getCookie,
  setCookie,
  getCookieConsent,
  setCookieConsent,
  revokeCookieConsent
} from '../services/storage';

export default function CookiePolicyPage() {
  const [isDark, setIsDark] = useState(() => {
    const saved = getCookie('mailchat_theme');
    if (saved) return saved === 'dark';
    return true;
  });

  const [consentStatus, setConsentStatus] = useState(getCookieConsent());
  const [feedbackMsg, setFeedbackMsg] = useState('');

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
      setCookie('mailchat_theme', 'dark', 365);
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      setCookie('mailchat_theme', 'light', 365);
    }
  }, [isDark]);

  const handleUpdateConsent = (status) => {
    if (status === 'accepted') {
      setCookieConsent('accepted', { theme: isDark ? 'dark' : 'light' });
      setFeedbackMsg('All cookies accepted.');
    } else if (status === 'essential') {
      setCookieConsent('essential');
      setFeedbackMsg('Only essential cookies will be used.');
    } else if (status === 'revoked') {
      revokeCookieConsent();
      setFeedbackMsg('Cookie preferences reset.');
    }
    setConsentStatus(getCookieConsent());
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 selection:bg-blue-600 selection:text-white transition-colors duration-200">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/90 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-xs group-hover:bg-blue-700 transition-colors">
                <MessageSquare className="w-4 h-4 text-white fill-white/20" />
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
                Mail<span className="text-blue-600 dark:text-blue-400">Chat</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
            </button>

            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="mb-10 pb-8 border-b border-slate-200 dark:border-slate-800">
          <p className="text-xs uppercase tracking-wider font-semibold text-blue-600 dark:text-blue-400 mb-2">
            Storage &amp; Cookies
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
            Cookie Policy
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Last updated: November 25, 2026
          </p>
          <p className="mt-4 text-slate-600 dark:text-slate-300 text-base leading-relaxed">
            MailChat uses cookies instead of local storage to keep your session secure and save your preferences. This page explains what cookies we use, why we use them, and how you can manage them.
          </p>
        </div>

        <article className="space-y-8 text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2.5">
              1. What Are Cookies?
            </h2>
            <p>
              Cookies are small text files saved in your browser by websites you visit. They are commonly used to remember that you are logged in, save your preferences, and help web apps run smoothly.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2.5">
              2. Why We Use Cookies Instead of Local Storage
            </h2>
            <p>
              Many web applications silently store user data in browser local storage without clear consent or expiration dates. At MailChat, we store all session and preference data in first-party cookies with explicit user consent, automatic expiration, and standard security attributes (SameSite and Secure flags).
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2.5">
              3. The Cookies We Use
            </h2>
            <p className="mb-4">
              We only use first-party cookies. We do not use any third-party marketing, analytics, or advertising cookies.
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Cookie Name</th>
                    <th className="py-3 px-4 font-semibold">Purpose</th>
                    <th className="py-3 px-4 font-semibold">Duration</th>
                    <th className="py-3 px-4 font-semibold">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-600 dark:text-slate-400">
                  <tr>
                    <td className="py-3 px-4 font-mono text-xs text-blue-600 dark:text-blue-400">mailchat_token</td>
                    <td className="py-3 px-4">Keeps you signed in securely across pages.</td>
                    <td className="py-3 px-4">30 days</td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-200">Essential</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-mono text-xs text-blue-600 dark:text-blue-400">mailchat_user</td>
                    <td className="py-3 px-4">Stores your display name, email, and avatar for fast UI loading.</td>
                    <td className="py-3 px-4">30 days</td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-200">Essential</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-mono text-xs text-blue-600 dark:text-blue-400">mailchat_cookie_consent</td>
                    <td className="py-3 px-4">Remembers your choice on the cookie banner.</td>
                    <td className="py-3 px-4">1 year</td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-200">Essential</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-mono text-xs text-blue-600 dark:text-blue-400">mailchat_theme</td>
                    <td className="py-3 px-4">Remembers your light or dark mode selection.</td>
                    <td className="py-3 px-4">1 year</td>
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">Preferences</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-mono text-xs text-blue-600 dark:text-blue-400">mailchat_pref_*</td>
                    <td className="py-3 px-4">Stores notification sounds and alert preferences.</td>
                    <td className="py-3 px-4">30 days</td>
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">Preferences</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2.5">
              4. Your Cookie Choice
            </h2>
            <p className="mb-4">
              Current status on this browser:{' '}
              <span className="font-semibold text-slate-900 dark:text-white capitalize">
                {consentStatus ? consentStatus : 'Not set yet'}
              </span>
            </p>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => handleUpdateConsent('accepted')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Accept All Cookies</span>
              </button>

              <button
                onClick={() => handleUpdateConsent('essential')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <span>Essential Only</span>
              </button>

              <button
                onClick={() => handleUpdateConsent('revoked')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Preferences</span>
              </button>

              {feedbackMsg && (
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 ml-auto">
                  {feedbackMsg}
                </span>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2.5">
              5. How to Clear Cookies in Your Browser
            </h2>
            <p className="mb-2">
              You can also delete or block cookies directly in your browser settings at any time:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400">
              <li><strong>Chrome:</strong> Settings &rarr; Privacy and security &rarr; Third-party cookies &rarr; See all site data.</li>
              <li><strong>Firefox:</strong> Settings &rarr; Privacy &amp; Security &rarr; Cookies and Site Data &rarr; Clear Data.</li>
              <li><strong>Safari:</strong> Settings &rarr; Privacy &rarr; Manage Website Data &rarr; Remove All.</li>
              <li><strong>Edge:</strong> Settings &rarr; Cookies and site permissions &rarr; Manage and delete cookies.</li>
            </ul>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Please note: clearing essential cookies will log you out of your MailChat session.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2.5">
              6. Questions
            </h2>
            <p>
              If you have any questions about our use of cookies, contact us at{' '}
              <a href="mailto:privacy@mailchat.internal" className="text-blue-600 dark:text-blue-400 underline font-medium">
                privacy@mailchat.internal
              </a>.
            </p>
          </section>
        </article>

        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-4">
            <Link to="/terms" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Terms of Service
            </Link>
            <span>•</span>
            <Link to="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Privacy Policy
            </Link>
          </div>
          <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
            Return to Homepage &rarr;
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
