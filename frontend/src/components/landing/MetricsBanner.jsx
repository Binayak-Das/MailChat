import React from 'react';
import { ShieldCheck, Zap, MessageSquare, Users } from 'lucide-react';

export default function MetricsBanner() {
  const metrics = [
    {
      stat: '99.9%',
      label: 'Guaranteed Uptime',
      sub: 'Reliable communication day in, day out',
      icon: ShieldCheck,
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      stat: 'Instant',
      label: 'Real-Time Delivery',
      sub: 'Direct messages and emails sync immediately',
      icon: Zap,
      color: 'text-sky-600 dark:text-sky-400'
    },
    {
      stat: '10L+',
      label: 'Daily Messages Handled',
      sub: 'Trusted by fast-moving teams worldwide',
      icon: MessageSquare,
      color: 'text-emerald-600 dark:text-emerald-400'
    },
    {
      stat: '25K+',
      label: 'Active Users',
      sub: 'Connecting teams across countries',
      icon: Users,
      color: 'text-slate-700 dark:text-slate-300'
    }
  ];

  return (
    <div className="border-y border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur-md py-12 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {metrics.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="flex flex-col items-center sm:items-start text-center sm:text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-5 h-5 ${item.color}`} />
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {item.stat}
                  </span>
                </div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {item.label}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {item.sub}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
