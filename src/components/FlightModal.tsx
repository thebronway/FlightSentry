'use client';
import { useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FlightModal({ isOpen, onClose, onSuccess }: Props) {
  const [formData, setFormData] = useState({
    origin: '', destination: '', departureDate: '', airline: '',
    flightNumber: '', pnr: '', fareTier: 'Standard', baselinePrice: '',
    targetPrice: '', notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      ...formData,
      origin: formData.origin.toUpperCase(),
      destination: formData.destination.toUpperCase(),
      baselinePrice: parseFloat(formData.baselinePrice),
      targetPrice: formData.targetPrice ? parseFloat(formData.targetPrice) : null,
      pnr: formData.pnr || null,
      notes: formData.notes || null
    };

    try {
      const res = await fetch('/api/flights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(JSON.stringify(data.error) || 'Failed to add flight');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-4 transition-colors">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Track New Flight</h2>
          <button onClick={onClose} className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"><X className="w-5 h-5"/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded text-sm">{error}</div>}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Origin (IATA)</label>
              <input required maxLength={3} placeholder="JFK" value={formData.origin} onChange={e => setFormData({...formData, origin: e.target.value})} className="w-full bg-white dark:bg-gray-950 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700 rounded-md shadow-sm border p-2 uppercase placeholder-gray-400 dark:placeholder-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Destination (IATA)</label>
              <input required maxLength={3} placeholder="LHR" value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} className="w-full bg-white dark:bg-gray-950 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700 rounded-md shadow-sm border p-2 uppercase placeholder-gray-400 dark:placeholder-gray-600" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Airline</label>
              <input required placeholder="Delta" value={formData.airline} onChange={e => setFormData({...formData, airline: e.target.value})} className="w-full bg-white dark:bg-gray-950 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700 rounded-md shadow-sm border p-2 placeholder-gray-400 dark:placeholder-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Flight Number</label>
              <input required placeholder="DL 1" value={formData.flightNumber} onChange={e => setFormData({...formData, flightNumber: e.target.value})} className="w-full bg-white dark:bg-gray-950 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700 rounded-md shadow-sm border p-2 placeholder-gray-400 dark:placeholder-gray-600" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <input required type="date" value={formData.departureDate} onChange={e => setFormData({...formData, departureDate: e.target.value})} className="w-full bg-white dark:bg-gray-950 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700 rounded-md shadow-sm border p-2 [color-scheme:light] dark:[color-scheme:dark]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fare Tier</label>
              <select value={formData.fareTier} onChange={e => setFormData({...formData, fareTier: e.target.value})} className="w-full bg-white dark:bg-gray-950 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700 rounded-md shadow-sm border p-2">
                <option value="Standard">Standard / Main</option>
                <option value="Basic Economy">Basic Economy</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PNR (Optional)</label>
              <input maxLength={6} placeholder="ABCDEF" value={formData.pnr} onChange={e => setFormData({...formData, pnr: e.target.value})} className="w-full bg-white dark:bg-gray-950 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700 rounded-md shadow-sm border p-2 uppercase placeholder-gray-400 dark:placeholder-gray-600" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Baseline Price ($)</label>
              <input required type="number" step="0.01" min="1" placeholder="850.00" value={formData.baselinePrice} onChange={e => setFormData({...formData, baselinePrice: e.target.value})} className="w-full bg-white dark:bg-gray-950 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700 rounded-md shadow-sm border p-2 placeholder-gray-400 dark:placeholder-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Alert Price ($)</label>
              <input type="number" step="0.01" min="1" placeholder="Optional Ceiling" value={formData.targetPrice} onChange={e => setFormData({...formData, targetPrice: e.target.value})} className="w-full bg-white dark:bg-gray-950 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700 rounded-md shadow-sm border p-2 placeholder-gray-400 dark:placeholder-gray-600" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea rows={2} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full bg-white dark:bg-gray-950 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700 rounded-md shadow-sm border p-2"></textarea>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 rounded-md disabled:opacity-50 transition-colors">
              {loading ? 'Saving...' : 'Track Flight'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}