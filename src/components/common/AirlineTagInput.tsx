'use client';

import React, { useState, useRef } from 'react';
import { X, Globe } from 'lucide-react';
import {
  getAirlineTheme,
  AIRLINE_ALLIANCES,
  AirlineAllianceKey,
  resolveAllianceKey,
} from '@/utils/airlineThemes';
import { normalizeAirlineCode, isValidAirlineCode } from '@/utils/airline';
import Tooltip from './Tooltip';

interface AirlineTagInputProps {
  value?: string | null;
  onChange: (val: string) => void;
  onDraftChange?: (draft: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxTags?: number;
  showAlliances?: boolean;
}

export default function AirlineTagInput({
  value = '',
  onChange,
  onDraftChange,
  onBlur,
  placeholder = 'e.g. DL, AA (type code & press space or comma)',
  disabled = false,
  className = '',
  maxTags,
  showAlliances = true,
}: AirlineTagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const resolveValidCarrierToken = (rawToken: string): string | null => {
    const trimmed = rawToken.trim();
    if (!trimmed) return null;
    const normalized = normalizeAirlineCode(trimmed);
    if (normalized !== 'UN' && isValidAirlineCode(normalized)) {
      return normalized;
    }
    const upper = trimmed.toUpperCase();
    if (isValidAirlineCode(upper)) {
      return upper;
    }
    return null;
  };

  const tags = React.useMemo(() => {
    if (!value) return [];
    return value
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean);
  }, [value]);

