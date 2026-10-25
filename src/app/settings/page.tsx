import SettingsForm from '@/components/SettingsForm';

export default function SettingsPage() {
  return (
    <div className="w-full bg-gunmetal-card p-6 rounded-lg shadow-sm border border-gunmetal-border transition-colors">
      <h1 className="text-2xl font-bold mb-6 text-slate-200 border-b border-gunmetal-border pb-4">System Settings</h1>
      <SettingsForm />
    </div>
  );
}