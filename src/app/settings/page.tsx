import { redirect } from 'next/navigation';
import { DEFAULT_SETTINGS_TAB } from '@/components/settings/settingsTabs';

export default function SettingsPage() {
  redirect(`/settings/${DEFAULT_SETTINGS_TAB}`);
}