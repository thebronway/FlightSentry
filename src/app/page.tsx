'use client';
import { useEffect, useState } from 'react';
import { Flight } from '@/types';
import FlightCard from '@/components/FlightCard';
import QuotaRibbon from '@/components/QuotaRibbon';
import HistoryDrawer from '@/components/HistoryDrawer';
import FlightModal from '@/components/FlightModal';
import { Plus } from 'lucide-react';

export default function Dashboard() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [historyFlightId, setHistoryFlightId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchFlights = async () => {
    const res = await fetch('/api/flights');
    if (res.ok) setFlights(await res.json());
  };

  useEffect(() => { fetchFlights(); }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-200">Dashboard</h1>
        <button onClick={() => setIsModalOpen(true)} className="bg-gunmetal-border border border-slate-500 text-slate-100 shadow-sm px-4 py-2 rounded-md hover:bg-slate-700 hover:border-slate-400 flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" /> Add Flight
        </button>
      </div>

      <QuotaRibbon />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {flights.map(f => (
          <FlightCard key={f.id} flight={f} onRefresh={fetchFlights} onShowHistory={() => setHistoryFlightId(f.id)} />
        ))}
        {flights.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
            No flights tracked yet. Click "Add Flight" to get started.
          </div>
        )}
      </div>

      <HistoryDrawer flightId={historyFlightId} onClose={() => setHistoryFlightId(null)} />
      <FlightModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchFlights} />
    </div>
  );
}