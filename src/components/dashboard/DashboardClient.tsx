'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Flight, Settings } from '@/types';
import FlightCard from '@/components/FlightCard';
import FlightCardCondensed from '@/components/FlightCardCondensed';
import QuotaRibbon from '@/components/QuotaRibbon';
import HistoryModal from '@/components/HistoryModal';
import FlightModal from '@/components/FlightModal';
import ConvertFlightModal from '@/components/ConvertFlightModal';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import ManualPriceEntryModal from '@/components/history/ManualPriceEntryModal';
import RebookFlightModal from '@/components/history/RebookFlightModal';
import EmailQueueModal from '@/components/emailQueue/EmailQueueModal';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import { isValidOnboardingStep, OnboardingStepId } from '@/components/onboarding/types';
import { Plus, LayoutGrid, List, ArrowDownUp, ChevronRight, AlertTriangle, Play } from 'lucide-react';
import { getDataSourceStatus } from '@/utils/airline';
import { setActiveCurrency } from '@/utils/format';

type SortOption = 'departure-soonest' | 'departure-latest' | 'price-low' | 'price-high' | 'route-az';
type ViewMode = 'cards' | 'condensed';
type FilterOption = 'all' | 'watching' | 'booked';

interface DashboardClientProps {
  children?: React.ReactNode;
  initialSettings?: Settings | null;
  initialFlights?: Flight[];
}

