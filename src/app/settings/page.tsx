import SettingsForm from '@/components/SettingsForm';

export default function SettingsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
      </div>
      <div className="w-full bg-gunmetal-card p-6 rounded-lg shadow-sm border border-gunmetal-border transition-colors">
        <SettingsForm />
      </div>
    </div>
  );
}