import SettingsForm from '@/components/SettingsForm';

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 transition-colors">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-4">System Settings</h1>
      <SettingsForm />
    </div>
  );
}