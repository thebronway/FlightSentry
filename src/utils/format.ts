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