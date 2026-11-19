'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { KeyRound, Plus, Ban, Trash2, BookOpen, ShieldCheck, Clock } from 'lucide-react';
import { ApiKeyPublic, ApiKeyScope } from '@/types';
import SettingsCard from '../shared/SettingsCard';
import CreateApiKeyModal from './CreateApiKeyModal';

interface Props {
  apiKeys: ApiKeyPublic[];
  onRefresh: () => Promise<void>;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

function formatDate(iso?: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getScopeBadgeStyle(scope: ApiKeyScope): string {
  switch (scope) {
    case 'admin':
      return 'bg-rose-950/60 border-rose-800/60 text-rose-300';
    case 'write':
      return 'bg-amber-950/60 border-amber-800/60 text-amber-300';
    case 'read':
    default:
      return 'bg-sky-950/60 border-sky-800/60 text-sky-300';
  }
}

export default function ApiKeysCard({ apiKeys, onRefresh, onNotify }: Props) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleCloseCreateModal = useCallback(() => {
    setShowCreateModal(false);
  }, []);

  const handleRevoke = async (key: ApiKeyPublic) => {
    if (revokingId !== null || key.isRevoked) return;
    setRevokingId(key.id);
    try {
      const res = await fetch(`/api/auth/api-keys/${key.id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        await onRefresh();
        onNotify(`Revoked API key "${key.name}"`, 'success');
      } else {
        onNotify(data.error || 'Failed to revoke API key', 'error');
      }
    } catch {
      onNotify('Network error while revoking API key', 'error');
    } finally {
      setRevokingId(null);
    }
  };

  const handleDeleteRevoked = async (key: ApiKeyPublic) => {
    if (deletingId !== null || !key.isRevoked) return;
    setDeletingId(key.id);
    try {
      const res = await fetch(`/api/auth/api-keys/${key.id}?mode=permanent`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setConfirmDeleteId(null);
        await onRefresh();
        onNotify(`Deleted revoked API key "${key.name}"`, 'success');
      } else {
        onNotify(data.error || 'Failed to delete API key', 'error');
      }
    } catch {
      onNotify('Network error while deleting API key', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <SettingsCard>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-2.5">
          <KeyRound className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-slate-100">Public API Keys</h3>
            <p className="text-xs text-gunmetal-muted mt-0.5">
              Issue scoped bearer keys (<code className="text-slate-300">fss_live_...</code>) for external dashboards and automation workflows (Home Assistant, Homepage, TRMNL, n8n, Shortcuts).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center flex-shrink-0">
          <Link
            href="/api-docs"
            className="min-h-[40px] sm:min-h-[36px] px-3 py-1.5 rounded-md bg-gunmetal-card hover:bg-gunmetal-border border border-gunmetal-border text-xs font-semibold text-slate-200 inline-flex items-center gap-1.5 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            <span>API Reference</span>
          </Link>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="min-h-[40px] sm:min-h-[36px] px-3.5 py-1.5 rounded-md bg-slate-800/75 hover:bg-slate-700/85 border border-slate-500/80 hover:border-slate-400 text-xs font-semibold text-slate-100 hover:text-white shadow-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-slate-300" />
            <span>Create API Key</span>
          </button>
        </div>
      </div>

      <div className="mb-4 p-2.5 rounded-lg bg-gunmetal-card/80 border border-gunmetal-border text-[11px] text-gunmetal-muted flex items-start gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <span>
          All <code className="text-slate-300">/api/v1/*</code> endpoints require a valid, non-expired API key via{' '}
          <code className="text-slate-300">Authorization: Bearer &lt;key&gt;</code> or{' '}
          <code className="text-slate-300">X-API-Key</code>, even when browser login is disabled.
        </span>
      </div>

      {apiKeys.length === 0 ? (
        <div className="p-4 rounded-lg bg-gunmetal-card/80 border border-dashed border-gunmetal-border text-xs text-gunmetal-muted text-center">
          No API keys created yet. Generate a <code className="text-slate-300">read</code> key for status widgets or a{' '}
          <code className="text-slate-300">write</code> key for automation scripts.
        </div>
      ) : (
        <div className="divide-y divide-gunmetal-border border border-gunmetal-border rounded-lg bg-gunmetal-card/90 overflow-hidden">
          {apiKeys.map((key) => {
            const inactive = key.isRevoked || key.isExpired;
            return (
              <div
                key={key.id}
                className={`p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                  inactive ? 'opacity-65' : ''
                }`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs sm:text-sm font-semibold text-slate-100 truncate">
                      {key.name}
                    </span>
                    <code className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-gunmetal-canvas border border-gunmetal-border text-slate-300">
                      {key.keyPrefix}...
                    </code>
                    {key.scopes.map((sc) => (
                      <span
                        key={sc}
                        className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wide ${getScopeBadgeStyle(
                          sc
                        )}`}
                      >
                        {sc}
                      </span>
                    ))}
                    {key.isRevoked && (
                      <span className="px-1.5 py-0.5 rounded border border-rose-800/60 bg-rose-950/60 text-rose-300 text-[10px] font-semibold uppercase">
                        Revoked
                      </span>
                    )}
                    {!key.isRevoked && key.isExpired && (
                      <span className="px-1.5 py-0.5 rounded border border-amber-800/60 bg-amber-950/60 text-amber-300 text-[10px] font-semibold uppercase">
                        Expired
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gunmetal-muted">
                    <span>Created {formatDate(key.createdAt)}</span>
                    <span>Last used {formatDate(key.lastUsedAt)}</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        {key.expiresAt
                          ? `${key.isExpired ? 'Expired' : 'Expires'} ${formatDate(key.expiresAt)}`
                          : 'No expiration'}
                      </span>
                    </span>
                  </div>
                </div>

                {!key.isRevoked ? (
                  <div className="self-end sm:self-center">
                    <button
                      type="button"
                      disabled={revokingId === key.id}
                      onClick={() => handleRevoke(key)}
                      className="min-h-[44px] sm:min-h-[36px] px-3 sm:px-2.5 py-1.5 rounded-md bg-rose-950/60 hover:bg-rose-900/80 border border-rose-700/80 text-xs font-semibold text-rose-200 hover:text-white inline-flex items-center gap-1 shadow-sm transition-colors disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
                    >
                      <Ban className="w-3 h-3" />
                      <span>{revokingId === key.id ? 'Revoking...' : 'Revoke'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="self-end sm:self-center flex items-center gap-1.5">
                    {confirmDeleteId === key.id ? (
                      <>
                        <button
                          type="button"
                          disabled={deletingId === key.id}
                          onClick={() => handleDeleteRevoked(key)}
                          className="min-h-[44px] sm:min-h-[36px] px-3 sm:px-2.5 py-1.5 rounded-md bg-rose-950/60 hover:bg-rose-900/80 border border-rose-700/80 text-xs font-semibold text-rose-200 hover:text-white inline-flex items-center gap-1 shadow-sm transition-colors disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{deletingId === key.id ? 'Deleting...' : 'Confirm Delete'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === key.id}
                          onClick={() => setConfirmDeleteId(null)}
                          className="min-h-[44px] sm:min-h-[36px] px-3 sm:px-2.5 py-1.5 rounded-md bg-gunmetal-canvas hover:bg-gunmetal-border border border-gunmetal-border text-xs font-semibold text-slate-300 hover:text-white transition-colors disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(key.id)}
                        className="min-h-[44px] sm:min-h-[36px] px-3 sm:px-2.5 py-1.5 rounded-md bg-gunmetal-canvas hover:bg-rose-950/60 border border-gunmetal-border hover:border-rose-700/80 text-xs font-semibold text-slate-300 hover:text-rose-200 inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CreateApiKeyModal
        isOpen={showCreateModal}
        onClose={handleCloseCreateModal}
        onCreated={async () => {
          await onRefresh();
        }}
        onError={(msg) => onNotify(msg, 'error')}
      />
    </SettingsCard>
  );
}