import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, ArrowLeft, Sun, Moon } from 'lucide-react';
import Footer from '../components/landing/Footer';
import { getCookie, setCookie } from '../services/storage';

export default function PrivacyPage() {
  const [isDark, setIsDark] = useState(() => {
    const saved = getCookie('mailchat_theme');
    if (saved) return saved === 'dark';
    return true;
  });

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
            Your Privacy
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Last updated: November 25, 2026
          </p>
          <p className="mt-4 text-slate-600 dark:text-slate-300 text-base leading-relaxed">
            Privacy policies are usually full of confusing legal text. We wrote ours to be clear and straightforward. Here is exactly what data we collect, why we need it, and how we protect it.
          </p>
        </div>

        <article className="space-y-8 text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2.5">
              1. Our Golden Rule
            </h2>
            <p>
              We do not sell your personal data. We do not show ads, and we do not track you across other websites. Our business model is simply providing reliable communication tools, not selling user attention or information.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2.5">
              2. What We Collect
            </h2>
            <p className="mb-2">
              We only collect information necessary to make MailChat function for you:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400">
              <li><strong>Account details:</strong> Your name, email address, password hash, and optional profile picture.</li>
              <li><strong>Messages &amp; emails:</strong> The text and attachments you send in chat channels, direct messages, and mailboxes.</li>
              <li><strong>Preferences:</strong> Your theme setting (Dark or Light mode) and sound preferences.</li>
              <li><strong>Basic server logs:</strong> Standard connection logs (like IP addresses and timestamps) to prevent spam, debug crashes, and protect against security threats.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2.5">
              3. Why We Use Cookies (And Not Local Storage)
            </h2>
            <p className="mb-2">
              To keep your session secure and transparent, MailChat stores your authentication token and basic preferences in browser cookies rather than unmanaged browser local storage.
            </p>
            <p>
              We ask for your permission before setting non-essential preference cookies. Essential cookies (like your login session) are required so the server knows who you are when you open a chat room or your inbox. You can review our full breakdown in our <Link to="/cookies" className="text-blue-600 dark:text-blue-400 underline font-medium">Cookie Policy</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2.5">
              4. How We Use Your Information
            </h2>
            <p className="mb-2">
              Your information is strictly used to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400">
              <li>Deliver your chat messages and emails in real time to the people you choose.</li>
              <li>Authenticate your account when you sign in.</li>
              <li>Notify you of new incoming messages or unread emails.</li>
              <li>Keep our network secure, monitor server health, and prevent unauthorized access.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2.5">
              5. Data Security
            </h2>
            <p>
              All traffic between your browser and our servers is encrypted using standard Transport Layer Security (TLS/HTTPS). Passwords are cryptographically hashed before being stored in our database. We regularly update our server dependencies and follow security best practices to protect your data.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2.5">
              6. Your Rights and Deleting Data
            </h2>
            <p>
              You have full control over your information:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400 mt-2">
              <li>You can view or update your profile details anytime inside your user dashboard.</li>
              <li>You can request a complete export of your messages and account information.</li>
              <li>You can request account deletion, after which your personal data and session cookies will be removed from our systems.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2.5">
              7. Questions or Requests
            </h2>
            <p>
              If you have any questions about how we handle your personal data, or if you want to request data deletion, contact us anytime at{' '}
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
            <Link to="/cookies" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Cookie Policy
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
