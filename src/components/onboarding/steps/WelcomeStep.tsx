'use client';

import { Plane, Database, Clock, Mail, Bell, ShieldCheck } from 'lucide-react';

interface Props {
  onStartTour: () => void;
  onSkipAll: () => void;
}

const HIGHLIGHTS = [
  {
    icon: Plane,
    accent: 'text-sky-400',
    title: 'Route Watch & Booked Rebooking Credits',
    description:
      'Monitor entire city pairs before booking, or track specific booked flights with PNR logging to catch post-purchase credit drops.',
  },
  {
    icon: Database,
    accent: 'text-emerald-400',
    title: 'Multi-Source Quota Pooling',
    description:
      'Pair your self-hosted OpenFareScraper with metered APIs (SerpAPI, SearchApi.io) using Round-Robin, Balanced Usage, or Priority Failover.',
  },
  {
    icon: Clock,
    accent: 'text-amber-400',
    title: 'Smart Proximity Scheduling',
    description:
      'Automatically scales check intervals based on days until departure so distant flights conserve quota while imminent trips are watched closely.',
  },
  {
    icon: Mail,
    accent: 'text-purple-400',
    title: 'IMAP Email Scanner & Review Queue',
    description:
      'Detects newly arriving airline confirmations, schedule changes, and cancellations in memory and stages them for approval before changing flights.',
  },
  {
    icon: Bell,
    accent: 'text-rose-400',
    title: 'Drop & Surge Alerts',
    description:
      'Delivers custom dollar or percentage drop and surge notifications via Discord, Slack, Generic Webhooks/Apprise, or SMTP email.',
  },
  {
    icon: ShieldCheck,
    accent: 'text-teal-400',
    title: 'Optional Auth, Passkeys & REST API',
    description:
      'Unlocked by default for trusted local homelabs, or secured with scrypt passwords, WebAuthn passkeys, and scoped /api/v1/* bearer keys.',
  },
];

export default function WelcomeStep({ onStartTour, onSkipAll }: Props) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {HIGHLIGHTS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="p-4 rounded-xl bg-gunmetal-canvas/70 border border-gunmetal-border space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${item.accent} flex-shrink-0`} />
                <h3 className="text-xs sm:text-sm font-bold text-slate-100">{item.title}</h3>
              </div>
              <p className="text-xs text-gunmetal-muted leading-relaxed pl-6">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>

      <div className="p-4 rounded-xl bg-sky-950/25 border border-sky-800/50 space-y-1">
        <p className="text-xs sm:text-sm font-bold text-sky-100">
          Configure at your own pace
        </p>
        <p className="text-xs text-sky-200/80 leading-relaxed">
          This walkthrough explains every setting across all 7 Settings tabs and auto-saves any changes you make. Every step is optional—leave anything untouched to configure it in <strong>Settings</strong> later.
        </p>
      </div>
    </div>
  );
}