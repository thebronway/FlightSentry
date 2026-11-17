import { redirect } from 'next/navigation';
import {
  DEFAULT_SETTINGS_TAB,
  isValidSettingsTab,
  normalizeSettingsTab,
} from '@/components/settings/settingsTabs';

interface SettingsTabPageProps {
  params: {
    tab: string;
  };
}

export default function SettingsTabPage({ params }: SettingsTabPageProps) {
  const rawTab = params?.tab;

  if (!isValidSettingsTab(rawTab)) {
    const normalized = normalizeSettingsTab(rawTab);
    redirect(`/settings/${normalized ?? DEFAULT_SETTINGS_TAB}`);
  }

  return null;
}