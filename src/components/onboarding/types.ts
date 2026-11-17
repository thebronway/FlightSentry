import { AuthStatusResponse, Settings } from '@/types';
import { SettingsTabId } from '@/components/settings/settingsTabs';

export type OnboardingStepId =
  | 'welcome'
  | 'general'
  | 'data-sources'
  | 'scheduling'
  | 'search-preferences'
  | 'notifications'
  | 'email-scanner'
  | 'security'
  | 'summary';

export interface OnboardingStepDefinition {
  id: OnboardingStepId;
  stepNumber: number;
  title: string;
  shortTitle: string;
  subtitle: string;
  settingsTab?: SettingsTabId;
  settingsTabLabel?: string;
}

export function isValidOnboardingStep(value?: string | null): value is OnboardingStepId {
  if (!value) return false;
  return ONBOARDING_STEPS.some((step) => step.id === value);
}

export const ONBOARDING_STEPS: OnboardingStepDefinition[] = [
  {
    id: 'welcome',
    stepNumber: 1,
    title: 'Welcome to FlightSentry',
    shortTitle: 'Welcome',
    subtitle:
      'A quick guided tour through every FlightSentry setting. Configure what you want now, or skip any section to set up in Settings later.',
  },
  {
    id: 'general',
    stepNumber: 2,
    title: 'General Preferences & Environment',
    shortTitle: 'General',
    subtitle:
      'Configure automatic GitHub update checks, verify your configured container timezone, and set your primary display currency and points & miles programs.',
    settingsTab: 'general',
    settingsTabLabel: 'Settings → General',
  },
  {
    id: 'data-sources',
    stepNumber: 3,
    title: 'Data Sources & Query Routing',
    shortTitle: 'Data Sources',
    subtitle:
      'Connect flight price providers (OpenFareScraper, SerpAPI, SearchApi.io), configure quota limits, and choose how queries rotate.',
    settingsTab: 'data-sources',
    settingsTabLabel: 'Settings → Data Sources',
  },
  {
    id: 'scheduling',
    stepNumber: 4,
    title: 'Smart Check Scheduling & Retention',
    shortTitle: 'Scheduling',
    subtitle:
      'Balance API quota conservation with price freshness using proximity-based check cadences anchored to your daily start time, and set past flight archive retention.',
    settingsTab: 'scheduling',
    settingsTabLabel: 'Settings → Scheduling',
  },
  {
    id: 'search-preferences',
    stepNumber: 5,
    title: 'Default Search Preferences',
    shortTitle: 'Search Prefs',
    subtitle:
      'Establish global defaults for cabin class, fare tier, stops, redeyes, layover caps, airline filters, and itinerary diversity.',
    settingsTab: 'search-preferences',
    settingsTabLabel: 'Settings → Search Preferences',
  },
  {
    id: 'notifications',
    stepNumber: 6,
    title: 'Alerts & Notification Channels',
    shortTitle: 'Notifications',
    subtitle:
      'Configure price drop and surge alert thresholds and connect Discord, Slack, Generic Webhooks, or SMTP email alerts.',
    settingsTab: 'notifications',
    settingsTabLabel: 'Settings → Notifications',
  },
  {
    id: 'email-scanner',
    stepNumber: 7,
    title: 'IMAP Email Scanner & Queue',
    shortTitle: 'Email Scanner',
    subtitle:
      'Optionally monitor IMAP inboxes for airline confirmations, schedule changes, and cancellations staged into your review queue.',
    settingsTab: 'email-scanner',
    settingsTabLabel: 'Settings → Email Scanner',
  },
  {
    id: 'security',
    stepNumber: 8,
    title: 'Security, Passkeys & API Access',
    shortTitle: 'Security',
    subtitle:
      'Optionally lock your instance with a password, WebAuthn passkeys, and scoped REST API keys for external automations.',
    settingsTab: 'security',
    settingsTabLabel: 'Settings → Security',
  },
  {
    id: 'summary',
    stepNumber: 9,
    title: 'Setup Summary & Ready to Track',
    shortTitle: 'Summary',
    subtitle:
      'Review what is ready right now and what you chose to configure in Settings later.',
  },
];

export interface OnboardingStepProps {
  settings: Settings;
  onChange: (updated: Settings) => void;
  onSaveSettings: (updated: Settings, toastMessage?: string) => Promise<boolean>;
  onSkipToSettingsLater: () => void;
  onNext: () => void;
  onBack: () => void;
}

export interface OnboardingChecklistItem {
  id: string;
  label: string;
  configured: boolean;
  statusText: string;
  settingsTab: SettingsTabId;
  settingsTabLabel: string;
}

