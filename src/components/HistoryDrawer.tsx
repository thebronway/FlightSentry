'use client';
import { useEffect, useState } from 'react';
import { PriceHistory } from '@/types';
import { formatCurrency } from '@/utils/format';
import { X } from 'lucide-react';

export default function HistoryDrawer({ flightId, onClose }: { flightId: number | null, onClose: () => void }) {
  const [history, setHistory] = useState<PriceHistory[]>([]);

  useEffect(() => {
    if (flightId) {
      fetch(`/api/history/${flightId}`)
        .then(res => res.json())
        .then(data => setHistory(data));
    }
  }, [flightId]);

  if (!flightId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-colors">
      <div className="w-full max-w-md bg-gunmetal-card h-full shadow-2xl flex flex-col border-l border-gunmetal-border">
        <div className="px-4 py-4 border-b border-gunmetal-border flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-200">Price History</h2>
          <button onClick={onClose} className="p-2 text-gunmetal-muted hover:text-slate-200 hover:bg-gunmetal-canvas rounded-full transition-colors"><X className="w-5 h-5"/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <p className="text-gunmetal-muted text-center py-8">No checks recorded yet.</p>
          ) : (
            history.map(record => (
              <div key={record.id} className="flex justify-between items-center bg-gunmetal-canvas p-3 rounded-md border border-gunmetal-border">
                <div>
                  <p className="font-bold text-slate-200">{formatCurrency(record.price)}</p>
                  <p className="text-xs text-gunmetal-muted">{new Date(record.checkedAt).toLocaleString()}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded font-medium border ${
                  record.status === 'Success' 
                    ? 'bg-green-900/30 text-green-400 border-green-800/40' 
                    : 'bg-red-900/30 text-red-400 border-red-800/40'
                }`}>
                  {record.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}