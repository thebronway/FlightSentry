'use client';

import { CheckCircle2, AlertCircle } from 'lucide-react';

export interface ImapTestFeedback {
  type: 'success' | 'error';
  message: string;
  details?: string;
}

interface Props {
  feedback: ImapTestFeedback | null;
}

export default function ImapConnectionTestBanner({ feedback }: Props) {
  if (!feedback) return null;

  return (
    <div
      className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
        feedback.type === 'success'
          ? 'bg-emerald-950/35 border-emerald-800/60 text-emerald-200'
          : 'bg-rose-950/45 border-rose-700/70 text-rose-200'
      }`}
    >
      {feedback.type === 'success' ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
      ) : (
        <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
      )}
      <div className="space-y-0.5 min-w-0">
        <p className="font-semibold break-words">{feedback.message}</p>
        {feedback.details && (
          <p className="text-[11px] opacity-85 font-mono break-words">{feedback.details}</p>
        )}
      </div>
    </div>
  );
}