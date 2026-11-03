'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Flight, Settings } from '@/types';
import FlightCard from '@/components/FlightCard';
import FlightCondensedView from '@/components/FlightCondensedView';
import QuotaRibbon from '@/components/QuotaRibbon';
import HistoryModal from '@/components/HistoryModal';
import FlightModal from '@/components/FlightModal';
import { Plus, LayoutGrid, List, ArrowDownUp, ChevronRight, AlertTriangle, Play } from 'lucide-react';
import { getDataSourceStatus } from '@/utils/airline';

type SortOption = 'departure-soonest' | 'departure-latest' | 'price-low' | 'price-high' | 'route-az';
type ViewMode = 'cards' | 'condensed';

export default function Dashboard() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [historyFlight, setHistoryFlight] = useState<Flight | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFlight, setEditingFlight] = useState<Flight | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [sortBy, setSortBy] = useState<SortOption>('departure-soonest');
  const [quotaRefreshTrigger, setQuotaRefreshTrigger] = useState(0);
  const [showPastFlights, setShowPastFlights] = useState(false);

  const fetchFlights = async () => {
    const res = await fetch('/api/flights', { cache: 'no-store' });
    if (res.ok) setFlights(await res.json());
  };

  const fetchSettings = async () => {
    const res = await fetch('/api/settings', { cache: 'no-store' });
    if (res.ok) setSettings(await res.json());
  };

  const handleRefreshAll = () => {
    fetchFlights();
    fetchSettings();
    setQuotaRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => { 
    fetchFlights();
    fetchSettings();

    // Re-check settings when returning to the tab or dashboard
    const handleFocus = () => {
      fetchSettings();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const dsStatus = useMemo(() => getDataSourceStatus(settings), [settings]);

  const handleEdit = (flight: Flight) => {
    setEditingFlight(flight);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingFlight(null);
    setIsModalOpen(true);
  };

  const handleUnpauseAll = async () => {
    if (!settings) return;
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...settings,
        globalPause: 0,
        serpApiPaused: 0,
        searchApiPaused: 0,
        hasdataPaused: 0,
        fastFlightsPaused: 0,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSettings(updated);
      setQuotaRefreshTrigger(prev => prev + 1);
    }
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
          <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
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
            disabled={!dsStatus.available}
            title={!dsStatus.available ? dsStatus.reason : 'Track New Flight'}
            className={`border shadow-sm px-4 py-2 rounded-md flex items-center gap-2 text-sm font-semibold transition-colors ${
              !dsStatus.available
                ? 'bg-gunmetal-card border-gunmetal-border text-gunmetal-muted opacity-50 cursor-not-allowed'
                : 'bg-gunmetal-border border-slate-500 text-slate-100 hover:bg-slate-700 hover:border-slate-400'
            }`}
          >
            <Plus className="w-4 h-4" /> Add Flight
          </button>
        </div>
      </div>

      {/* Warning banner when Add Flight is disabled due to unconfigured or paused data sources */}
      {!dsStatus.available && (
        <div className="mb-6 p-4 rounded-lg bg-amber-950/30 border border-amber-800/60 flex items-start gap-3 text-amber-200 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-bold text-amber-100 block mb-0.5">
                {!dsStatus.configured
                  ? 'No Data Sources Configured'
                  : dsStatus.allPaused
                  ? 'All Data Sources Paused'
                  : 'API Quotas Exhausted'}
              </span>
              <span>{dsStatus.reason}</span>
            </div>
            {dsStatus.allPaused ? (
              <button
                type="button"
                onClick={handleUnpauseAll}
                className="self-start sm:self-center flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-amber-900/60 hover:bg-amber-800/70 border border-amber-600/70 text-amber-100 rounded text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Unpause All</span>
              </button>
            ) : (
              <Link href="/settings" className="self-start sm:self-center flex-shrink-0 underline font-semibold text-white hover:text-amber-300 whitespace-nowrap">
                Configure Settings &rarr;
              </Link>
            )}
          </div>
        </div>
      )}

      <QuotaRibbon 
        refreshTrigger={quotaRefreshTrigger} 
        onSettingsChange={setSettings} 
      />

      {(() => {
        const activeFlights = sortedFlights.filter(f => f.status !== 'Past');
        const pastFlights = sortedFlights.filter(f => f.status === 'Past');

        return (
          <>
            {activeFlights.length === 0 && pastFlights.length === 0 ? (
              <div className="py-16 text-center text-gunmetal-muted border-2 border-dashed border-gunmetal-border rounded-lg bg-gunmetal-card/40">
                <p className="text-base font-medium text-slate-300">No flights tracked yet</p>
                <p className="text-xs text-gunmetal-muted mt-1">Click "Add Flight" above to begin monitoring flight fares.</p>
              </div>
            ) : activeFlights.length === 0 ? (
              <div className="py-10 text-center text-gunmetal-muted border border-dashed border-gunmetal-border rounded-lg bg-gunmetal-card/40 mb-6">
                <p className="text-sm font-medium text-slate-300">No upcoming flights currently monitored</p>
                <p className="text-xs text-gunmetal-muted mt-1">Check past flights below or click "Add Flight" to start tracking.</p>
              </div>
            ) : viewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {activeFlights.map(f => (
                  <FlightCard 
                    key={f.id} 
                    flight={f} 
                    settings={settings}
                    onRefresh={handleRefreshAll} 
                    onShowHistory={() => setHistoryFlight(f)} 
                    onEdit={handleEdit} 
                  />
                ))}
              </div>
            ) : (
              <FlightCondensedView 
                flights={activeFlights} 
                settings={settings}
                onRefresh={handleRefreshAll} 
                onShowHistory={f => setHistoryFlight(f)} 
                onEdit={handleEdit} 
              />
            )}

            {/* Collapsible Hidden Section for Past Flights */}
            {pastFlights.length > 0 && (
              <div className="mt-10 pt-6 border-t border-gunmetal-border/80">
                <button
                  type="button"
                  onClick={() => setShowPastFlights(!showPastFlights)}
                  className="flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white transition-colors py-2 px-3 rounded-md bg-gunmetal-card border border-gunmetal-border shadow-sm mb-4"
                >
                  <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${showPastFlights ? 'rotate-90' : ''}`} />
                  <span>Past Flights ({pastFlights.length})</span>
                  <span className="text-xs text-gunmetal-muted font-normal ml-1">
                    (Checks disabled)
                  </span>
                </button>

                {showPastFlights && (
                  viewMode === 'cards' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {pastFlights.map(f => (
                        <FlightCard 
                          key={f.id} 
                          flight={f} 
                          settings={settings}
                          onRefresh={handleRefreshAll} 
                          onShowHistory={() => setHistoryFlight(f)} 
                          onEdit={handleEdit} 
                        />
                      ))}
                    </div>
                  ) : (
                    <FlightCondensedView 
                      flights={pastFlights} 
                      settings={settings}
                      onRefresh={handleRefreshAll} 
                      onShowHistory={f => setHistoryFlight(f)} 
                      onEdit={handleEdit} 
                    />
                  )
                )}
              </div>
            )}
          </>
        );
      })()}

      <HistoryModal flight={historyFlight} onClose={() => setHistoryFlight(null)} />
      
      <FlightModal 
         isOpen={isModalOpen} 
         onClose={() => {
           setIsModalOpen(false);
           setEditingFlight(null);
         }} 
         onSuccess={handleRefreshAll} 
         initialFlight={editingFlight} 
      />
    </div>
  );
}