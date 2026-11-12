'use client';

import { Tag } from 'lucide-react';
import SettingsCard from '../shared/SettingsCard';
import SettingsSelect from '../shared/SettingsSelect';

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'AU$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: 'CN¥' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'SG$' },
];

interface Props {
  currency: string;
  onSelectCurrency: (newCurrency: string) => void;
}

export default function DisplayCurrencyCard({ currency, onSelectCurrency }: Props) {
  return (
    <SettingsCard className="space-y-3">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 mb-1">
          <Tag className="w-4 h-4 text-slate-400" />
          Display & Search Currency
        </label>
        <p className="text-[11px] text-gunmetal-muted mb-2.5">
          Sets the primary currency used for dashboard prices, corridor charts, and outbound Google Flights search API queries.
        </p>
      </div>

      <SettingsSelect
        value={currency || 'USD'}
        onChange={e => onSelectCurrency(e.target.value)}
        wrapperClassName="max-w-full sm:max-w-sm"
        className="font-medium"
      >
        {SUPPORTED_CURRENCIES.map(curr => (
          <option key={curr.code} value={curr.code} className="bg-gunmetal-card text-slate-200">
            {curr.code} — {curr.name} ({curr.symbol})
          </option>
        ))}
      </SettingsSelect>
    </SettingsCard>
  );
}