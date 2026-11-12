'use client';

interface Props {
  enabled: boolean;
  host: string;
  port: number | null | undefined;
  user: string;
  pass: string;
  from: string;
  to: string;
  testing: boolean;
  status?: { type: 'success' | 'error'; message: string } | null;
  onToggleEnabled: (checked: boolean) => void;
  onFieldChange: (field: 'smtpHost' | 'smtpPort' | 'smtpUser' | 'smtpPass' | 'smtpFrom' | 'smtpTo', value: string | number | null) => void;
  onFieldBlur: (toastMessage: string) => void;
  onTest: () => void;
}

export default function SmtpChannelCard({
  enabled,
  host,
  port,
  user,
  pass,
  from,
  to,
  testing,
  status,
  onToggleEnabled,
  onFieldChange,
  onFieldBlur,
  onTest,
}: Props) {
  return (
    <div
      className={`p-4 rounded-lg border transition-all ${
        enabled
          ? 'bg-gunmetal-card border-gunmetal-border shadow-sm'
          : 'bg-gunmetal-canvas/40 border-gunmetal-border/50 opacity-60'
      }`}
    >
      <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
        <label className="min-h-[44px] sm:min-h-0 flex items-center gap-2.5 font-bold text-slate-200 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => onToggleEnabled(e.target.checked)}
            className="w-4 h-4 accent-slate-500 rounded"
          />
          <span>SMTP Email</span>
        </label>
        {!enabled && (
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
              disabled={!enabled}
              value={host}
              onChange={e => onFieldChange('smtpHost', e.target.value)}
              onBlur={() => onFieldBlur('SMTP host saved')}
              onKeyDown={e => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              className="w-full min-h-[44px] border border-gunmetal-border p-2.5 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 text-sm disabled:opacity-50"
              placeholder="smtp.gmail.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-slate-300">SMTP Port</label>
            <input
              type="number"
              disabled={!enabled}
              value={port || ''}
              onChange={e => onFieldChange('smtpPort', e.target.value ? Number(e.target.value) : null)}
              onBlur={() => onFieldBlur('SMTP port saved')}
              onKeyDown={e => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              className="w-full min-h-[44px] border border-gunmetal-border p-2.5 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 text-sm disabled:opacity-50"
              placeholder="587"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1 text-slate-300">SMTP Username</label>
            <input
              type="text"
              disabled={!enabled}
              value={user}
              onChange={e => onFieldChange('smtpUser', e.target.value)}
              onBlur={() => onFieldBlur('SMTP username saved')}
              onKeyDown={e => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              className="w-full min-h-[44px] border border-gunmetal-border p-2.5 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-slate-300">SMTP Password</label>
            <input
              type="password"
              disabled={!enabled}
              value={pass}
              onChange={e => onFieldChange('smtpPass', e.target.value)}
              onBlur={() => onFieldBlur('SMTP password saved')}
              onKeyDown={e => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              className="w-full min-h-[44px] border border-gunmetal-border p-2.5 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm disabled:opacity-50"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1 text-slate-300">From Address</label>
            <input
              type="email"
              disabled={!enabled}
              value={from}
              onChange={e => onFieldChange('smtpFrom', e.target.value)}
              onBlur={() => onFieldBlur('SMTP from address saved')}
              onKeyDown={e => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              className="w-full min-h-[44px] border border-gunmetal-border p-2.5 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 text-sm disabled:opacity-50"
              placeholder="alerts@flightsentry.local"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-slate-300">To Address</label>
            <input
              type="email"
              disabled={!enabled}
              value={to}
              onChange={e => onFieldChange('smtpTo', e.target.value)}
              onBlur={() => onFieldBlur('SMTP to address saved')}
              onKeyDown={e => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              className="w-full min-h-[44px] border border-gunmetal-border p-2.5 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 text-sm disabled:opacity-50"
              placeholder="you@email.com"
            />
          </div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-gunmetal-border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="text-xs">
          {status && (
            <span className={status.type === 'success' ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
              {status.message}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            disabled={testing}
            onClick={onTest}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-[36px] text-xs font-semibold px-4 sm:px-3 py-2 sm:py-1.5 bg-gunmetal-border hover:bg-slate-700 text-slate-100 border border-slate-500 rounded-md transition-colors disabled:opacity-50"
          >
            {testing ? 'Testing...' : 'Test'}
          </button>
        </div>
      </div>
    </div>
  );
}