let activeAppCurrency = 'USD';

export const setActiveCurrency = (code?: string | null) => {
  if (code && typeof code === 'string') {
    activeAppCurrency = code.toUpperCase();
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('flightsentry_currency', activeAppCurrency);
      } catch {}
    }
  }
};

export const getActiveCurrency = (): string => {
  if (typeof window !== 'undefined' && activeAppCurrency === 'USD') {
    try {
      const stored = localStorage.getItem('flightsentry_currency');
      if (stored) activeAppCurrency = stored.toUpperCase();
    } catch {}
  }
  return activeAppCurrency;
};

export const formatCurrency = (amount: number, currencyCode?: string | null): string => {
  const code = currencyCode || getActiveCurrency();
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(amount || 0));
  } catch {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(amount || 0));
  }
};

export const getCurrencySymbol = (currencyCode?: string | null): string => {
  const code = currencyCode || getActiveCurrency();
  try {
    const parts = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(0);
    return parts.find(p => p.type === 'currency')?.value || '$';
  } catch {
    return '$';
  }
};

export const formatPercent = (percent: number): string => {
  return `${percent.toFixed(1)}%`;
};

export interface AlertTargetResult {
  dollarTarget: number | null;
  percentTarget: number | null;
  effectiveTarget: number | null;
}

export const computeAlertTargets = (
  currentPrice: number,
  dropDollar?: number | null,
  dropPercent?: number | null
): AlertTargetResult => {
  if (!currentPrice || currentPrice <= 0) {
    return { dollarTarget: null, percentTarget: null, effectiveTarget: null };
  }

  const dollarTarget =
    dropDollar !== undefined && dropDollar !== null && dropDollar > 0
      ? Math.max(0, Math.round(currentPrice - dropDollar))
      : null;

  const percentTarget =
    dropPercent !== undefined && dropPercent !== null && dropPercent > 0
      ? Math.max(0, Math.round(currentPrice * (1 - dropPercent / 100)))
      : null;

  let effectiveTarget: number | null = null;
  if (dollarTarget !== null && percentTarget !== null) {
    // Whichever threshold is met first as the price descends
    effectiveTarget = Math.max(dollarTarget, percentTarget);
  } else if (dollarTarget !== null) {
    effectiveTarget = dollarTarget;
  } else if (percentTarget !== null) {
    effectiveTarget = percentTarget;
  }

  return { dollarTarget, percentTarget, effectiveTarget };
};

export const computeIncreaseAlertTargets = (
  currentPrice: number,
  increaseDollar?: number | null,
  increasePercent?: number | null
): AlertTargetResult => {
  if (!currentPrice || currentPrice <= 0) {
    return { dollarTarget: null, percentTarget: null, effectiveTarget: null };
  }

  const dollarTarget =
    increaseDollar !== undefined && increaseDollar !== null && increaseDollar > 0
      ? Math.round(currentPrice + increaseDollar)
      : null;

  const percentTarget =
    increasePercent !== undefined && increasePercent !== null && increasePercent > 0
      ? Math.round(currentPrice * (1 + increasePercent / 100))
      : null;

  let effectiveTarget: number | null = null;
  if (dollarTarget !== null && percentTarget !== null) {
    // Whichever threshold is met first as the price ascends (the lower ceiling)
    effectiveTarget = Math.min(dollarTarget, percentTarget);
  } else if (dollarTarget !== null) {
    effectiveTarget = dollarTarget;
  } else if (percentTarget !== null) {
    effectiveTarget = percentTarget;
  }

  return { dollarTarget, percentTarget, effectiveTarget };
};