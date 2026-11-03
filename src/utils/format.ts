export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount || 0));
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