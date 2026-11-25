import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, ArrowLeft, Sun, Moon } from 'lucide-react';
import Footer from '../components/landing/Footer';
import { getCookie, setCookie } from '../services/storage';

export default function TermsPage() {
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
            Legal &amp; Usage
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
            Terms of Service
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Last updated: November 25, 2026
          </p>
          <p className="mt-4 text-slate-600 dark:text-slate-300 text-base leading-relaxed">
            These terms describe the rules for using MailChat. We wrote them in plain English so you can understand what you can expect from us, and what we expect from you.
          </p>
        </div>

        <article className="space-y-8 text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2.5">
              1. The Short Version
            </h2>
            <p>
              MailChat is built for team communication: instant chat, direct messaging, and internal email. You own your data. We keep the servers running and protect your information. Don't use the service to spam, harass, or break any laws. If you treat everyone with respect, you'll never have an issue here.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2.5">
              2. Your Account
            </h2>
            <p className="mb-2">
              To use MailChat, you need an account. You agree to provide accurate details and keep your login information secure.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400">
              <li>You are responsible for any activity that happens under your account.</li>
              <li>If you believe someone else accessed your account, let us know right away so we can lock it down.</li>
              <li>You must be at least 13 years old (or the minimum legal age in your region) to create an account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2.5">
              3. What You Can and Cannot Do
            </h2>
            <p className="mb-2">
              We want MailChat to remain a helpful, safe space for teams. When using our service, you agree not to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400">
              <li>Send unsolicited bulk emails, spam, or promotional blast messages.</li>
              <li>Upload malware, viruses, malicious scripts, or attempt to breach our security.</li>
              <li>Harass, abuse, impersonate, or threaten other members of your organization or community.</li>
              <li>Reverse engineer, scrape, or overload our infrastructure beyond normal usage.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2.5">
              4. Your Content &amp; Ownership
            </h2>
            <p>
              Everything you send—messages, uploaded files, attachments, and emails—belongs to you and your organization. We do not claim ownership of your content. We only process and display your messages as needed to deliver them to your recipients. We do not sell your content, and we do not use your private communications to train public artificial intelligence models.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2.5">
              5. Service Availability
            </h2>
            <p>
              We aim for 99.9% uptime and reliable message delivery. However, software and networks occasionally experience issues, routine maintenance, or unexpected downtime. We provide MailChat &ldquo;as is&rdquo; without warranties of any kind, though we will always do our best to resolve outages quickly and keep you informed.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2.5">
              6. Closing Your Account
            </h2>
            <p>
              You are free to stop using MailChat at any time. You or your workspace administrator can request account deletion, which removes your profile and active session cookies. If an account repeatedly violates our acceptable use policy, we reserve the right to suspend or close it.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2.5">
              7. Changes to These Terms
            </h2>
            <p>
              If we make significant changes to these terms, we will post an update here and update the &ldquo;Last updated&rdquo; date at the top. Continued use of MailChat after changes means you accept the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2.5">
              8. Contact Us
            </h2>
            <p>
              Have questions about these terms? Email us directly at{' '}
              <a href="mailto:support@mailchat.internal" className="text-blue-600 dark:text-blue-400 underline font-medium">
                support@mailchat.internal
              </a>.
            </p>
          </section>
        </article>

        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Privacy Policy
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
