import { redirect } from 'next/navigation';
import SettingsForm from '@/components/SettingsForm';
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

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
      </div>
      <div className="w-full bg-gunmetal-card p-4 sm:p-6 rounded-lg shadow-sm border border-gunmetal-border transition-colors">
        <SettingsForm initialTab={rawTab} />
      </div>
    </div>
  );
}