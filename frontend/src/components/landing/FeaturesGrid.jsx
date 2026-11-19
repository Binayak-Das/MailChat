import React from 'react';
import {
  Mail,
  MessageSquare,
  ShieldCheck,
  Search,
  Paperclip,
  SlidersHorizontal,
  CheckCircle
} from 'lucide-react';

export default function FeaturesGrid() {
  const features = [
    {
      icon: Mail,
      title: 'Smart Email Management',
      description: 'Keep all your customer conversations organized with custom folders (Inbox, Sent, Drafts, Starred, Trash), file attachments, and customizable label filters.',
      bullets: [
        'Organized folders & custom category labels',
        'Multi-file attachments with instant document preview',
        'Clean drafting, threaded replies, and email forwarding'
      ]
    },
    {
      icon: MessageSquare,
      title: 'Real-Time Direct Chats',
      description: 'Instant messaging for your whole organization. Message teammates one-on-one with high visibility, and see who is online.',
      bullets: [
        'Live typing indicators & active online status',
        'Clear delivery indicators: Sent, Delivered, and Read',
        'Edit, delete, reply, and forward message actions'
      ]
    },
    {
      icon: ShieldCheck,
      title: 'Team Management & Security',
      description: 'Simple and secure administrative controls. Manage team member access, assign roles, and ensure company communications remain private.',
      bullets: [
        'Role-based permissions for Admins and Team Members',
        'Secure password protection and account controls',
        'Clean team oversight and workspace administration'
      ]
    },
    {
      icon: Search,
      title: 'Instant Universal Search',
      description: 'Find any conversation or file in seconds. Search simultaneously across all your email archives, team chats, contacts, and shared attachments.',
      bullets: [
        'Fast keyword search across emails and chat messages',
        'Filter by date, sender, folder, or file type',
        'Quickly retrieve past discussions and project notes'
      ]
    },
    {
      icon: Paperclip,
      title: 'Safe File & Media Sharing',
      description: 'Share PDFs, spreadsheets, documents, and images smoothly with your team. Built-in previews let everyone view files without leaving the app.',
      bullets: [
        'Simple drag-and-drop file uploads',
        'In-app previews for documents, photos, and presentations',
        'Safe and controlled file downloads for your team'
      ]
    },
    {
      icon: SlidersHorizontal,
      title: 'Comfortable Light & Dark Themes',
      description: 'Designed for focus and visual comfort throughout your workday. Switch effortlessly between crisp Light mode and soothing Dark mode on any screen.',
      bullets: [
        'One-click toggle between light and dark themes',
        'Fully responsive on desktop, tablet, and mobile',
        'Clean, modern layout that reduces eye strain'
      ]
    }
  ];

  return (
    <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 transition-colors duration-200">

      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Everything Your Team Needs to Communicate
        </h2>
        <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
          Combine enterprise email and instant team messaging into one easy-to-use platform built for high-velocity teams.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {features.map((feat, idx) => {
          const Icon = feat.icon;
          return (
            <div
              key={idx}
              className="rounded-2xl p-6 sm:p-7 bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-slate-700 transition-all hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-950/40 flex flex-col justify-between group shadow-xs"
            >
              <div>

                <div className="mb-5">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-all">
                    <Icon className="w-6 h-6" />
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {feat.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
                  {feat.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                {feat.bullets.map((b, bIdx) => (
                  <div key={bIdx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                    <CheckCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>

            </div>
          );
        })}
      </div>

    </section>
  );
}
