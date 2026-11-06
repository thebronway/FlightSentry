'use client';

import React, { useState, useRef } from 'react';
import { X } from 'lucide-react';
import { getAirlineTheme } from '@/utils/airlineThemes';
import { normalizeAirlineCode } from '@/utils/airline';

interface AirlineTagInputProps {
  value?: string | null;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxTags?: number;
}

export default function AirlineTagInput({
  value = '',
  onChange,
  placeholder = 'e.g. DL, AA (type code & press space or comma)',
  disabled = false,
  className = '',
  maxTags,
}: AirlineTagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const tags = React.useMemo(() => {
    if (!value) return [];
    return value
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean);
  }, [value]);

  const commitToken = (raw: string) => {
    if (!raw.trim()) return;
    const normalized = normalizeAirlineCode(raw);
    const clean = normalized && normalized !== 'UN' ? normalized : raw.trim().toUpperCase();
    if (clean) {
      if (maxTags === 1) {
        onChange(clean);
      } else if (!tags.includes(clean)) {
        if (maxTags && tags.length >= maxTags) return;
        const updated = [...tags, clean];
        onChange(updated.join(', '));
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    if (maxTags === 1) {
      if (text.includes(',') || text.includes(' ')) {
        const token = text.replace(/[, ]+/g, '').trim();
        if (token) commitToken(token);
        setInputValue('');
      } else {
        setInputValue(text.toUpperCase());
      }
      return;
    }

    if (text.includes(',') || text.includes(' ')) {
      const rawTokens = text.split(/[, ]+/);
      const remaining = rawTokens.pop() || '';
      const currentTags = [...tags];

      for (const token of rawTokens) {
        if (!token.trim()) continue;
        const normalized = normalizeAirlineCode(token);
        const clean = normalized && normalized !== 'UN' ? normalized : token.trim().toUpperCase();
        if (clean && !currentTags.includes(clean)) {
          if (maxTags && currentTags.length >= maxTags) break;
          currentTags.push(clean);
        }
      }

      onChange(currentTags.join(', '));
      setInputValue(remaining.toUpperCase());
    } else {
      setInputValue(text.toUpperCase());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        commitToken(inputValue);
        setInputValue('');
      }
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      e.preventDefault();
      const updated = tags.slice(0, -1);
      onChange(updated.join(', '));
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      commitToken(inputValue);
      setInputValue('');
    }
  };

  const removeTag = (idxToRemove: number) => {
    const updated = tags.filter((_, idx) => idx !== idxToRemove);
    onChange(updated.join(', '));
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className={`min-h-[42px] px-2.5 py-1.5 rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus-within:border-slate-500 flex flex-wrap items-center gap-1.5 cursor-text transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      {tags.map((code, idx) => {
        const theme = getAirlineTheme(code);
        return (
          <span
            key={`${code}-${idx}`}
            className="inline-flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded text-xs font-medium bg-gunmetal-card border border-gunmetal-border text-slate-200 shadow-sm transition-all hover:border-slate-600 select-none"
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: theme.color }}
            />
            <span className="font-mono font-bold">{code}</span>
            <span className="text-[11px] text-gunmetal-muted max-w-[85px] truncate font-sans">
              {theme.shortName}
            </span>
            <button
              type="button"
              disabled={disabled}
              onClick={e => {
                e.stopPropagation();
                removeTag(idx);
              }}
              className="p-0.5 text-gunmetal-muted hover:text-slate-100 hover:bg-gunmetal-canvas rounded transition-colors"
              title={`Remove ${code}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        );
      })}

      {(!maxTags || tags.length < maxTags) && (
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          disabled={disabled}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={tags.length === 0 ? placeholder : 'Add carrier...'}
          className="bg-transparent text-sm uppercase text-slate-200 placeholder-zinc-500 focus:outline-none flex-1 min-w-[70px] h-6 font-mono"
        />
      )}
    </div>
  );
}