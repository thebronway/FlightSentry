'use client';

import { Settings } from '@/types';
import { getCurrencySymbol } from '@/utils/format';

interface Props {
  settings: Settings;
  onChange: (settings: Settings) => void;
  testingChannel: string | null;
  channelStatus: Record<string, { type: 'success' | 'error'; message: string } | null>;
  onTestChannel: (channelKey: 'discord' | 'slack' | 'generic' | 'smtp') => Promise<void>;
  onAutoSave?: (
    updatedSettings: Settings,
    statusKey: string,
    pillMessage?: string,
    toastMessage?: string
  ) => Promise<void>;
}

export default function NotificationsTab({
  settings,
  onChange,
  testingChannel,
  channelStatus,
  onTestChannel,
  onAutoSave,
}: Props) {
  return (
    <div className="space-y-6 pt-2">
      <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-3.5 rounded-lg text-xs text-slate-300">
        <p className="font-semibold text-slate-200 mb-0.5">Global Alert & Notification Defaults</p>
        Configure notification channels, baseline price drop thresholds, and price surge defaults. Tracked flights inherit these thresholds unless custom overrides are defined on a specific flight.
      </div>

      {/* Master Enable and Thresholds Card */}
      <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-4 rounded-lg space-y-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="notificationsEnabled"
            checked={settings.notificationsEnabled === 1}
            onChange={e => {
              const val = e.target.checked ? 1 : 0;
              const updated = { ...settings, notificationsEnabled: val };
              onChange(updated);
              if (onAutoSave) onAutoSave(updated, 'notifications', undefined, `Global notifications ${val ? 'enabled' : 'disabled'}`);
            }}
            className="w-4 h-4 accent-slate-500 rounded cursor-pointer"
          />
          <label htmlFor="notificationsEnabled" className="font-bold text-slate-200 text-sm cursor-pointer">
            Enable Global Notifications
          </label>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Price Drop Thresholds (Default)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Min {getCurrencySymbol(settings.currency)} Drop to Alert
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gunmetal-muted text-xs">{getCurrencySymbol(settings.currency)}</span>
                <input
                  type="number"
                  value={settings.minDropDollar}
                  onChange={e => onChange({ ...settings, minDropDollar: Number(e.target.value) })}
                  onBlur={() => {
                    if (onAutoSave) onAutoSave(settings, 'thresholds', undefined, `Minimum price drop threshold (${getCurrencySymbol(settings.currency)}) updated`);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                  }}
                  className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Min % Drop to Alert
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gunmetal-muted text-xs">%</span>
                <input
                  type="number"
                  value={settings.minDropPercent}
                  onChange={e => onChange({ ...settings, minDropPercent: Number(e.target.value) })}
                  onBlur={() => {
                    if (onAutoSave) onAutoSave(settings, 'thresholds', undefined, 'Minimum price drop percentage updated');
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                  }}
                  className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-gunmetal-border/70">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Price Surge Thresholds (Default)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Min {getCurrencySymbol(settings.currency)} Surge to Alert
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gunmetal-muted text-xs">{getCurrencySymbol(settings.currency)}</span>
                <input
                  type="number"
                  value={settings.minIncreaseDollar ?? 50}
                  onChange={e => onChange({ ...settings, minIncreaseDollar: Number(e.target.value) })}
                  onBlur={() => {
                    if (onAutoSave) onAutoSave(settings, 'thresholds', undefined, `Minimum price surge threshold (${getCurrencySymbol(settings.currency)}) updated`);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                  }}
                  className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Min % Surge to Alert
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gunmetal-muted text-xs">%</span>
                <input
                  type="number"
                  value={settings.minIncreasePercent ?? 10}
                  onChange={e => onChange({ ...settings, minIncreasePercent: Number(e.target.value) })}
                  onBlur={() => {
                    if (onAutoSave) onAutoSave(settings, 'thresholds', undefined, 'Minimum price surge percentage updated');
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                  }}
                  className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <h3 className="text-sm font-bold text-slate-200 mb-1">Notification Channels</h3>
        <p className="text-xs text-gunmetal-muted mb-4">
          Configure endpoints individually. Toggling a channel off preserves credentials in the database while skipping dispatch.
        </p>

        <div className="space-y-4">
          {/* Discord Webhook Card */}
          <div className={`p-4 rounded-lg border transition-all ${settings.discordEnabled === 1 ? 'bg-gunmetal-card border-gunmetal-border shadow-sm' : 'bg-gunmetal-canvas/40 border-gunmetal-border/50 opacity-60'}`}>
            <div className="flex justify-between items-center mb-3">
              <label className="flex items-center gap-2.5 font-bold text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.discordEnabled === 1}
                  onChange={e => {
                    const val = e.target.checked ? 1 : 0;
                    const updated = { ...settings, discordEnabled: val };
                    onChange(updated);
                    if (onAutoSave) onAutoSave(updated, 'discord', undefined, `Discord channel ${val ? 'enabled' : 'disabled'}`);
                  }}
                  className="w-4 h-4 accent-slate-500 rounded"
                />
                <span>Discord Webhook</span>
              </label>
              {settings.discordEnabled !== 1 && (
                <span className="text-[10px] uppercase font-bold text-gunmetal-muted bg-gunmetal-canvas px-1.5 py-0.5 rounded border border-gunmetal-border">
                  Disabled
                </span>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-slate-300">Webhook URL</label>
              <input
                type="url"
                disabled={settings.discordEnabled !== 1}
                value={settings.discordWebhookUrl || ''}
                onChange={e => onChange({ ...settings, discordWebhookUrl: e.target.value })}
                onBlur={() => {
                  if (onAutoSave) onAutoSave(settings, 'discord', undefined, 'Discord webhook URL saved');
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 text-sm disabled:opacity-50"
              />
            </div>
            <div className="mt-3 pt-3 border-t border-gunmetal-border flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs">
                {channelStatus.discord && (
                  <span className={channelStatus.discord.type === 'success' ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                    {channelStatus.discord.message}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={testingChannel === 'discord'}
                  onClick={() => onTestChannel('discord')}
                  className="text-xs font-semibold px-3 py-1.5 bg-gunmetal-border hover:bg-slate-700 text-slate-100 border border-slate-500 rounded transition-colors disabled:opacity-50"
                >
                  {testingChannel === 'discord' ? 'Testing...' : 'Test'}
                </button>
              </div>
            </div>
          </div>

          {/* Slack Webhook Card */}
          <div className={`p-4 rounded-lg border transition-all ${settings.slackEnabled === 1 ? 'bg-gunmetal-card border-gunmetal-border shadow-sm' : 'bg-gunmetal-canvas/40 border-gunmetal-border/50 opacity-60'}`}>
            <div className="flex justify-between items-center mb-3">
              <label className="flex items-center gap-2.5 font-bold text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.slackEnabled === 1}
                  onChange={e => {
                    const val = e.target.checked ? 1 : 0;
                    const updated = { ...settings, slackEnabled: val };
                    onChange(updated);
                    if (onAutoSave) onAutoSave(updated, 'slack', undefined, `Slack channel ${val ? 'enabled' : 'disabled'}`);
                  }}
                  className="w-4 h-4 accent-slate-500 rounded"
                />
                <span>Slack Webhook</span>
              </label>
              {settings.slackEnabled !== 1 && (
                <span className="text-[10px] uppercase font-bold text-gunmetal-muted bg-gunmetal-canvas px-1.5 py-0.5 rounded border border-gunmetal-border">
                  Disabled
                </span>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-slate-300">Webhook URL</label>
              <input
                type="url"
                disabled={settings.slackEnabled !== 1}
                value={settings.slackWebhookUrl || ''}
                onChange={e => onChange({ ...settings, slackWebhookUrl: e.target.value })}
                onBlur={() => {
                  if (onAutoSave) onAutoSave(settings, 'slack', undefined, 'Slack webhook URL saved');
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 text-sm disabled:opacity-50"
              />
            </div>
            <div className="mt-3 pt-3 border-t border-gunmetal-border flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs">
                {channelStatus.slack && (
                  <span className={channelStatus.slack.type === 'success' ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                    {channelStatus.slack.message}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={testingChannel === 'slack'}
                  onClick={() => onTestChannel('slack')}
                  className="text-xs font-semibold px-3 py-1.5 bg-gunmetal-border hover:bg-slate-700 text-slate-100 border border-slate-500 rounded transition-colors disabled:opacity-50"
                >
                  {testingChannel === 'slack' ? 'Testing...' : 'Test'}
                </button>
              </div>
            </div>
          </div>

          {/* Generic Webhook Card */}
          <div className={`p-4 rounded-lg border transition-all ${settings.genericWebhookEnabled === 1 ? 'bg-gunmetal-card border-gunmetal-border shadow-sm' : 'bg-gunmetal-canvas/40 border-gunmetal-border/50 opacity-60'}`}>
            <div className="flex justify-between items-center mb-3">
              <label className="flex items-center gap-2.5 font-bold text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.genericWebhookEnabled === 1}
                  onChange={e => {
                    const val = e.target.checked ? 1 : 0;
                    const updated = { ...settings, genericWebhookEnabled: val };
                    onChange(updated);
                    if (onAutoSave) onAutoSave(updated, 'generic', undefined, `Generic webhook channel ${val ? 'enabled' : 'disabled'}`);
                  }}
                  className="w-4 h-4 accent-slate-500 rounded"
                />
                <span>Generic Webhook (Custom / Apprise / Automation)</span>
              </label>
              {settings.genericWebhookEnabled !== 1 && (
                <span className="text-[10px] uppercase font-bold text-gunmetal-muted bg-gunmetal-canvas px-1.5 py-0.5 rounded border border-gunmetal-border">
                  Disabled
                </span>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-slate-300">Webhook Endpoint URL</label>
              <input
                type="url"
                disabled={settings.genericWebhookEnabled !== 1}
                value={settings.genericWebhookUrl || settings.appriseUrl || ''}
                onChange={e => onChange({ ...settings, genericWebhookUrl: e.target.value, appriseUrl: e.target.value })}
                onBlur={() => {
                  if (onAutoSave) onAutoSave(settings, 'generic', undefined, 'Generic webhook URL saved');
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                placeholder="https://webhook.site/... or https://apprise.local/notify/..."
                className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 text-sm disabled:opacity-50"
              />
            </div>
            <div className="mt-3 pt-3 border-t border-gunmetal-border flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs">
                {channelStatus.generic && (
                  <span className={channelStatus.generic.type === 'success' ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                    {channelStatus.generic.message}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={testingChannel === 'generic'}
                  onClick={() => onTestChannel('generic')}
                  className="text-xs font-semibold px-3 py-1.5 bg-gunmetal-border hover:bg-slate-700 text-slate-100 border border-slate-500 rounded transition-colors disabled:opacity-50"
                >
                  {testingChannel === 'generic' ? 'Testing...' : 'Test'}
                </button>
              </div>
            </div>
          </div>

          {/* SMTP Email Card */}
          <div className={`p-4 rounded-lg border transition-all ${settings.smtpEnabled === 1 ? 'bg-gunmetal-card border-gunmetal-border shadow-sm' : 'bg-gunmetal-canvas/40 border-gunmetal-border/50 opacity-60'}`}>
            <div className="flex justify-between items-center mb-3">
              <label className="flex items-center gap-2.5 font-bold text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.smtpEnabled === 1}
                  onChange={e => {
                    const val = e.target.checked ? 1 : 0;
                    const updated = { ...settings, smtpEnabled: val };
                    onChange(updated);
                    if (onAutoSave) onAutoSave(updated, 'smtp', undefined, `SMTP email channel ${val ? 'enabled' : 'disabled'}`);
                  }}
                  className="w-4 h-4 accent-slate-500 rounded"
                />
                <span>SMTP Email</span>
              </label>
              {settings.smtpEnabled !== 1 && (
                <span className="text-[10px] uppercase font-bold text-gunmetal-muted bg-gunmetal-canvas px-1.5 py-0.5 rounded border border-gunmetal-border">
                  Disabled
                </span>
              )}
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium mb-1 text-slate-300">SMTP Host</label>
                  <input
                    type="text"
                    disabled={settings.smtpEnabled !== 1}
                    value={settings.smtpHost || ''}
                    onChange={e => onChange({ ...settings, smtpHost: e.target.value })}
                    onBlur={() => {
                      if (onAutoSave) onAutoSave(settings, 'smtp', undefined, 'SMTP host saved');
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                    }}
                    className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 text-sm disabled:opacity-50"
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-300">SMTP Port</label>
                  <input
                    type="number"
                    disabled={settings.smtpEnabled !== 1}
                    value={settings.smtpPort || ''}
                    onChange={e => onChange({ ...settings, smtpPort: e.target.value ? Number(e.target.value) : null })}
                    onBlur={() => {
                      if (onAutoSave) onAutoSave(settings, 'smtp', undefined, 'SMTP port saved');
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                    }}
                    className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 text-sm disabled:opacity-50"
                    placeholder="587"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-300">SMTP Username</label>
                  <input
                    type="text"
                    disabled={settings.smtpEnabled !== 1}
                    value={settings.smtpUser || ''}
                    onChange={e => onChange({ ...settings, smtpUser: e.target.value })}
                    onBlur={() => {
                      if (onAutoSave) onAutoSave(settings, 'smtp', undefined, 'SMTP username saved');
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                    }}
                    className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-300">SMTP Password</label>
                  <input
                    type="password"
                    disabled={settings.smtpEnabled !== 1}
                    value={settings.smtpPass || ''}
                    onChange={e => onChange({ ...settings, smtpPass: e.target.value })}
                    onBlur={() => {
                      if (onAutoSave) onAutoSave(settings, 'smtp', undefined, 'SMTP password saved');
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                    }}
                    className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm disabled:opacity-50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-300">From Address</label>
                  <input
                    type="email"
                    disabled={settings.smtpEnabled !== 1}
                    value={settings.smtpFrom || ''}
                    onChange={e => onChange({ ...settings, smtpFrom: e.target.value })}
                    onBlur={() => {
                      if (onAutoSave) onAutoSave(settings, 'smtp', undefined, 'SMTP from address saved');
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                    }}
                    className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 text-sm disabled:opacity-50"
                    placeholder="alerts@flightsentry.local"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-300">To Address</label>
                  <input
                    type="email"
                    disabled={settings.smtpEnabled !== 1}
                    value={settings.smtpTo || ''}
                    onChange={e => onChange({ ...settings, smtpTo: e.target.value })}
                    onBlur={() => {
                      if (onAutoSave) onAutoSave(settings, 'smtp', undefined, 'SMTP to address saved');
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                    }}
                    className="w-full border border-gunmetal-border p-2 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 text-sm disabled:opacity-50"
                    placeholder="you@email.com"
                  />
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gunmetal-border flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs">
                {channelStatus.smtp && (
                  <span className={channelStatus.smtp.type === 'success' ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                    {channelStatus.smtp.message}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={testingChannel === 'smtp'}
                  onClick={() => onTestChannel('smtp')}
                  className="text-xs font-semibold px-3 py-1.5 bg-gunmetal-border hover:bg-slate-700 text-slate-100 border border-slate-500 rounded transition-colors disabled:opacity-50"
                >
                  {testingChannel === 'smtp' ? 'Testing...' : 'Test'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}