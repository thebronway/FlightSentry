'use client';

import { useEffect, useLayoutEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, ExternalLink, SlidersHorizontal } from 'lucide-react';
import { Settings } from '@/types';
import SettingsModalPortal from '@/components/settings/shared/SettingsModalPortal';
import { ONBOARDING_STEPS, OnboardingStepId } from './types';
import WelcomeStep from './steps/WelcomeStep';
import GeneralStep from './steps/GeneralStep';
import DataSourcesStep from './steps/DataSourcesStep';
import SchedulingStep from './steps/SchedulingStep';
import SearchPreferencesStep from './steps/SearchPreferencesStep';
import NotificationsStep from './steps/NotificationsStep';
import EmailScannerStep from './steps/EmailScannerStep';
import SecurityStep from './steps/SecurityStep';
import CompletionStep from './steps/CompletionStep';

interface Props {
  isOpen: boolean;
  activeStepId?: OnboardingStepId;
  settings: Settings | null;
  onSettingsUpdated: (updated: Settings) => void;
  onStepChange?: (stepId: OnboardingStepId) => void;
  onComplete: (updatedSettings?: Settings) => Promise<void> | void;
}

export default function OnboardingModal({
  isOpen,
  activeStepId,
  settings,
  onSettingsUpdated,
  onStepChange,
  onComplete,
}: Props) {
  const [stepIndex, setStepIndex] = useState(() => {
    if (!activeStepId) return 0;
    const found = ONBOARDING_STEPS.findIndex((s) => s.id === activeStepId);
    return found >= 0 ? found : 0;
  });
  const [draftSettings, setDraftSettings] = useState<Settings | null>(settings);
  const [saving, setSaving] = useState(false);
  const [autoSavedPulse, setAutoSavedPulse] = useState(false);
  const [bannerFeedback, setBannerFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const lastPersistedJsonRef = useRef<string>(settings ? JSON.stringify(settings) : '');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasOpenRef = useRef(false);
  const bodyScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!activeStepId) return;
    const found = ONBOARDING_STEPS.findIndex((s) => s.id === activeStepId);
    if (found >= 0 && found !== stepIndex) {
      setStepIndex(found);
    }
  }, [activeStepId, stepIndex]);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const initialIdx = activeStepId
        ? Math.max(0, ONBOARDING_STEPS.findIndex((s) => s.id === activeStepId))
        : 0;
      setStepIndex(initialIdx);
      setBannerFeedback(null);
      setAutoSavedPulse(false);
      if (settings) {
        setDraftSettings(settings);
        lastPersistedJsonRef.current = JSON.stringify(settings);
      }
    } else if (isOpen && !draftSettings && settings) {
      setDraftSettings(settings);
      lastPersistedJsonRef.current = JSON.stringify(settings);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, activeStepId, settings, draftSettings]);

  // Synchronously reset scroll position to top before paint when opening or switching steps
  useLayoutEffect(() => {
    if (!isOpen) return;
    if (bodyScrollRef.current) {
      bodyScrollRef.current.scrollTop = 0;
    }
  }, [stepIndex, isOpen]);

  const showFeedback = useCallback(
    (message: string, type: 'success' | 'error' = 'success') => {
      setBannerFeedback({ message, type });
      setTimeout(() => {
        setBannerFeedback((prev) => (prev?.message === message ? null : prev));
      }, 3500);
    },
    []
  );

  const persistSettings = useCallback(
    async (updated: Settings, toastMessage?: string): Promise<boolean> => {
      setSaving(true);
      try {
        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          lastPersistedJsonRef.current = JSON.stringify(data);
          setDraftSettings(data);
          onSettingsUpdated(data);
          setAutoSavedPulse(true);
          if (toastMessage) {
            showFeedback(toastMessage, 'success');
          }
          return true;
        }
        const errMsg = Array.isArray(data.error)
          ? data.error[0]?.message || 'Validation failed'
          : data.error || 'Failed to save settings';
        showFeedback(errMsg, 'error');
        return false;
      } catch (err: any) {
        showFeedback(err?.message || 'Network error saving settings', 'error');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [onSettingsUpdated, showFeedback]
  );

  // Automatically persist any modified settings after a short debounce
  useEffect(() => {
    if (!isOpen || !draftSettings) return;
    const currentJson = JSON.stringify(draftSettings);
    if (currentJson === lastPersistedJsonRef.current) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      void persistSettings(draftSettings);
    }, 500);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [isOpen, draftSettings, persistSettings]);

  const flushPendingChanges = useCallback(async (): Promise<boolean> => {
    if (!draftSettings) return true;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    if (JSON.stringify(draftSettings) === lastPersistedJsonRef.current) {
      return true;
    }
    return persistSettings(draftSettings);
  }, [draftSettings, persistSettings]);

  const markOnboardingCompleted = useCallback(async (): Promise<Settings | undefined> => {
    if (!draftSettings) return undefined;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    const finalized: Settings = { ...draftSettings, onboardingCompleted: 1 };
    const ok = await persistSettings(finalized);
    return ok ? finalized : draftSettings;
  }, [draftSettings, persistSettings]);

  const handleFinishAndClose = useCallback(async () => {
    if (!draftSettings || saving) return;
    const finalized = await markOnboardingCompleted();
    await onComplete(finalized);
  }, [draftSettings, saving, markOnboardingCompleted, onComplete]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        void handleFinishAndClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleFinishAndClose]);

  if (!isOpen || !draftSettings) return null;

  const currentStep = ONBOARDING_STEPS[stepIndex] || ONBOARDING_STEPS[0];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === ONBOARDING_STEPS.length - 1;

  const navigateToStepIndex = (targetIdx: number) => {
    const clamped = Math.min(ONBOARDING_STEPS.length - 1, Math.max(0, targetIdx));
    setStepIndex(clamped);
    const targetStep = ONBOARDING_STEPS[clamped];
    if (targetStep && onStepChange) {
      onStepChange(targetStep.id);
    }
  };

  const goNext = async () => {
    setBannerFeedback(null);
    if (isLastStep) {
      await handleFinishAndClose();
      return;
    }
    const ok = await flushPendingChanges();
    if (ok) {
      navigateToStepIndex(stepIndex + 1);
    }
  };

  const goBack = async () => {
    setBannerFeedback(null);
    const ok = await flushPendingChanges();
    if (ok) {
      navigateToStepIndex(stepIndex - 1);
    }
  };

  const handleSelectStep = async (targetIdx: number) => {
    if (targetIdx === stepIndex) return;
    setBannerFeedback(null);
    const ok = await flushPendingChanges();
    if (ok) {
      navigateToStepIndex(targetIdx);
    }
  };

  const renderStepContent = (stepId: OnboardingStepId) => {
    const sharedProps = {
      settings: draftSettings,
      onChange: setDraftSettings,
      onSaveSettings: persistSettings,
      onSkipToSettingsLater: goNext,
      onNext: goNext,
      onBack: goBack,
    };

    switch (stepId) {
      case 'welcome':
        return (
          <WelcomeStep
            onStartTour={goNext}
            onSkipAll={() => void handleFinishAndClose()}
          />
        );
      case 'general':
        return <GeneralStep {...sharedProps} />;
      case 'data-sources':
        return <DataSourcesStep {...sharedProps} />;
      case 'scheduling':
        return <SchedulingStep {...sharedProps} />;
      case 'search-preferences':
        return <SearchPreferencesStep {...sharedProps} />;
      case 'notifications':
        return <NotificationsStep {...sharedProps} />;
      case 'email-scanner':
        return <EmailScannerStep {...sharedProps} />;
      case 'security':
        return <SecurityStep {...sharedProps} />;
      case 'summary':
        return (
          <CompletionStep
            settings={draftSettings}
            onFinish={() => void markOnboardingCompleted()}
          />
        );
    }
  };

  return (
    <SettingsModalPortal>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 md:p-6 transition-all"
      >
        <div className="bg-gunmetal-card w-full h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl shadow-2xl border border-gunmetal-border flex flex-col overflow-hidden max-w-4xl lg:max-w-5xl xl:max-w-6xl">
          {/* Top Header & Stepper */}
          <div className="bg-gunmetal-nav/90 border-b border-gunmetal-border px-4 sm:px-6 pt-3.5 pb-3 space-y-3 flex-shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-gunmetal-canvas border border-gunmetal-border flex items-center justify-center flex-shrink-0">
                  <Image
                    src="/FlightSentry-Main-icon-sm.png"
                    alt="FlightSentry"
                    width={28}
                    height={28}
                    className="w-6 h-6 object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-950/60 border border-sky-800/60 text-sky-300">
                      Step {currentStep.stepNumber} of {ONBOARDING_STEPS.length}
                    </span>
                    {currentStep.settingsTab && currentStep.settingsTabLabel && (
                      <Link
                        href={`/settings/${currentStep.settingsTab}`}
                        onClick={() => void markOnboardingCompleted()}
                        className="text-[11px] text-gunmetal-muted hover:text-sky-300 inline-flex items-center gap-1 transition-colors"
                      >
                        <SlidersHorizontal className="w-3 h-3" />
                        <span>{currentStep.settingsTabLabel}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    )}
                  </div>
                  <h2
                    id="onboarding-modal-title"
                    className="text-base sm:text-lg font-bold text-slate-100 truncate mt-0.5"
                  >
                    {currentStep.title}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {!isLastStep && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleFinishAndClose()}
                    className="hidden sm:inline-flex items-center justify-center min-h-[36px] px-3.5 py-1.5 rounded-lg bg-gunmetal-canvas hover:bg-gunmetal-border border border-gunmetal-border text-xs font-semibold text-gunmetal-muted hover:text-slate-100 leading-none transition-colors cursor-pointer"
                  >
                    Set up in Settings later
                  </button>
                )}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleFinishAndClose()}
                  aria-label="Close setup wizard and configure in Settings later"
                  title="Close setup wizard (configure in Settings later)"
                  className="min-h-[40px] min-w-[40px] sm:min-h-[36px] sm:min-w-[36px] inline-flex items-center justify-center rounded-lg text-gunmetal-muted hover:text-slate-100 hover:bg-gunmetal-border/60 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Progress Bar & Clickable Step Pills */}
            <div className="space-y-2">
              <div className="relative w-full h-1.5 rounded-full bg-gunmetal-canvas overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-sky-500 transition-all duration-300 w-[var(--bar-fallback)] lg:w-[var(--bar-grid)]"
                  style={
                    {
                      '--bar-fallback': `${((stepIndex + 1) / ONBOARDING_STEPS.length) * 100}%`,
                      '--bar-grid': `calc(((100% - 3rem) / 9) * ${stepIndex + 1} + ${stepIndex * 0.375}rem)`,
                    } as React.CSSProperties
                  }
                />
              </div>

              <div className="flex flex-wrap lg:grid lg:grid-cols-9 gap-1.5">
                {ONBOARDING_STEPS.map((s, idx) => {
                  const isActive = idx === stepIndex;
                  const isVisited = idx < stepIndex;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => void handleSelectStep(idx)}
                      className={`min-h-[34px] lg:min-h-0 px-2.5 lg:px-1.5 py-1.5 rounded-md text-[11px] lg:text-[10px] xl:text-[11px] font-semibold border transition-colors cursor-pointer inline-flex items-center justify-center gap-1 min-w-0 ${
                        isActive
                          ? 'bg-gunmetal-border border-sky-500/80 border-b-2 border-b-sky-400 text-slate-100 shadow-sm'
                          : isVisited
                          ? 'bg-gunmetal-canvas/80 border-gunmetal-border text-slate-300 hover:text-white'
                          : 'bg-gunmetal-canvas/40 border-gunmetal-border/60 text-gunmetal-muted hover:text-slate-200'
                      }`}
                    >
                      <span className="font-mono text-[10px] opacity-80 flex-shrink-0">
                        {s.stepNumber}.
                      </span>
                      <span className="truncate">{s.shortTitle}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Scrollable Step Body */}
          <div
            ref={bodyScrollRef}
            className="flex-1 overflow-y-auto [overflow-anchor:none] p-4 sm:p-6 space-y-5 min-h-0"
          >
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-gunmetal-canvas/50 border border-gunmetal-border/80 rounded-xl p-3.5">
              {currentStep.subtitle}
            </p>

            {bannerFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                  bannerFeedback.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-700/70 text-emerald-200'
                    : 'bg-rose-950/45 border-rose-700/70 text-rose-200'
                }`}
              >
                {bannerFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                )}
                <span>{bannerFeedback.message}</span>
              </div>
            )}

            <div key={currentStep.id}>{renderStepContent(currentStep.id)}</div>
          </div>

          {/* Sticky Footer */}
          <div className="bg-gunmetal-card border-t border-gunmetal-border px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 z-20 flex-shrink-0">
            <div className="flex items-center justify-between sm:justify-start gap-3">
              {!isFirstStep && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void goBack()}
                  className="min-h-[42px] sm:min-h-[38px] px-3.5 py-2 text-xs font-semibold text-slate-200 bg-gunmetal-canvas border border-gunmetal-border hover:bg-gunmetal-border rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>
              )}

              <span className="text-[11px] text-gunmetal-muted">
                {saving
                  ? 'Saving changes...'
                  : autoSavedPulse
                  ? 'Changes auto-saved · Editable anytime in Settings'
                  : 'All changes auto-save · Editable anytime in Settings'}
              </span>

              <button
                type="button"
                disabled={saving}
                onClick={() => void handleFinishAndClose()}
                className="sm:hidden min-h-[38px] px-3 py-1.5 text-xs font-semibold text-gunmetal-muted hover:text-slate-100 bg-gunmetal-canvas border border-gunmetal-border rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer"
              >
                Set up later
              </button>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={() => void goNext()}
              className="min-h-[42px] sm:min-h-[38px] px-5 py-2 text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors bg-gunmetal-border border border-slate-500 text-slate-100 hover:bg-slate-700 hover:border-slate-400 inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>
                {saving
                  ? 'Saving...'
                  : isFirstStep
                  ? 'Start Guided Setup'
                  : isLastStep
                  ? 'Finish & Open Dashboard'
                  : 'Continue'}
              </span>
              {!isLastStep && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </SettingsModalPortal>
  );
}