  const commitToken = (raw: string): boolean => {
    if (!raw.trim()) return true;
    if (showAlliances && maxTags !== 1) {
      const allianceKey = resolveAllianceKey(raw);
      if (allianceKey) {
        setValidationError(null);
        if (!tags.includes(allianceKey)) {
          if (maxTags && tags.length >= maxTags) return true;
          onChange([...tags, allianceKey].join(', '));
        }
        return true;
      }
    }

    const clean = resolveValidCarrierToken(raw);
    if (!clean) {
      const upper = raw.trim().toUpperCase();
      setValidationError(
        upper === 'XX' || upper === 'UN'
          ? `Carrier code "${upper}" is not allowed. Enter a valid 2-character IATA airline code (e.g. DL, B6).`
          : `"${upper}" is not a valid 2-character IATA airline code (e.g. DL, B6, 9W).`
      );
      return false;
    }

    setValidationError(null);
    if (maxTags === 1) {
      onChange(clean);
    } else if (!tags.includes(clean)) {
      if (maxTags && tags.length >= maxTags) return true;
      const updated = [...tags, clean];
      onChange(updated.join(', '));
    }
    return true;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    if (validationError) setValidationError(null);

    if (maxTags === 1) {
      if (text.includes(',') || text.includes(' ')) {
        const token = text.replace(/[, ]+/g, '').trim();
        if (token) {
          if (commitToken(token)) {
            setInputValue('');
            onDraftChange?.('');
          }
        } else {
          setInputValue('');
          onDraftChange?.('');
        }
      } else {
        const upper = text.toUpperCase();
        setInputValue(upper);
        onDraftChange?.(upper);
      }
      return;
    }

    if (text.includes(',') || text.includes(' ')) {
      const rawTokens = text.split(/[, ]+/);
      const remaining = rawTokens.pop() || '';
      const currentTags = [...tags];
      let invalidToken: string | null = null;

      for (const token of rawTokens) {
        if (!token.trim()) continue;
        const allianceKey = showAlliances ? resolveAllianceKey(token) : null;
        const clean = allianceKey || resolveValidCarrierToken(token);

        if (!clean) {
          invalidToken = token.trim().toUpperCase();
          continue;
        }

        if (!currentTags.includes(clean)) {
          if (maxTags && currentTags.length >= maxTags) break;
          currentTags.push(clean);
        }
      }

      onChange(currentTags.join(', '));
      if (invalidToken) {
        setValidationError(
          invalidToken === 'XX' || invalidToken === 'UN'
            ? `Carrier code "${invalidToken}" is not allowed. Enter a valid 2-character IATA airline code (e.g. DL, B6).`
            : `"${invalidToken}" is not a valid 2-character IATA airline code (e.g. DL, B6, 9W).`
        );
        setInputValue(invalidToken);
        onDraftChange?.(invalidToken);
      } else {
        const upperRem = remaining.toUpperCase();
        setInputValue(upperRem);
        onDraftChange?.(upperRem);
      }
    } else {
      const upper = text.toUpperCase();
      setInputValue(upper);
      onDraftChange?.(upper);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        if (commitToken(inputValue)) {
          setInputValue('');
          onDraftChange?.('');
        }
      }
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      e.preventDefault();
      setValidationError(null);
      const updated = tags.slice(0, -1);
      onChange(updated.join(', '));
      onDraftChange?.('');
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      if (commitToken(inputValue)) {
        setInputValue('');
        onDraftChange?.('');
      }
    }
    onBlur?.();
  };

  const removeTag = (idxToRemove: number) => {
    setValidationError(null);
    const updated = tags.filter((_, idx) => idx !== idxToRemove);
    onChange(updated.join(', '));
    onDraftChange?.('');
  };

  return (
    <div className="space-y-1.5">
      <div
        onClick={() => inputRef.current?.focus()}
        className={`min-h-[42px] px-2.5 py-1.5 rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus-within:border-slate-500 flex flex-wrap items-center gap-1.5 cursor-text transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${className}`}
      >
        {tags.map((code, idx) => {
          const allianceKey = resolveAllianceKey(code);
          if (allianceKey && AIRLINE_ALLIANCES[allianceKey]) {
            const alliance = AIRLINE_ALLIANCES[allianceKey];
            return (
              <Tooltip
                key={`${code}-${idx}`}
                content={
                  <div className="py-0.5 text-left">
                    <span className="font-bold text-slate-100 flex items-center gap-1.5 text-xs">
                      <Globe className="w-3.5 h-3.5 text-sky-400" />
                      <span>{alliance.name}</span>
                    </span>
                    <span className="text-[10px] text-gunmetal-muted block font-mono mt-1 max-w-[240px] whitespace-normal leading-relaxed">
                      {alliance.memberCarriers.join(', ')}
                    </span>
                  </div>
                }
                align="center"
              >
                <span className="inline-flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded text-xs font-semibold bg-sky-950/70 border border-sky-600 text-sky-200 shadow-sm select-none">
                  <Globe className="w-3 h-3 text-sky-400 flex-shrink-0" />
                  <span>{alliance.shortName}</span>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={e => {
                      e.stopPropagation();
                      removeTag(idx);
                    }}
                    className="p-0.5 text-sky-300 hover:text-white hover:bg-sky-900 rounded transition-colors"
                    title={`Remove ${alliance.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              </Tooltip>
            );
          }

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
            placeholder={tags.length === 0 ? placeholder : 'Add carrier or alliance...'}
            className="bg-transparent text-sm uppercase text-slate-200 placeholder-zinc-500 focus:outline-none flex-1 min-w-[70px] h-6 font-mono"
          />
        )}
      </div>

      {validationError && (
        <p className="text-[11px] text-rose-400 font-medium leading-snug">
          {validationError}
        </p>
      )}

      {showAlliances && maxTags !== 1 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] uppercase font-semibold text-gunmetal-muted mr-1">
            Alliances:
          </span>
          {(['STAR_ALLIANCE', 'SKYTEAM', 'ONEWORLD'] as AirlineAllianceKey[]).map(key => {
            const alliance = AIRLINE_ALLIANCES[key];
            const isSelected = tags.includes(key);
            return (
              <Tooltip
                key={key}
                content={
                  <div className="py-0.5 text-left">
                    <span className="font-bold text-slate-100 flex items-center gap-1.5 text-xs">
                      <Globe className="w-3.5 h-3.5 text-sky-400" />
                      <span>{alliance.name}</span>
                    </span>
                    <span className="text-[10px] text-gunmetal-muted block font-mono mt-1 max-w-[240px] whitespace-normal leading-relaxed">
                      {alliance.memberCarriers.join(', ')}
                    </span>
                  </div>
                }
                align="left"
              >
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (isSelected) {
                      onChange(tags.filter(t => t !== key).join(', '));
                    } else {
                      onChange([...tags, key].join(', '));
                    }
                  }}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors flex items-center gap-1 cursor-pointer ${
                    isSelected
                      ? 'bg-sky-950/60 text-sky-300 border-sky-600 shadow-sm'
                      : 'bg-gunmetal-canvas text-slate-300 border-gunmetal-border hover:border-slate-500 hover:text-white'
                  }`}
                >
                  <span>{isSelected ? '✓' : '+'}</span>
                  <span>{alliance.shortName}</span>
                </button>
              </Tooltip>
            );
          })}
        </div>
      )}
    </div>
  );
}