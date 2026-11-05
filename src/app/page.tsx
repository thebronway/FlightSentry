'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Flight, Settings } from '@/types';
import FlightCard from '@/components/FlightCard';
import FlightCondensedView from '@/components/FlightCondensedView';
import QuotaRibbon from '@/components/QuotaRibbon';
import HistoryModal from '@/components/HistoryModal';
import FlightModal from '@/components/FlightModal';
import ConvertFlightModal from '@/components/ConvertFlightModal';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import { Plus, LayoutGrid, List, ArrowDownUp, ChevronRight, AlertTriangle, Play } from 'lucide-react';
import { getDataSourceStatus } from '@/utils/airline';
import { setActiveCurrency } from '@/utils/format';

type SortOption = 'departure-soonest' | 'departure-latest' | 'price-low' | 'price-high' | 'route-az';
type ViewMode = 'cards' | 'condensed';
type FilterOption = 'all' | 'watching' | 'booked';

export default function Dashboard() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [historyFlight, setHistoryFlight] = useState<Flight | null>(null);
  const [convertingFlight, setConvertingFlight] = useState<Flight | null>(null);
  const [deletingFlight, setDeletingFlight] = useState<Flight | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFlight, setEditingFlight] = useState<Flight | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [sortBy, setSortBy] = useState<SortOption>('departure-soonest');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [quotaRefreshTrigger, setQuotaRefreshTrigger] = useState(0);
  const [showPastFlights, setShowPastFlights] = useState(false);

  const fetchFlights = async () => {
    const res = await fetch('/api/flights', { cache: 'no-store' });
    if (res.ok) setFlights(await res.json());
  };

  const fetchSettings = async () => {
    const res = await fetch('/api/settings', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setSettings(data);
      if (data.currency) {
        setActiveCurrency(data.currency);
      }
    }
  };

  const handleRefreshAll = () => {
    fetchFlights();
    fetchSettings();
    setQuotaRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => { 
    fetchFlights();
    fetchSettings();

    // Hydrate persisted session view preferences
    try {
      const savedFilter = sessionStorage.getItem('flightsentry_dashboard_filter') as FilterOption | null;
      if (savedFilter && ['all', 'watching', 'booked'].includes(savedFilter)) {
        setFilterBy(savedFilter);
      }
      const savedSort = sessionStorage.getItem('flightsentry_dashboard_sort') as SortOption | null;
      if (savedSort && ['departure-soonest', 'departure-latest', 'price-low', 'price-high', 'route-az'].includes(savedSort)) {
        setSortBy(savedSort);
      }
      const savedView = sessionStorage.getItem('flightsentry_dashboard_view') as ViewMode | null;
      if (savedView && ['cards', 'condensed'].includes(savedView)) {
        setViewMode(savedView);
      }
    } catch {}

    // Re-check settings when returning to the tab or dashboard
    const handleFocus = () => {
      fetchSettings();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const dsStatus = useMemo(() => getDataSourceStatus(settings), [settings]);

  const handleFilterChange = (filter: FilterOption) => {
    setFilterBy(filter);
    try {
      sessionStorage.setItem('flightsentry_dashboard_filter', filter);
    } catch {}
  };

  const handleSortChange = (sort: SortOption) => {
    setSortBy(sort);
    try {
      sessionStorage.setItem('flightsentry_dashboard_sort', sort);
    } catch {}
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      sessionStorage.setItem('flightsentry_dashboard_view', mode);
    } catch {}
  };

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
          {/* Tracking Goal Filter Toggle */}
          {(() => {
            const isBooked = (f: Flight) => Boolean((f.purchasePrice && f.purchasePrice > 0) || f.pnr);
            const activeOnly = flights.filter(f => f.status !== 'Past');
            const watchingTotal = activeOnly.filter(f => !isBooked(f)).length;
            const bookedTotal = activeOnly.filter(f => isBooked(f)).length;

            return (
              <div className="flex items-center h-[38px] border border-gunmetal-border rounded-md bg-gunmetal-card p-0.5 shadow-sm">
                <button
                  type="button"
                  onClick={() => handleFilterChange('all')}
                  className={`h-full px-3 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    filterBy === 'all'
                      ? 'bg-gunmetal-border text-slate-100 border border-slate-500 shadow-sm'
                      : 'text-gunmetal-muted hover:text-slate-200'
                  }`}
                >
                  <span>All</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-gunmetal-canvas text-slate-300 font-mono">
                    {activeOnly.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFilterChange('watching')}
                  className={`h-full px-3 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    filterBy === 'watching'
                      ? 'bg-gunmetal-border text-slate-100 border border-slate-500 shadow-sm'
                      : 'text-gunmetal-muted hover:text-slate-200'
                  }`}
                >
                  <span>Watching</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-950/60 text-sky-300 border border-sky-800/40 font-mono">
                    {watchingTotal}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFilterChange('booked')}
                  className={`h-full px-3 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    filterBy === 'booked'
                      ? 'bg-gunmetal-border text-slate-100 border border-slate-500 shadow-sm'
                      : 'text-gunmetal-muted hover:text-slate-200'
                  }`}
                >
                  <span>Booked</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 font-mono">
                    {bookedTotal}
                  </span>
                </button>
              </div>
            );
          })()}

          {/* Sorting Dropdown */}
          <div className="flex items-center h-[38px] gap-2 bg-gunmetal-card border border-gunmetal-border rounded-md px-3 shadow-sm">
            <ArrowDownUp className="w-3.5 h-3.5 text-gunmetal-muted flex-shrink-0" />
            <select
              value={sortBy}
              onChange={e => handleSortChange(e.target.value as SortOption)}
              className="bg-transparent h-full text-xs text-slate-200 focus:outline-none cursor-pointer pr-1"
            >
              <option value="departure-soonest" className="bg-gunmetal-card text-slate-200">Soonest Flight (Default)</option>
              <option value="departure-latest" className="bg-gunmetal-card text-slate-200">Furthest Flight</option>
              <option value="price-low" className="bg-gunmetal-card text-slate-200">Price: Low to High</option>
              <option value="price-high" className="bg-gunmetal-card text-slate-200">Price: High to Low</option>
              <option value="route-az" className="bg-gunmetal-card text-slate-200">Route (A-Z)</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center h-[38px] border border-gunmetal-border rounded-md bg-gunmetal-card p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => handleViewModeChange('cards')}
              title="Card View"
              className={`h-full p-1.5 rounded transition-colors flex items-center justify-center ${
                viewMode === 'cards' 
                  ? 'bg-gunmetal-border text-slate-100 border border-slate-500' 
                  : 'text-gunmetal-muted hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange('condensed')}
              title="Condensed Stacked View"
              className={`h-full p-1.5 rounded transition-colors flex items-center justify-center ${
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
            className={`h-[38px] border shadow-sm px-4 rounded-md flex items-center gap-2 text-sm font-semibold transition-colors ${
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
        const isBooked = (f: Flight) => Boolean((f.purchasePrice && f.purchasePrice > 0) || f.pnr);
        const allActive = sortedFlights.filter(f => f.status !== 'Past');
        const allPast = sortedFlights.filter(f => f.status === 'Past');

        const activeFlights = allActive.filter(f => {
          if (filterBy === 'watching') return !isBooked(f);
          if (filterBy === 'booked') return isBooked(f);
          return true;
        });

        const pastFlights = allPast.filter(f => {
          if (filterBy === 'watching') return !isBooked(f);
          if (filterBy === 'booked') return isBooked(f);
          return true;
        });

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
                    onConvertToBooked={setConvertingFlight}
                    onDelete={setDeletingFlight}
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
                onConvertToBooked={setConvertingFlight}
                onDelete={setDeletingFlight}
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
                          onDelete={setDeletingFlight}
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
                      onDelete={setDeletingFlight}
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
         settings={settings}
      />

      <ConvertFlightModal
        isOpen={Boolean(convertingFlight)}
        flight={convertingFlight}
        onClose={() => setConvertingFlight(null)}
        onSuccess={handleRefreshAll}
      />

      <DeleteConfirmationModal
        isOpen={Boolean(deletingFlight)}
        flight={deletingFlight}
        onClose={() => setDeletingFlight(null)}
        onSuccess={handleRefreshAll}
      />
    </div>
  );
}