import {
  ArrowRight,
  ChevronDown,
  ShieldCheck,
  Zap
} from 'lucide-react';

export default function HeroSection({ onOpenAuthModal, onScrollToFeatures }) {
  return (
    <section className="relative min-h-[calc(100vh-5rem)] min-h-[calc(100dvh-5rem)] flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 sm:py-16 overflow-hidden transition-colors duration-200">

      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[400px] bg-blue-600/5 dark:bg-blue-600/10 blur-[140px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto text-center flex flex-col items-center justify-center">

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.14] max-w-4xl mx-auto">
          Where Email Meets Team Chat. <br className="hidden sm:inline" />
          <span className="text-blue-600 dark:text-blue-400">
            In Real Time.
          </span>
        </h1>

        <p className="mt-5 text-base sm:text-lg lg:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
          Stop switching back and forth between crowded email inboxes and scattered chat apps. MailChat brings your customer emails, direct messages, team conversations, and file sharing together in one simple, fast workspace.
        </p>

        <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => onOpenAuthModal('register')}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-md shadow-blue-600/25 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Start Free Today</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onScrollToFeatures}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 hover:text-blue-600 dark:hover:text-black font-medium text-base shadow-xs hover:bg-slate-50 dark:hover:bg-slate-850 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>See Features</span>
            <ChevronDown className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Instant Sync</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Encrypted Data Privacy</span>
          </div>
        </div>
      </div>
    </section>
  );
}
