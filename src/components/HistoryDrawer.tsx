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
    <div className="fixed inset-0 z-50 flex justify-end bg-black bg-opacity-25 dark:bg-opacity-70 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 h-full shadow-xl flex flex-col border-l border-gray-200 dark:border-gray-800">
        <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Price History</h2>
          <button onClick={onClose} className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"><X className="w-5 h-5"/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No checks recorded yet.</p>
          ) : (
            history.map(record => (
              <div key={record.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-3 rounded border border-gray-200 dark:border-gray-800">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(record.price)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(record.checkedAt).toLocaleString()}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded font-medium ${
                  record.status === 'Success' 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
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