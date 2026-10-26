'use client';

import { useEffect, useState, useMemo } from 'react';
import { Flight } from '@/types';
import FlightCard from '@/components/FlightCard';
import FlightCondensedView from '@/components/FlightCondensedView';
import QuotaRibbon from '@/components/QuotaRibbon';
import HistoryModal from '@/components/HistoryModal';
import FlightModal from '@/components/FlightModal';
import { Plus, LayoutGrid, List, ArrowDownUp } from 'lucide-react';

type SortOption = 'departure-soonest' | 'departure-latest' | 'price-low' | 'price-high' | 'route-az';
type ViewMode = 'cards' | 'condensed';

export default function Dashboard() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [historyFlight, setHistoryFlight] = useState<Flight | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFlight, setEditingFlight] = useState<Flight | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [sortBy, setSortBy] = useState<SortOption>('departure-soonest');

  const fetchFlights = async () => {
    const res = await fetch('/api/flights');
    if (res.ok) setFlights(await res.json());
  };

  useEffect(() => { 
    fetchFlights(); 
  }, []);

  const handleEdit = (flight: Flight) => {
    setEditingFlight(flight);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingFlight(null);
    setIsModalOpen(true);
  };

  // Default sort is soonest flight, with other sort options
  const sortedFlights = useMemo(() => {
    const list = [...flights];
    switch (sortBy) {
      case 'departure-soonest':
        return list.sort((a, b) => a.departureDate.localeCompare(b.departureDate));
      case 'departure-latest':
        return list.sort((a, b) => b.departureDate.localeCompare(a.departureDate));
      case 'price-low':
        return list.sort((a, b) => a.currentPrice - b.currentPrice);
      case 'price-high':
        return list.sort((a, b) => b.currentPrice - a.currentPrice);
      case 'route-az':
        return list.sort((a, b) => {
          const routeA = `${a.origin || ''}${a.destination || ''}`;
          const routeB = `${b.origin || ''}${b.destination || ''}`;
          return routeA.localeCompare(routeB);
        });
      default:
        return list;
    }
  }, [flights, sortBy]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Flight Dashboard</h1>
          <p className="text-xs text-gunmetal-muted mt-0.5">Monitoring fare drops and cabin class changes</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sorting Dropdown */}
          <div className="flex items-center gap-1.5 bg-gunmetal-card border border-gunmetal-border rounded-md px-2.5 py-1.5 shadow-sm">
            <ArrowDownUp className="w-3.5 h-3.5 text-gunmetal-muted" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="departure-soonest" className="bg-gunmetal-card text-slate-200">Soonest Flight (Default)</option>
              <option value="departure-latest" className="bg-gunmetal-card text-slate-200">Furthest Flight</option>
              <option value="price-low" className="bg-gunmetal-card text-slate-200">Price: Low to High</option>
              <option value="price-high" className="bg-gunmetal-card text-slate-200">Price: High to Low</option>
              <option value="route-az" className="bg-gunmetal-card text-slate-200">Route (A-Z)</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center border border-gunmetal-border rounded-md bg-gunmetal-card p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              title="Card View"
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'cards' 
                  ? 'bg-gunmetal-border text-slate-100 border border-slate-500' 
                  : 'text-gunmetal-muted hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('condensed')}
              title="Condensed Stacked View"
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'condensed' 
                  ? 'bg-gunmetal-border text-slate-100 border border-slate-500' 
                  : 'text-gunmetal-muted hover:text-slate-200'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button 
            onClick={handleAddNew} 
            className="bg-gunmetal-border border border-slate-500 text-slate-100 shadow-sm px-4 py-2 rounded-md hover:bg-slate-700 hover:border-slate-400 flex items-center gap-2 text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Flight
          </button>
        </div>
      </div>

      <QuotaRibbon />

      {flights.length === 0 ? (
        <div className="py-16 text-center text-gunmetal-muted border-2 border-dashed border-gunmetal-border rounded-lg bg-gunmetal-card/40">
          <p className="text-base font-medium text-slate-300">No flights tracked yet</p>
          <p className="text-xs text-gunmetal-muted mt-1">Click "Add Flight" above to begin monitoring flight fares.</p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {sortedFlights.map(f => (
            <FlightCard 
              key={f.id} 
              flight={f} 
              onRefresh={fetchFlights} 
              onShowHistory={() => setHistoryFlight(f)} 
              onEdit={handleEdit}
            />
          ))}
        </div>
      ) : (
        <FlightCondensedView 
          flights={sortedFlights}
          onRefresh={fetchFlights}
          onShowHistory={f => setHistoryFlight(f)}
          onEdit={handleEdit}
        />
      )}

      <HistoryModal flight={historyFlight} onClose={() => setHistoryFlight(null)} />
      
      <FlightModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingFlight(null);
        }} 
        onSuccess={fetchFlights} 
        initialFlight={editingFlight}
      />
    </div>
  );
}