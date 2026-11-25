import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-10 text-slate-500 dark:text-slate-400 text-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-900">

          <div className="flex items-center gap-3">
            <Link to="/" className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <MessageSquare className="w-4 h-4 fill-white/20" />
            </Link>
            <div className="flex items-center">
              <Link to="/" className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
                Mail<span className="text-blue-600 dark:text-blue-400">Chat</span>
              </Link>
              <span className="text-slate-300 dark:text-slate-700 mx-2 hidden sm:inline">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                Real-time email and chat for modern teams
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link
              to="/terms"
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            >
              Terms &amp; Conditions
            </Link>
            <Link
              to="/privacy"
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            >
              Privacy Policy
            </Link>
            <Link
              to="/cookies"
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            >
              Cookie Policy
            </Link>
          </div>
        </div>

        <div className="pt-6 flex flex sm:flex-row items-center justify-center gap-4">
          <div className="text-slate-500 dark:text-slate-400 text-center sm:text-left text-xs">
            © 2026 MailChat Technologies Inc. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