export function evaluateOnboardingSummary(
  settings: Settings,
  authStatus?: AuthStatusResponse | null,
  imapAccountCount: number = 0
): OnboardingChecklistItem[] {
  let pointsCount = 0;
  try {
    const parsed =
      typeof settings.pointsCurrencies === 'string'
        ? JSON.parse(settings.pointsCurrencies)
        : settings.pointsCurrencies;
    if (Array.isArray(parsed)) pointsCount = parsed.length;
  } catch {
    pointsCount = 0;
  }

  const serpReady = settings.serpApiEnabled === 1 && Boolean((settings.serpApiKey || '').trim());
  const searchReady = settings.searchApiEnabled === 1 && Boolean((settings.searchApiKey || '').trim());
  const scraperReady =
    settings.openfareScraperEnabled === 1 &&
    Boolean((settings.openfareScraperUrl || '').trim()) &&
    Boolean((settings.openfareScraperApiKey || '').trim());
  const activeProviders: string[] = [];
  if (scraperReady) activeProviders.push('OpenFareScraper');
  if (serpReady) activeProviders.push('SerpAPI');
  if (searchReady) activeProviders.push('SearchApi.io');

  const activeChannels: string[] = [];
  if (settings.discordEnabled === 1 && (settings.discordWebhookUrl || '').trim()) activeChannels.push('Discord');
  if (settings.slackEnabled === 1 && (settings.slackWebhookUrl || '').trim()) activeChannels.push('Slack');
  if (
    settings.genericWebhookEnabled === 1 &&
    (settings.genericWebhookUrl || settings.appriseUrl || '').trim()
  ) {
    activeChannels.push('Webhook');
  }
  if (settings.smtpEnabled === 1 && (settings.smtpHost || '').trim() && (settings.smtpTo || '').trim()) {
    activeChannels.push('SMTP');
  }

  const scannerReady = settings.emailScannerEnabled === 1 && imapAccountCount > 0;
  const authEnabled = Boolean(authStatus?.authEnabled);

  return [
    {
      id: 'general',
      label: 'General Preferences',
      configured: true,
      statusText: `${settings.currency || 'USD'} · ${settings.timezone || 'UTC'}${
        pointsCount > 0 ? ` · ${pointsCount} points ${pointsCount === 1 ? 'currency' : 'currencies'}` : ''
      }`,
      settingsTab: 'general',
      settingsTabLabel: 'General',
    },
    {
      id: 'data-sources',
      label: 'Flight Data Sources',
      configured: activeProviders.length > 0,
      statusText:
        activeProviders.length > 0
          ? `Active: ${activeProviders.join(', ')}`
          : 'Not configured yet (Manual & Points modes available)',
      settingsTab: 'data-sources',
      settingsTabLabel: 'Data Sources',
    },
    {
      id: 'scheduling',
      label: 'Check Cadences & Retention',
      configured: true,
      statusText: `Starts ${settings.checkStartTime || '06:00'} · ${settings.scheduleFarOut}h / ${settings.scheduleStandard}h / ${settings.scheduleFinalStretch}h · Retention: ${
        settings.pastFlightRetentionDays ? `${settings.pastFlightRetentionDays}d` : 'Keep Forever'
      }`,
      settingsTab: 'scheduling',
      settingsTabLabel: 'Scheduling',
    },
    {
      id: 'search-preferences',
      label: 'Default Search Filters',
      configured: true,
      statusText: `${settings.defaultCabinClass || 'economy'} · ${settings.defaultFareTier || 'Standard'} · Max ${settings.maxStoredItineraries ?? 12} itineraries`,
      settingsTab: 'search-preferences',
      settingsTabLabel: 'Search Preferences',
    },
    {
      id: 'notifications',
      label: 'Alert Channels & Thresholds',
      configured: activeChannels.length > 0,
      statusText:
        activeChannels.length > 0
          ? `Channels active: ${activeChannels.join(', ')}`
          : 'No delivery channels enabled yet (thresholds configured)',
      settingsTab: 'notifications',
      settingsTabLabel: 'Notifications',
    },
    {
      id: 'email-scanner',
      label: 'IMAP Email Scanner',
      configured: scannerReady,
      statusText: scannerReady
        ? `Enabled (${imapAccountCount} ${imapAccountCount === 1 ? 'account' : 'accounts'}, every ${settings.emailScannerPollIntervalMinutes ?? 15}m)`
        : imapAccountCount > 0
        ? `${imapAccountCount} ${imapAccountCount === 1 ? 'account' : 'accounts'} saved (polling paused)`
        : 'Not configured yet (set up in Settings later)',
      settingsTab: 'email-scanner',
      settingsTabLabel: 'Email Scanner',
    },
    {
      id: 'security',
      label: 'Authentication & Security',
      configured: authEnabled,
      statusText: authEnabled
        ? `Enabled (user: ${authStatus?.username || 'admin'})`
        : 'Disabled / Open local mode (set up in Settings later)',
      settingsTab: 'security',
      settingsTabLabel: 'Security',
    },
  ];
}