export default function DashboardClient({
  children,
  initialSettings = null,
  initialFlights,
}: DashboardClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [flights, setFlights] = useState<Flight[]>(initialFlights ?? []);
  const [flightsLoaded, setFlightsLoaded] = useState<boolean>(initialFlights !== undefined);
  const [settings, setSettings] = useState<Settings | null>(initialSettings);
  const [convertingFlight, setConvertingFlight] = useState<Flight | null>(null);
  const [deletingFlight, setDeletingFlight] = useState<Flight | null>(null);
  const [manualEntryFlight, setManualEntryFlight] = useState<Flight | null>(null);
  const [rebookingFlight, setRebookingFlight] = useState<Flight | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [sortBy, setSortBy] = useState<SortOption>('departure-soonest');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [quotaRefreshTrigger, setQuotaRefreshTrigger] = useState(0);
  const [showPastFlights, setShowPastFlights] = useState(false);
  const [queueRefreshKey, setQueueRefreshKey] = useState(0);

  const fetchFlights = useCallback(async () => {
    try {
      const res = await fetch('/api/flights', { cache: 'no-store' });
      if (res.status === 401) {
        window.location.assign('/login');
        return;
      }
      if (res.ok) {
        const nextFlights: Flight[] = await res.json();
        setFlights(prev =>
          JSON.stringify(prev) === JSON.stringify(nextFlights) ? prev : nextFlights
        );
      }
    } finally {
      setFlightsLoaded(true);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    const res = await fetch('/api/settings', { cache: 'no-store' });
    if (res.status === 401) {
      window.location.assign('/login');
      return;
    }
    if (res.ok) {
      const data: Settings = await res.json();
      setSettings(prev =>
        JSON.stringify(prev) === JSON.stringify(data) ? prev : data
      );
      if (data.currency) {
        setActiveCurrency(data.currency);
      }
    }
  }, []);

  const handleRefreshAll = () => {
    fetchFlights();
    fetchSettings();
    setQuotaRefreshTrigger(prev => prev + 1);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flightsentry:email-queue-updated'));
    }
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

    const handleOpenQueueEvent = () => {
      setQueueRefreshKey(prev => prev + 1);
    };
    window.addEventListener('flightsentry:open-email-queue', handleOpenQueueEvent);

    return () => {
      window.removeEventListener('flightsentry:open-email-queue', handleOpenQueueEvent);
    };
  }, [fetchFlights, fetchSettings]);

  const isOnboardingRoute =
    pathname === '/dashboard/onboarding' || pathname.startsWith('/dashboard/onboarding/');

  // Background & focus sync paused while onboarding modal is open to avoid visual flicker
  useEffect(() => {
    if (isOnboardingRoute) return;

    const handleSync = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void fetchFlights();
      void fetchSettings();
      setQuotaRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleSync);

    const pollInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void fetchFlights();
        setQuotaRefreshTrigger(prev => prev + 1);
      }
    }, 45000);

    return () => {
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleSync);
      clearInterval(pollInterval);
    };
  }, [isOnboardingRoute, fetchFlights, fetchSettings]);

  // Support legacy ?emailQueue=1 query param by redirecting cleanly to /dashboard/email-queue
  useEffect(() => {
    if (pathname === '/dashboard' && searchParams.get('emailQueue') === '1') {
      const rawItemId = searchParams.get('queueItemId') || searchParams.get('itemId');
      const parsedItemId = rawItemId ? parseInt(rawItemId, 10) : NaN;
      router.replace(
        !Number.isNaN(parsedItemId) && parsedItemId > 0
          ? `/dashboard/email-queue?itemId=${parsedItemId}`
          : '/dashboard/email-queue'
      );
    }
  }, [pathname, searchParams, router]);

  // Redirect first-run instances or ?onboarding=1 to the routable /dashboard/onboarding wizard
  useEffect(() => {
    if (!settings || pathname !== '/dashboard') return;
    if (searchParams.get('onboarding') === '1' || settings.onboardingCompleted === 0) {
      router.replace('/dashboard/onboarding');
    }
  }, [settings, pathname, searchParams, router]);

  const handleOnboardingStepChange = useCallback(
    (stepId: OnboardingStepId) => {
      router.push(
        stepId === 'welcome' ? '/dashboard/onboarding' : `/dashboard/onboarding/${stepId}`
      );
    },
    [router]
  );

  const handleOnboardingComplete = useCallback(
    async (updatedSettings?: Settings) => {
      if (updatedSettings) {
        setSettings(updatedSettings);
      } else {
        await fetchSettings();
      }
      router.push('/dashboard');
    },
    [fetchSettings, router]
  );

  // Resolve active routable modal from URL pathname
  const routeModal = useMemo(() => {
    if (pathname === '/dashboard/onboarding') {
      return { type: 'onboarding' as const, stepId: 'welcome' as OnboardingStepId };
    }
    const onboardingMatch = pathname.match(/^\/dashboard\/onboarding\/([^/]+)$/);
    if (onboardingMatch) {
      const candidate = onboardingMatch[1];
      if (!isValidOnboardingStep(candidate)) {
        return { type: 'invalid-onboarding' as const };
      }
      return { type: 'onboarding' as const, stepId: candidate };
    }
    if (pathname.startsWith('/dashboard/onboarding/')) {
      return { type: 'invalid-onboarding' as const };
    }
    if (pathname === '/dashboard/flights/new') {
      return { type: 'new' as const };
    }
    if (pathname === '/dashboard/email-queue') {
      const rawItemId = searchParams.get('itemId') || searchParams.get('queueItemId');
      const parsedItemId = rawItemId ? parseInt(rawItemId, 10) : NaN;
      return {
        type: 'email-queue' as const,
        highlightedItemId: !Number.isNaN(parsedItemId) && parsedItemId > 0 ? parsedItemId : null,
      };
    }
    const editMatch = pathname.match(/^\/dashboard\/flights\/(\d+)\/edit$/);
    if (editMatch) {
      return { type: 'edit' as const, flightId: Number(editMatch[1]) };
    }
    const historyMatch = pathname.match(/^\/dashboard\/flights\/(\d+)$/);
    if (historyMatch) {
      return { type: 'history' as const, flightId: Number(historyMatch[1]) };
    }
    if (pathname.startsWith('/dashboard/flights/')) {
      return { type: 'invalid' as const };
    }
    return { type: 'none' as const };
  }, [pathname, searchParams]);

  // Redirect to /dashboard if a flight route ID is invalid or no longer exists
  useEffect(() => {
    if (routeModal.type === 'invalid-onboarding') {
      router.replace('/dashboard/onboarding');
      return;
    }
    if (routeModal.type === 'invalid') {
      router.replace('/dashboard');
      return;
    }
    if ((routeModal.type === 'history' || routeModal.type === 'edit') && flightsLoaded) {
      const exists = flights.some(f => f.id === routeModal.flightId);
      if (!exists) {
        router.replace('/dashboard');
      }
    }
  }, [routeModal, flights, flightsLoaded, router]);

  const dsStatus = useMemo(() => getDataSourceStatus(settings), [settings]);

  const activeHistoryFlight = useMemo(() => {
    if (routeModal.type !== 'history') return null;
    return flights.find(f => f.id === routeModal.flightId) || null;
  }, [flights, routeModal]);

  const activeEditingFlight = useMemo(() => {
    if (routeModal.type !== 'edit') return null;
    return flights.find(f => f.id === routeModal.flightId) || null;
  }, [flights, routeModal]);

  const isFlightModalOpen =
    routeModal.type === 'new' || (routeModal.type === 'edit' && Boolean(activeEditingFlight));

  const handleCloseRouteModal = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

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

  const handleShowHistory = (flight: Flight) => {
    router.push(`/dashboard/flights/${flight.id}`);
  };

  const handleEdit = (flight: Flight) => {
    router.push(`/dashboard/flights/${flight.id}/edit`);
  };

  const handleAddNew = () => {
    router.push('/dashboard/flights/new');
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
        openfareScraperPaused: 0,
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
            const isBooked = (f: Flight) => f.status === 'Booked' || Boolean((f.purchasePrice && f.purchasePrice > 0) || f.pnr);
            const activeOnly = flights.filter(f => f.status !== 'Past');
            const watchingTotal = activeOnly.filter(f => !isBooked(f)).length;
            const bookedTotal = activeOnly.filter(f => isBooked(f)).length;

            return (
              <div className="flex items-center min-h-[44px] sm:h-[38px] border border-gunmetal-border rounded-md bg-gunmetal-card p-0.5 shadow-sm">
                <button
                  type="button"
                  onClick={() => handleFilterChange('all')}
                  className={`min-h-[40px] sm:min-h-0 sm:h-full px-3 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
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
                  className={`min-h-[40px] sm:min-h-0 sm:h-full px-3 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
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
                  className={`min-h-[40px] sm:min-h-0 sm:h-full px-3 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
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
          <div className="flex items-center min-h-[44px] sm:h-[38px] gap-2 bg-gunmetal-card border border-gunmetal-border rounded-md px-3 shadow-sm">
            <ArrowDownUp className="w-3.5 h-3.5 text-gunmetal-muted flex-shrink-0" />
            <select
              value={sortBy}
              onChange={e => handleSortChange(e.target.value as SortOption)}
              className="bg-transparent min-h-[44px] sm:min-h-0 sm:h-full text-xs text-slate-200 focus:outline-none cursor-pointer pr-1"
            >
              <option value="departure-soonest" className="bg-gunmetal-card text-slate-200">Soonest Flight (Default)</option>
              <option value="departure-latest" className="bg-gunmetal-card text-slate-200">Furthest Flight</option>
              <option value="price-low" className="bg-gunmetal-card text-slate-200">Price: Low to High</option>
              <option value="price-high" className="bg-gunmetal-card text-slate-200">Price: High to Low</option>
              <option value="route-az" className="bg-gunmetal-card text-slate-200">Route (A-Z)</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center min-h-[44px] sm:h-[38px] border border-gunmetal-border rounded-md bg-gunmetal-card p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => handleViewModeChange('cards')}
              title="Card View"
              className={`min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 sm:h-full p-1.5 rounded transition-colors flex items-center justify-center cursor-pointer ${
                viewMode === 'cards' 
                  ? 'bg-gunmetal-border text-slate-100 border border-slate-500 shadow-sm' 
                  : 'text-gunmetal-muted hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange('condensed')}
              title="Condensed Stacked View"
              className={`min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 sm:h-full p-1.5 rounded transition-colors flex items-center justify-center cursor-pointer ${
                viewMode === 'condensed' 
                  ? 'bg-gunmetal-border text-slate-100 border border-slate-500 shadow-sm' 
                  : 'text-gunmetal-muted hover:text-slate-200'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button 
            type="button"
            onClick={handleAddNew}
            title="Track New Flight"
            className="min-h-[44px] sm:min-h-[38px] px-4 py-2 rounded-lg text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 bg-slate-800/75 hover:bg-slate-700/85 border border-slate-500/80 hover:border-slate-400 text-slate-100 hover:text-white font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Flight
          </button>
        </div>
      </div>

      {/* Warning banner when data sources are unconfigured, paused, or exhausted */}
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
              <span>
                {dsStatus.reason} Automated price checks are unavailable, though you can still add flights in Manual Mode or Points / Miles mode.
              </span>
            </div>
            {dsStatus.allPaused ? (
              <button
                type="button"
                onClick={handleUnpauseAll}
                className="self-start sm:self-center flex-shrink-0 min-h-[44px] sm:min-h-[36px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-amber-950/60 hover:bg-amber-900/75 border border-amber-700/80 text-amber-200 hover:text-white font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Unpause All</span>
              </button>
            ) : (
              <Link href="/settings/data-sources" className="self-start sm:self-center flex-shrink-0 underline font-semibold text-white hover:text-amber-300 whitespace-nowrap">
                Configure Settings &rarr;
              </Link>
            )}
          </div>
        </div>
      )}

      <QuotaRibbon 
        refreshTrigger={quotaRefreshTrigger} 
        initialSettings={settings}
        onSettingsChange={setSettings} 
      />

      {(() => {
        const isBooked = (f: Flight) => f.status === 'Booked' || Boolean((f.purchasePrice && f.purchasePrice > 0) || f.pnr);
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
                <p className="text-sm font-medium text-slate-300">No active flights currently monitored</p>
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
                    onShowHistory={() => handleShowHistory(f)} 
                    onEdit={handleEdit} 
                    onConvertToBooked={setConvertingFlight}
                    onOpenManualCheck={setManualEntryFlight}
                    onRebook={setRebookingFlight}
                    onDelete={setDeletingFlight}
                  />
                ))}
              </div>
            ) : (
              <FlightCardCondensed 
                flights={activeFlights} 
                settings={settings}
                onRefresh={handleRefreshAll} 
                onShowHistory={handleShowHistory} 
                onEdit={handleEdit} 
                onConvertToBooked={setConvertingFlight}
                onOpenManualCheck={setManualEntryFlight}
                onRebook={setRebookingFlight}
                onDelete={setDeletingFlight}
              />
            )}

            {/* Collapsible Hidden Section for Past Flights */}
            {pastFlights.length > 0 && (
              <div className="mt-10 pt-6 border-t border-gunmetal-border/80">
                <button
                  type="button"
                  onClick={() => setShowPastFlights(!showPastFlights)}
                  className="min-h-[44px] sm:min-h-[38px] flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white transition-colors py-2 px-3 rounded-md bg-gunmetal-card border border-gunmetal-border shadow-sm mb-4 cursor-pointer"
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
                          onShowHistory={() => handleShowHistory(f)} 
                          onEdit={handleEdit} 
                          onDelete={setDeletingFlight}
                        />
                      ))}
                    </div>
                  ) : (
                    <FlightCardCondensed 
                      flights={pastFlights} 
                      settings={settings}
                      onRefresh={handleRefreshAll} 
                      onShowHistory={handleShowHistory} 
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

      {children}

      <HistoryModal 
        flight={activeHistoryFlight} 
        settings={settings}
        onClose={handleCloseRouteModal} 
        onUpdateFlight={handleRefreshAll}
      />

      <ManualPriceEntryModal
        isOpen={Boolean(manualEntryFlight)}
        flight={manualEntryFlight}
        onClose={() => setManualEntryFlight(null)}
        onSuccess={handleRefreshAll}
      />

      <RebookFlightModal
        isOpen={Boolean(rebookingFlight)}
        flight={rebookingFlight}
        onClose={() => setRebookingFlight(null)}
        onSuccess={handleRefreshAll}
      />
      
      <FlightModal 
         isOpen={isFlightModalOpen} 
         onClose={handleCloseRouteModal} 
         onSuccess={handleRefreshAll} 
         initialFlight={activeEditingFlight} 
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

      <EmailQueueModal
        key={queueRefreshKey}
        isOpen={routeModal.type === 'email-queue'}
        highlightedItemId={routeModal.type === 'email-queue' ? routeModal.highlightedItemId : null}
        onClose={handleCloseRouteModal}
        onQueueMutated={handleRefreshAll}
      />

      <OnboardingModal
        isOpen={routeModal.type === 'onboarding'}
        activeStepId={routeModal.type === 'onboarding' ? routeModal.stepId : 'welcome'}
        settings={settings}
        onSettingsUpdated={setSettings}
        onStepChange={handleOnboardingStepChange}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
}