'use client';

import { useState } from 'react';
import { Bell, TrendingDown, TrendingUp, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import SettingsCard from '@/components/settings/shared/SettingsCard';
import { getCurrencySymbol } from '@/utils/format';
import { OnboardingStepProps } from '../types';

type ChannelKey = 'discord' | 'slack' | 'generic' | 'smtp';

const SMTP_PRESETS = [
  { id: 'gmail', name: 'Gmail', host: 'smtp.gmail.com', port: 587 },
  { id: 'outlook', name: 'Outlook', host: 'smtp.office365.com', port: 587 },
  { id: 'icloud', name: 'iCloud', host: 'smtp.mail.me.com', port: 587 },
  { id: 'fastmail', name: 'Fastmail', host: 'smtp.fastmail.com', port: 465 },
  { id: 'aws-ses', name: 'AWS SES', host: 'email-smtp.us-east-1.amazonaws.com', port: 587 },
];

export default function NotificationsStep({
  settings,
  onChange,
  onSkipToSettingsLater,
}: OnboardingStepProps) {
  const symbol = getCurrencySymbol(settings.currency);
  const [testingChannel, setTestingChannel] = useState<ChannelKey | null>(null);
  const [channelStatus, setChannelStatus] = useState<
    Record<string, { type: 'success' | 'error'; message: string } | null>
  >({});

  const dropMode: 'dollar' | 'percent' =
    settings.minDropDollar <= 0 && settings.minDropPercent > 0 ? 'percent' : 'dollar';
  const surgeMode: 'dollar' | 'percent' =
    (settings.minIncreaseDollar ?? 50) <= 0 && (settings.minIncreasePercent ?? 10) > 0
      ? 'percent'
      : 'dollar';

  const handleTestChannel = async (channel: ChannelKey) => {
    if (testingChannel) return;
    setTestingChannel(channel);
    setChannelStatus((prev) => ({ ...prev, [channel]: null }));

    try {
      const res = await fetch('/api/settings/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, channel }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setChannelStatus((prev) => ({
          ...prev,
          [channel]: { type: 'success', message: 'Test alert delivered!' },
        }));
      } else {
        setChannelStatus((prev) => ({
          ...prev,
          [channel]: { type: 'error', message: data.error || 'Delivery failed.' },
        }));
      }
    } catch (err: any) {
      setChannelStatus((prev) => ({
        ...prev,
        [channel]: { type: 'error', message: err?.message || 'Network error during test.' },
      }));
    } finally {
      setTestingChannel(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Master Toggle & Default Alert Thresholds */}
      <SettingsCard className="space-y-3.5">
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={settings.notificationsEnabled === 1}
            onChange={(e) =>
              onChange({ ...settings, notificationsEnabled: e.target.checked ? 1 : 0 })
            }
            className="w-4 h-4 mt-0.5 accent-slate-500 rounded cursor-pointer"
          />
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-sky-400" />
              <span>1. Enable Global Alert Dispatch</span>
            </span>
            <p className="text-xs text-gunmetal-muted leading-relaxed mt-0.5">
              Master switch for outbound price drop, price surge, and email queue notifications. You can also mute alerts per individual flight.
            </p>
          </div>
        </label>

        <div className="pt-2 border-t border-gunmetal-border/70 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Price Drop Threshold */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                <span>Default Price Drop Threshold</span>
              </span>
              <div className="inline-flex rounded bg-gunmetal-card border border-gunmetal-border p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...settings,
                      minDropDollar: settings.minDropDollar > 0 ? settings.minDropDollar : 15,
                      minDropPercent: 0,
                    })
                  }
                  className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                    dropMode === 'dollar'
                      ? 'bg-gunmetal-border text-emerald-300'
                      : 'text-gunmetal-muted hover:text-slate-200'
                  }`}
                >
                  {symbol}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...settings,
                      minDropDollar: 0,
                      minDropPercent: settings.minDropPercent > 0 ? settings.minDropPercent : 5,
                    })
                  }
                  className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                    dropMode === 'percent'
                      ? 'bg-gunmetal-border text-emerald-300'
                      : 'text-gunmetal-muted hover:text-slate-200'
                  }`}
                >
                  %
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-gunmetal-muted">
                {dropMode === 'dollar' ? symbol : '%'}
              </span>
              {dropMode === 'dollar' ? (
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={settings.minDropDollar}
                  onChange={(e) =>
                    onChange({ ...settings, minDropDollar: Number(e.target.value), minDropPercent: 0 })
                  }
                  className="w-full min-h-[38px] border border-gunmetal-border px-3 py-1.5 rounded-md bg-gunmetal-canvas text-slate-200 text-xs sm:text-sm font-mono"
                />
              ) : (
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={settings.minDropPercent}
                  onChange={(e) =>
                    onChange({ ...settings, minDropPercent: Number(e.target.value), minDropDollar: 0 })
                  }
                  className="w-full min-h-[38px] border border-gunmetal-border px-3 py-1.5 rounded-md bg-gunmetal-canvas text-slate-200 text-xs sm:text-sm font-mono"
                />
              )}
            </div>
            <p className="text-[11px] text-gunmetal-muted">
              Minimum fare drop below your baseline or paid price required to trigger a drop alert.
            </p>
          </div>

          {/* Price Surge Threshold */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                <span>Default Price Surge Threshold</span>
              </span>
              <div className="inline-flex rounded bg-gunmetal-card border border-gunmetal-border p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...settings,
                      minIncreaseDollar:
                        (settings.minIncreaseDollar ?? 50) > 0
                          ? settings.minIncreaseDollar ?? 50
                          : 50,
                      minIncreasePercent: 0,
                    })
                  }
                  className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                    surgeMode === 'dollar'
                      ? 'bg-gunmetal-border text-rose-300'
                      : 'text-gunmetal-muted hover:text-slate-200'
                  }`}
                >
                  {symbol}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...settings,
                      minIncreaseDollar: 0,
                      minIncreasePercent:
                        (settings.minIncreasePercent ?? 10) > 0
                          ? settings.minIncreasePercent ?? 10
                          : 10,
                    })
                  }
                  className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                    surgeMode === 'percent'
                      ? 'bg-gunmetal-border text-rose-300'
                      : 'text-gunmetal-muted hover:text-slate-200'
                  }`}
                >
                  %
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-gunmetal-muted">
                {surgeMode === 'dollar' ? symbol : '%'}
              </span>
              {surgeMode === 'dollar' ? (
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={settings.minIncreaseDollar ?? 50}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      minIncreaseDollar: Number(e.target.value),
                      minIncreasePercent: 0,
                    })
                  }
                  className="w-full min-h-[38px] border border-gunmetal-border px-3 py-1.5 rounded-md bg-gunmetal-canvas text-slate-200 text-xs sm:text-sm font-mono"
                />
              ) : (
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={settings.minIncreasePercent ?? 10}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      minIncreasePercent: Number(e.target.value),
                      minIncreaseDollar: 0,
                    })
                  }
                  className="w-full min-h-[38px] border border-gunmetal-border px-3 py-1.5 rounded-md bg-gunmetal-canvas text-slate-200 text-xs sm:text-sm font-mono"
                />
              )}
            </div>
            <p className="text-[11px] text-gunmetal-muted">
              Used on prospective flights set to monitor price increases or both directions.
            </p>
          </div>
        </div>
      </SettingsCard>

      {/* 2. Delivery Channels */}
      <div className="space-y-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            2. Notification Delivery Channels (Optional)
          </h4>
          <p className="text-xs text-gunmetal-muted mt-0.5">
            Enable one or more channels below and send a test alert, or skip to set them up in Settings later.
          </p>
        </div>

        {/* Webhook Channels */}
        {(
          [
            {
              key: 'discord' as const,
              title: 'Discord Webhook',
              enabled: settings.discordEnabled === 1,
              url: settings.discordWebhookUrl || '',
              placeholder: 'https://discord.com/api/webhooks/...',
              onToggle: (v: boolean) =>
                onChange({ ...settings, discordEnabled: v ? 1 : 0 }),
              onUrl: (v: string) => onChange({ ...settings, discordWebhookUrl: v }),
            },
            {
              key: 'slack' as const,
              title: 'Slack Webhook',
              enabled: settings.slackEnabled === 1,
              url: settings.slackWebhookUrl || '',
              placeholder: 'https://hooks.slack.com/services/...',
              onToggle: (v: boolean) =>
                onChange({ ...settings, slackEnabled: v ? 1 : 0 }),
              onUrl: (v: string) => onChange({ ...settings, slackWebhookUrl: v }),
            },
            {
              key: 'generic' as const,
              title: 'Generic Webhook (Apprise / n8n / Custom)',
              enabled: settings.genericWebhookEnabled === 1,
              url: settings.genericWebhookUrl || settings.appriseUrl || '',
              placeholder: 'https://apprise.local/notify/...',
              onToggle: (v: boolean) =>
                onChange({ ...settings, genericWebhookEnabled: v ? 1 : 0 }),
              onUrl: (v: string) =>
                onChange({ ...settings, genericWebhookUrl: v, appriseUrl: v }),
            },
          ] as const
        ).map((ch) => {
          const st = channelStatus[ch.key];
          return (
            <div
              key={ch.key}
              className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                ch.enabled
                  ? 'bg-gunmetal-canvas/70 border-gunmetal-border'
                  : 'bg-gunmetal-canvas/35 border-gunmetal-border/60'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 font-bold text-xs sm:text-sm text-slate-100 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={ch.enabled}
                    onChange={(e) => ch.onToggle(e.target.checked)}
                    className="w-4 h-4 accent-slate-500 rounded cursor-pointer"
                  />
                  <span>{ch.title}</span>
                </label>

                <button
                  type="button"
                  disabled={!ch.enabled || !ch.url.trim() || testingChannel === ch.key}
                  onClick={() => void handleTestChannel(ch.key)}
                  className="min-h-[34px] px-3 py-1 rounded-md bg-gunmetal-card hover:bg-gunmetal-border border border-gunmetal-border text-xs font-semibold text-slate-200 inline-flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                >
                  <Send className="w-3 h-3 text-sky-400" />
                  <span>{testingChannel === ch.key ? 'Sending...' : 'Send Test'}</span>
                </button>
              </div>

              <input
                type="url"
                disabled={!ch.enabled}
                value={ch.url}
                onChange={(e) => ch.onUrl(e.target.value)}
                placeholder={ch.placeholder}
                className="w-full min-h-[40px] border border-gunmetal-border px-3 py-1.5 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 disabled:opacity-50 text-xs sm:text-sm"
              />

              {st && (
                <div
                  className={`text-xs flex items-center gap-1.5 ${
                    st.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {st.type === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  )}
                  <span>{st.message}</span>
                </div>
              )}
            </div>
          );
        })}

        {/* SMTP Email Channel */}
        <div
          className={`p-3.5 rounded-xl border transition-all space-y-3 ${
            settings.smtpEnabled === 1
              ? 'bg-gunmetal-canvas/70 border-gunmetal-border'
              : 'bg-gunmetal-canvas/35 border-gunmetal-border/60'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 font-bold text-xs sm:text-sm text-slate-100 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.smtpEnabled === 1}
                onChange={(e) =>
                  onChange({ ...settings, smtpEnabled: e.target.checked ? 1 : 0 })
                }
                className="w-4 h-4 accent-slate-500 rounded cursor-pointer"
              />
              <span>SMTP Email Alerts</span>
            </label>

            <button
              type="button"
              disabled={
                settings.smtpEnabled !== 1 ||
                !(settings.smtpHost || '').trim() ||
                !(settings.smtpTo || '').trim() ||
                testingChannel === 'smtp'
              }
              onClick={() => void handleTestChannel('smtp')}
              className="min-h-[34px] px-3 py-1 rounded-md bg-gunmetal-card hover:bg-gunmetal-border border border-gunmetal-border text-xs font-semibold text-slate-200 inline-flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-3 h-3 text-sky-400" />
              <span>{testingChannel === 'smtp' ? 'Sending...' : 'Send Test Email'}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-gunmetal-muted mr-1">Presets:</span>
            {SMTP_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                disabled={settings.smtpEnabled !== 1}
                onClick={() =>
                  onChange({
                    ...settings,
                    smtpHost: preset.host,
                    smtpPort: preset.port,
                  })
                }
                className="px-2 py-1 rounded text-[11px] font-semibold bg-gunmetal-card border border-gunmetal-border text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
              >
                {preset.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-2">
              <input
                type="text"
                disabled={settings.smtpEnabled !== 1}
                value={settings.smtpHost || ''}
                onChange={(e) => onChange({ ...settings, smtpHost: e.target.value })}
                placeholder="SMTP Host (e.g. smtp.gmail.com)"
                className="w-full min-h-[38px] border border-gunmetal-border px-3 py-1.5 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 disabled:opacity-50 text-xs sm:text-sm"
              />
            </div>
            <div>
              <input
                type="number"
                disabled={settings.smtpEnabled !== 1}
                value={settings.smtpPort || ''}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    smtpPort: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="Port (587)"
                className="w-full min-h-[38px] border border-gunmetal-border px-3 py-1.5 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 disabled:opacity-50 text-xs sm:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              disabled={settings.smtpEnabled !== 1}
              value={settings.smtpUser || ''}
              onChange={(e) => onChange({ ...settings, smtpUser: e.target.value })}
              placeholder="SMTP Username"
              className="w-full min-h-[38px] border border-gunmetal-border px-3 py-1.5 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 disabled:opacity-50 text-xs sm:text-sm"
            />
            <input
              type="password"
              disabled={settings.smtpEnabled !== 1}
              value={settings.smtpPass || ''}
              onChange={(e) => onChange({ ...settings, smtpPass: e.target.value })}
              placeholder="SMTP Password / App Password"
              className="w-full min-h-[38px] border border-gunmetal-border px-3 py-1.5 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 disabled:opacity-50 text-xs sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="email"
              disabled={settings.smtpEnabled !== 1}
              value={settings.smtpFrom || ''}
              onChange={(e) => onChange({ ...settings, smtpFrom: e.target.value })}
              placeholder="From Address (alerts@flightsentry.local)"
              className="w-full min-h-[38px] border border-gunmetal-border px-3 py-1.5 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 disabled:opacity-50 text-xs sm:text-sm"
            />
            <input
              type="email"
              disabled={settings.smtpEnabled !== 1}
              value={settings.smtpTo || ''}
              onChange={(e) => onChange({ ...settings, smtpTo: e.target.value })}
              placeholder="Recipient To Address (you@email.com)"
              className="w-full min-h-[38px] border border-gunmetal-border px-3 py-1.5 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 disabled:opacity-50 text-xs sm:text-sm"
            />
          </div>

          {channelStatus.smtp && (
            <div
              className={`text-xs flex items-center gap-1.5 ${
                channelStatus.smtp.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {channelStatus.smtp.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              )}
              <span>{channelStatus.smtp.message}</span>
            </div>
          )}
        </div>
      </div>

      </div>
  );
}