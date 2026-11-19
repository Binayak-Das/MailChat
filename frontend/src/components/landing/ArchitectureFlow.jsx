import { Mail, MessageSquare, Paperclip, Monitor } from 'lucide-react';

export default function ArchitectureFlow() {
  const steps = [
    {
      title: '1. Unified Email Inbox',
      tag: 'Organized Mail',
      icon: Mail,
      color: 'from-blue-600 to-blue-700',
      description: 'Manage customer emails with custom folders, search past threads in seconds, and attach documents effortlessly in one central inbox.'
    },
    {
      title: '2. Instant Team Chat',
      tag: 'Real-Time Messaging',
      icon: MessageSquare,
      color: 'from-sky-500 to-blue-600',
      description: 'Reach teammates instantly with 1:1 direct chats and team messaging featuring live presence and read receipts.'
    },
    {
      title: '3. Safe File Sharing',
      tag: 'Documents & Media',
      icon: Paperclip,
      color: 'from-emerald-600 to-teal-700',
      description: 'Attach and share contracts, PDFs, presentations, and images with built-in instant previews and secure access permissions.'
    },
    {
      title: '4. Built for Any Device',
      tag: 'Work Anywhere',
      icon: Monitor,
      color: 'from-slate-700 to-slate-800',
      description: 'Switch smoothly between comfortable Light and Dark modes on your desktop, laptop, tablet, or phone without missing a beat.'
    }
  ];

  return (
    <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 transition-colors duration-200">
      <div className="rounded-3xl p-8 sm:p-12 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg dark:shadow-2xl relative overflow-hidden">

        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            How MailChat Works
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            A simple, all-in-one workspace designed to keep your team communications organized, fast, and connected.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl p-6 bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-slate-700 transition-all flex flex-col justify-between shadow-xs hover:shadow-md"
              >
                <div>
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${step.color} flex items-center justify-center text-white mb-4 shadow-sm`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
                    {step.tag}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
