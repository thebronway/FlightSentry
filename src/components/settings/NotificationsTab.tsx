'use client';

import { Settings } from '@/types';
import { getCurrencySymbol } from '@/utils/format';
import SettingsIntroBanner from './shared/SettingsIntroBanner';
import AlertThresholdsCard from './notifications/AlertThresholdsCard';
import WebhookChannelCard from './notifications/WebhookChannelCard';
import SmtpChannelCard from './notifications/SmtpChannelCard';

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
  const symbol = getCurrencySymbol(settings.currency);

  return (
    <div className="space-y-6 pt-2">
      <SettingsIntroBanner
        title="Global Alert & Notification Defaults"
        description="Configure notification channels, baseline price drop thresholds, and price surge defaults. Tracked flights inherit these thresholds unless custom overrides are defined on a specific flight."
      />

      <AlertThresholdsCard
        notificationsEnabled={settings.notificationsEnabled === 1}
        currency={settings.currency}
        minDropDollar={settings.minDropDollar}
        minDropPercent={settings.minDropPercent}
        minIncreaseDollar={settings.minIncreaseDollar ?? 50}
        minIncreasePercent={settings.minIncreasePercent ?? 10}
        onToggleGlobalNotifications={checked => {
          const val = checked ? 1 : 0;
          const updated = { ...settings, notificationsEnabled: val };
          onChange(updated);
          if (onAutoSave) {
            onAutoSave(updated, 'notifications', undefined, `Global notifications ${val ? 'enabled' : 'disabled'}`);
          }
        }}
        onMinDropDollarChange={val => onChange({ ...settings, minDropDollar: val })}
        onMinDropDollarBlur={() => {
          if (onAutoSave) {
            onAutoSave(settings, 'thresholds', undefined, `Minimum price drop threshold (${symbol}) updated`);
          }
        }}
        onMinDropPercentChange={val => onChange({ ...settings, minDropPercent: val })}
        onMinDropPercentBlur={() => {
          if (onAutoSave) {
            onAutoSave(settings, 'thresholds', undefined, 'Minimum price drop percentage updated');
          }
        }}
        onMinIncreaseDollarChange={val => onChange({ ...settings, minIncreaseDollar: val })}
        onMinIncreaseDollarBlur={() => {
          if (onAutoSave) {
            onAutoSave(settings, 'thresholds', undefined, `Minimum price surge threshold (${symbol}) updated`);
          }
        }}
        onMinIncreasePercentChange={val => onChange({ ...settings, minIncreasePercent: val })}
        onMinIncreasePercentBlur={() => {
          if (onAutoSave) {
            onAutoSave(settings, 'thresholds', undefined, 'Minimum price surge percentage updated');
          }
        }}
      />

      <div className="pt-2">
        <h3 className="text-sm font-bold text-slate-200 mb-1">Notification Channels</h3>
        <p className="text-xs text-gunmetal-muted mb-4">
          Configure endpoints individually. Toggling a channel off preserves credentials in the database while skipping dispatch.
        </p>

        <div className="space-y-4">
          <WebhookChannelCard
            title="Discord Webhook"
            inputLabel="Webhook URL"
            placeholder="https://discord.com/api/webhooks/..."
            enabled={settings.discordEnabled === 1}
            url={settings.discordWebhookUrl || ''}
            testing={testingChannel === 'discord'}
            status={channelStatus.discord}
            onToggleEnabled={checked => {
              const val = checked ? 1 : 0;
              const updated = { ...settings, discordEnabled: val };
              onChange(updated);
              if (onAutoSave) {
                onAutoSave(updated, 'discord', undefined, `Discord channel ${val ? 'enabled' : 'disabled'}`);
              }
            }}
            onUrlChange={val => onChange({ ...settings, discordWebhookUrl: val })}
            onUrlBlur={() => {
              if (onAutoSave) onAutoSave(settings, 'discord', undefined, 'Discord webhook URL saved');
            }}
            onTest={() => onTestChannel('discord')}
          />

          <WebhookChannelCard
            title="Slack Webhook"
            inputLabel="Webhook URL"
            placeholder="https://hooks.slack.com/services/..."
            enabled={settings.slackEnabled === 1}
            url={settings.slackWebhookUrl || ''}
            testing={testingChannel === 'slack'}
            status={channelStatus.slack}
            onToggleEnabled={checked => {
              const val = checked ? 1 : 0;
              const updated = { ...settings, slackEnabled: val };
              onChange(updated);
              if (onAutoSave) {
                onAutoSave(updated, 'slack', undefined, `Slack channel ${val ? 'enabled' : 'disabled'}`);
              }
            }}
            onUrlChange={val => onChange({ ...settings, slackWebhookUrl: val })}
            onUrlBlur={() => {
              if (onAutoSave) onAutoSave(settings, 'slack', undefined, 'Slack webhook URL saved');
            }}
            onTest={() => onTestChannel('slack')}
          />

          <WebhookChannelCard
            title="Generic Webhook (Custom / Apprise / Automation)"
            inputLabel="Webhook Endpoint URL"
            placeholder="https://webhook.site/... or https://apprise.local/notify/..."
            enabled={settings.genericWebhookEnabled === 1}
            url={settings.genericWebhookUrl || settings.appriseUrl || ''}
            testing={testingChannel === 'generic'}
            status={channelStatus.generic}
            onToggleEnabled={checked => {
              const val = checked ? 1 : 0;
              const updated = { ...settings, genericWebhookEnabled: val };
              onChange(updated);
              if (onAutoSave) {
                onAutoSave(updated, 'generic', undefined, `Generic webhook channel ${val ? 'enabled' : 'disabled'}`);
              }
            }}
            onUrlChange={val =>
              onChange({ ...settings, genericWebhookUrl: val, appriseUrl: val })
            }
            onUrlBlur={() => {
              if (onAutoSave) onAutoSave(settings, 'generic', undefined, 'Generic webhook URL saved');
            }}
            onTest={() => onTestChannel('generic')}
          />

          <SmtpChannelCard
            enabled={settings.smtpEnabled === 1}
            host={settings.smtpHost || ''}
            port={settings.smtpPort}
            user={settings.smtpUser || ''}
            pass={settings.smtpPass || ''}
            from={settings.smtpFrom || ''}
            to={settings.smtpTo || ''}
            testing={testingChannel === 'smtp'}
            status={channelStatus.smtp}
            onToggleEnabled={checked => {
              const val = checked ? 1 : 0;
              const updated = { ...settings, smtpEnabled: val };
              onChange(updated);
              if (onAutoSave) {
                onAutoSave(updated, 'smtp', undefined, `SMTP email channel ${val ? 'enabled' : 'disabled'}`);
              }
            }}
            onFieldChange={(field, value) => {
              onChange({ ...settings, [field]: value });
            }}
            onFieldBlur={toastMessage => {
              if (onAutoSave) onAutoSave(settings, 'smtp', undefined, toastMessage);
            }}
            onTest={() => onTestChannel('smtp')}
          />
        </div>
      </div>
    </div>
  );
}