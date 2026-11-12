'use client';

interface Props {
  title: string;
  inputLabel: string;
  placeholder: string;
  enabled: boolean;
  url: string;
  testing: boolean;
  status?: { type: 'success' | 'error'; message: string } | null;
  onToggleEnabled: (checked: boolean) => void;
  onUrlChange: (val: string) => void;
  onUrlBlur: () => void;
  onTest: () => void;
}

export default function WebhookChannelCard({
  title,
  inputLabel,
  placeholder,
  enabled,
  url,
  testing,
  status,
  onToggleEnabled,
  onUrlChange,
  onUrlBlur,
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
          <span>{title}</span>
        </label>
        {!enabled && (
          <span className="text-[10px] uppercase font-bold text-gunmetal-muted bg-gunmetal-canvas px-1.5 py-0.5 rounded border border-gunmetal-border">
            Disabled
          </span>
        )}
      </div>
      <div>
        <label className="block text-xs font-medium mb-1 text-slate-300">{inputLabel}</label>
        <input
          type="url"
          disabled={!enabled}
          value={url}
          onChange={e => onUrlChange(e.target.value)}
          onBlur={onUrlBlur}
          onKeyDown={e => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          placeholder={placeholder}
          className="w-full min-h-[44px] border border-gunmetal-border p-2.5 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 text-sm disabled:opacity-50"
        />
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