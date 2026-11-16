'use client';

import { useEffect, useState, FormEvent } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import {
  Fingerprint,
  Plus,
  Trash2,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { AuthPasskeyPublic } from '@/types';
import SettingsCard from '../shared/SettingsCard';

interface Props {
  authEnabled: boolean;
  passkeys: AuthPasskeyPublic[];
  onRefresh: () => Promise<void>;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

function formatShortDate(iso?: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isRawIpHostname(hostname: string): boolean {
  if (!hostname) return false;
  if (hostname.startsWith('[') && hostname.endsWith(']')) return true;
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname);
}

export default function PasskeysCard({ authEnabled, passkeys, onRefresh, onNotify }: Props) {
  const [isSecureContextReady, setIsSecureContextReady] = useState<boolean | null>(null);
  const [isIpAddressHost, setIsIpAddressHost] = useState(false);
  const [passkeyName, setPasskeyName] = useState('');
  const [registering, setRegistering] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const rawIp = isRawIpHostname(window.location.hostname);
    setIsIpAddressHost(rawIp);
    setIsSecureContextReady(
      !rawIp &&
        Boolean(window.isSecureContext) &&
        typeof window.PublicKeyCredential !== 'undefined'
    );
  }, []);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = passkeyName.trim();
    if (!trimmedName || registering || !authEnabled || !isSecureContextReady) return;

    setRegistering(true);
    try {
      const optionsRes = await fetch('/api/auth/passkey/register/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      const optionsData = await optionsRes.json();
      if (!optionsRes.ok) {
        onNotify(optionsData.error || 'Failed to start passkey registration', 'error');
        return;
      }

      const attestation = await startRegistration({ optionsJSON: optionsData });

      const verifyRes = await fetch('/api/auth/passkey/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          response: attestation,
        }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        onNotify(verifyData.error || 'Passkey verification failed', 'error');
        return;
      }

      setPasskeyName('');
      await onRefresh();
      onNotify(`Registered passkey "${trimmedName}"`, 'success');
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        onNotify('Passkey registration was cancelled or timed out', 'error');
      } else {
        onNotify(err?.message || 'Failed to register passkey', 'error');
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleRename = async (id: number) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    try {
      const res = await fetch(`/api/auth/passkey/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEditingId(null);
        await onRefresh();
        onNotify('Passkey renamed', 'success');
      } else {
        onNotify(data.error || 'Failed to rename passkey', 'error');
      }
    } catch {
      onNotify('Network error renaming passkey', 'error');
    }
  };

  const handleDelete = async (pk: AuthPasskeyPublic) => {
    if (deletingId !== null) return;
    setDeletingId(pk.id);
    try {
      const res = await fetch(`/api/auth/passkey/${pk.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await onRefresh();
        onNotify(`Removed passkey "${pk.name}"`, 'success');
      } else {
        onNotify(data.error || 'Failed to delete passkey', 'error');
      }
    } catch {
      onNotify('Network error deleting passkey', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <SettingsCard>
      <div className="flex items-start gap-2.5 mb-4">
        <Fingerprint className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-slate-100">Passkeys (WebAuthn)</h3>
          <p className="text-xs text-gunmetal-muted mt-0.5">
            Register hardware security keys, Touch ID, Face ID, or password manager passkeys across multiple devices for fast phishing-resistant sign-in.
          </p>
        </div>
      </div>

      {!authEnabled ? (
        <div className="p-3 rounded-lg bg-gunmetal-card border border-gunmetal-border text-xs text-gunmetal-muted">
          Enable username and password authentication above first to enroll passkeys.
        </div>
      ) : isSecureContextReady === false ? (
        <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/50 text-xs text-amber-200/90 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-100">
              {isIpAddressHost
                ? 'Hostname / Domain Required for Passkeys (IP Addresses Not Supported)'
                : 'HTTPS or localhost Required for Passkeys'}
            </p>
            <p className="leading-relaxed text-amber-200/80">
              {isIpAddressHost ? (
                <>
                  WebAuthn browsers reject raw IP addresses (even over HTTPS). Access FlightSentry via{' '}
                  <code className="text-amber-100">https://&lt;your-domain&gt;</code> (for example a reverse proxy hostname, <code className="text-amber-100">.local</code> mDNS name, or Tailscale MagicDNS) or{' '}
                  <code className="text-amber-100">http://localhost</code> to register or use passkeys.
                </>
              ) : (
                <>
                  Browsers only allow WebAuthn passkey registration and sign-in over{' '}
                  <code className="text-amber-100">https://</code> (such as a reverse proxy with TLS) or{' '}
                  <code className="text-amber-100">http://localhost</code>. Access FlightSentry over HTTPS to register or use passkeys.
                </>
              )}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <form onSubmit={handleRegister} className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              maxLength={64}
              disabled={registering}
              value={passkeyName}
              onChange={(e) => setPasskeyName(e.target.value)}
              placeholder="Device name (e.g. MacBook Touch ID, iPhone, YubiKey)"
              className="flex-1 min-h-[44px] sm:min-h-[38px] px-3 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-slate-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={registering || !passkeyName.trim()}
              className="min-h-[44px] sm:min-h-[38px] px-4 py-2 rounded-md bg-gunmetal-border hover:bg-slate-700 border border-slate-500 text-slate-100 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
            >
              {registering ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                  <span>Waiting for Authenticator...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 text-sky-400" />
                  <span>Register Passkey</span>
                </>
              )}
            </button>
          </form>

          {passkeys.length === 0 ? (
            <div className="p-3 rounded-lg bg-gunmetal-card/80 border border-dashed border-gunmetal-border text-xs text-gunmetal-muted text-center">
              No passkeys registered yet. Add one above from this device or scan a QR code with your phone.
            </div>
          ) : (
            <div className="divide-y divide-gunmetal-border border border-gunmetal-border rounded-lg bg-gunmetal-card/90 overflow-hidden">
              {passkeys.map((pk) => (
                <div
                  key={pk.id}
                  className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="min-w-0 flex-1">
                    {editingId === pk.id ? (
                      <div className="flex items-center gap-1.5 max-w-sm">
                        <input
                          type="text"
                          maxLength={64}
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="flex-1 min-h-[36px] px-2.5 py-1 rounded bg-gunmetal-canvas border border-slate-500 text-xs text-slate-100 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRename(pk.id)}
                          aria-label="Save passkey name"
                          className="p-2 rounded bg-emerald-950/70 border border-emerald-700/70 text-emerald-300 hover:text-white cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          aria-label="Cancel rename"
                          className="p-2 rounded bg-gunmetal-canvas border border-gunmetal-border text-gunmetal-muted hover:text-slate-200 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs sm:text-sm font-semibold text-slate-100 truncate">
                          {pk.name}
                        </span>
                        {pk.backedUp && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-950/60 border border-sky-800/60 text-sky-300">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Synced</span>
                          </span>
                        )}
                      </div>
                    )}
                    <p className="text-[11px] text-gunmetal-muted mt-0.5">
                      Added {formatShortDate(pk.createdAt)} · Last used {formatShortDate(pk.lastUsedAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    {editingId !== pk.id && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(pk.id);
                          setEditingName(pk.name);
                        }}
                        title="Rename passkey"
                        className="min-h-[36px] px-2.5 py-1.5 rounded-md bg-gunmetal-canvas hover:bg-gunmetal-border border border-gunmetal-border text-xs text-slate-300 inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Rename</span>
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={deletingId === pk.id}
                      onClick={() => handleDelete(pk)}
                      title="Remove passkey"
                      className="min-h-[36px] px-2.5 py-1.5 rounded-md bg-rose-950/40 hover:bg-rose-900/65 border border-rose-800/60 text-xs text-rose-200 inline-flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{deletingId === pk.id ? 'Removing...' : 'Remove'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </SettingsCard>
  );
}