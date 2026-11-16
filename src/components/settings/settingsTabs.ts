export type SettingsTabId =
  | 'general'
  | 'data-sources'
  | 'scheduling'
  | 'search-preferences'
  | 'notifications'
  | 'email-scanner'
  | 'security';

export interface SettingsTabDefinition {
  id: SettingsTabId;
  label: string;
}

export const DEFAULT_SETTINGS_TAB: SettingsTabId = 'general';

export const SETTINGS_TABS: SettingsTabDefinition[] = [
  { id: 'general', label: 'General' },
  { id: 'data-sources', label: 'Data Sources' },
  { id: 'scheduling', label: 'Scheduling' },
  { id: 'search-preferences', label: 'Search Preferences' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'email-scanner', label: 'Email Scanner' },
  { id: 'security', label: 'Security' },
];

const LEGACY_TAB_ALIASES: Record<string, SettingsTabId> = {
  searchprefs: 'search-preferences',
  datasources: 'data-sources',
  emailscanner: 'email-scanner',
};

export function isValidSettingsTab(value?: string | null): value is SettingsTabId {
  if (!value) return false;
  return SETTINGS_TABS.some((tab) => tab.id === value);
}

export function normalizeSettingsTab(value?: string | null): SettingsTabId | null {
  if (!value) return null;
  const cleaned = value.trim().toLowerCase();
  if (isValidSettingsTab(cleaned)) {
    return cleaned;
  }
  return LEGACY_TAB_ALIASES[cleaned] ?? null;
}