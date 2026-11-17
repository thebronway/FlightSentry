'use client';

import { useEffect, useRef, useState, FormEvent } from 'react';
import { KeyRound, X, Copy, Check, AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';
import { ApiKeyPublic, ApiKeyScope } from '@/types';
import SettingsModalPortal from '../shared/SettingsModalPortal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (key: ApiKeyPublic) => void;
  onError: (message: string) => void;
}

const SCOPE_OPTIONS: Array<{
  value: ApiKeyScope;
  label: string;
  description: string;
}> = [
  {
    value: 'read',
    label: 'Read Only (read)',
    description: 'View tracked flights, price history, email queue, and system status. Recommended for Home Assistant, Homepage, and TRMNL widgets.',
  },
  {
    value: 'write',
    label: 'Read & Write (write)',
    description: 'Create, update, delete, convert, rebook, and trigger live price checks on tracked flights, and approve or deny email queue items.',
  },
  {
    value: 'admin',
    label: 'Full Admin (admin)',
    description: 'Includes all read and write permissions plus destructive maintenance endpoints such as purging past flights.',
  },
];

const EXPIRATION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'never', label: 'Never expires' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '180', label: '180 days' },
  { value: '365', label: '1 year (365 days)' },
];

export default function CreateApiKeyModal({
  isOpen,
  onClose,
  onCreated,
  onError,
}: Props) {
  const [name, setName] = useState('');
  const [scope, setScope] = useState<ApiKeyScope>('read');
  const [expiration, setExpiration] = useState<string>('never');
  const [submitting, setSubmitting] = useState(false);
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [createdKeyMeta, setCreatedKeyMeta] = useState<ApiKeyPublic | null>(null);
  const [copied, setCopied] = useState(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setScope('read');
    setExpiration('never');
    setSubmitting(false);
    setCreatedRawKey(null);
    setCreatedKeyMeta(null);
    setCopied(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || submitting) return;

    setSubmitting(true);
    try {
      const expiresInDays =
        expiration === 'never' ? null : parseInt(expiration, 10);

      const res = await fetch('/api/auth/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          scope,
          expiresInDays,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.rawKey || !data.key) {
        onError(data.error || 'Failed to generate API key');
        return;
      }

      setCreatedRawKey(data.rawKey);
      setCreatedKeyMeta(data.key);
      onCreated(data.key);
    } catch {
      onError('Network error while creating API key');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyToken = async () => {
    if (!createdRawKey) return;
    try {
      await navigator.clipboard.writeText(createdRawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      onError('Failed to copy key to clipboard');
    }
  };

  return (
    <SettingsModalPortal>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 !mt-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4"
      >
        <div className="bg-gunmetal-card border border-gunmetal-border rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-gunmetal-border flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-lg bg-sky-950/60 border border-sky-800/60 flex-shrink-0">
                <KeyRound className="w-5 h-5 text-sky-400" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-base text-slate-100 truncate">
                  {createdRawKey ? 'API Key Created' : 'Generate Public API Key'}
                </h3>
                <p className="text-xs text-gunmetal-muted">
                  {createdRawKey
                    ? 'Copy and store this token securely now'
                    : 'Create a scoped token for /api/v1/* integrations'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gunmetal-muted hover:text-slate-200 hover:bg-gunmetal-canvas rounded-lg transition-colors flex-shrink-0 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {createdRawKey ? (
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              <div className="p-3 rounded-lg bg-amber-950/35 border border-amber-700/60 text-xs text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-100">
                    This secret key will only be shown once
                  </p>
                  <p className="text-amber-200/85 leading-relaxed">
                    FlightSentry stores only a SHA-256 hash of this token. If you lose it, revoke the key and generate a new one.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold">{createdKeyMeta?.name}</span>
                  <span className="uppercase font-mono text-[11px] px-2 py-0.5 rounded bg-sky-950/60 border border-sky-800/60 text-sky-300">
                    {createdKeyMeta?.scopes.join(', ')}
                  </span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gunmetal-canvas border border-gunmetal-border">
                  <code className="flex-1 text-xs font-mono text-emerald-300 break-all select-all">
                    {createdRawKey}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    className="min-h-[38px] px-3 py-1.5 rounded-md bg-gunmetal-border hover:bg-slate-700 border border-slate-500 text-xs font-semibold text-slate-100 inline-flex items-center gap-1.5 flex-shrink-0 transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-sky-400" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-gunmetal-canvas/80 border border-gunmetal-border text-[11px] text-gunmetal-muted space-y-1">
                <p className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Authentication Header Examples</span>
                </p>
                <code className="block font-mono text-slate-300">
                  Authorization: Bearer {createdRawKey.slice(0, 17)}...
                </code>
                <code className="block font-mono text-slate-300">
                  X-API-Key: {createdRawKey.slice(0, 17)}...
                </code>
              </div>

              <div className="pt-2 border-t border-gunmetal-border flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] px-5 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4">
              <div>
                <label
                  htmlFor="api-key-name"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Key Name
                </label>
                <input
                  id="api-key-name"
                  type="text"
                  maxLength={80}
                  required
                  disabled={submitting}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Home Assistant Widget, n8n Automation, TRMNL"
                  className="w-full min-h-[44px] px-3 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Access Scope
                </span>
                <div className="space-y-2">
                  {SCOPE_OPTIONS.map((opt) => {
                    const selected = scope === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className={`block p-3 rounded-lg border transition-colors cursor-pointer ${
                          selected
                            ? 'bg-sky-950/35 border-sky-600/80'
                            : 'bg-gunmetal-canvas border-gunmetal-border hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="api-key-scope"
                            value={opt.value}
                            checked={selected}
                            onChange={() => setScope(opt.value)}
                            className="accent-sky-400"
                          />
                          <span className="text-xs font-semibold text-slate-100">
                            {opt.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-gunmetal-muted mt-1 pl-6 leading-relaxed">
                          {opt.description}
                        </p>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="api-key-expiration"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Expiration
                </label>
                <select
                  id="api-key-expiration"
                  disabled={submitting}
                  value={expiration}
                  onChange={(e) => setExpiration(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-100 text-sm focus:outline-none focus:border-slate-400"
                >
                  {EXPIRATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 border-t border-gunmetal-border flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="min-h-[44px] px-4 py-2 text-xs font-semibold bg-gunmetal-canvas hover:bg-gunmetal-border text-slate-300 border border-gunmetal-border rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !name.trim()}
                  className="min-h-[44px] px-4 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{submitting ? 'Generating...' : 'Generate API Key'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </SettingsModalPortal>
  );
}