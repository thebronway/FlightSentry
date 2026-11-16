'use client';

import { useEffect, useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { KeyRound, ShieldAlert, Loader2 } from 'lucide-react';

interface Props {
  hasPasskeys: boolean;
  disabled?: boolean;
  onSuccess: () => void;
  onError: (message: string) => void;
}

function isRawIpHostname(hostname: string): boolean {
  if (!hostname) return false;
  if (hostname.startsWith('[') && hostname.endsWith(']')) return true;
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname);
}

export default function PasskeyLoginButton({
  hasPasskeys,
  disabled = false,
  onSuccess,
  onError,
}: Props) {
  const [isSecureContextReady, setIsSecureContextReady] = useState<boolean | null>(null);
  const [isIpAddressHost, setIsIpAddressHost] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const rawIp = isRawIpHostname(window.location.hostname);
    setIsIpAddressHost(rawIp);
    const secure =
      !rawIp &&
      Boolean(window.isSecureContext) &&
      typeof window.PublicKeyCredential !== 'undefined';
    setIsSecureContextReady(secure);
  }, []);

  if (isSecureContextReady === null) {
    return null;
  }

  // When accessed over plain HTTP or via a raw IP address, browsers block WebAuthn.
  // Surface clear guidance so users understand why passkeys are unavailable.
  if (!isSecureContextReady) {
    return (
      <div className="mt-4 pt-4 border-t border-gunmetal-border/80">
        <div className="flex items-start gap-2.5 p-3 rounded-md bg-amber-950/30 border border-amber-800/50 text-amber-200/90 text-xs">
          <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-100">
              {isIpAddressHost
                ? 'Passkey Sign-In Requires a Hostname'
                : 'Passkey Sign-In Unavailable Over HTTP'}
            </p>
            <p className="leading-relaxed text-amber-200/80">
              {isIpAddressHost ? (
                <>
                  WebAuthn passkeys do not support raw IP addresses. Sign in with your username and password here, or open FlightSentry via <code className="text-amber-100">https://&lt;hostname&gt;</code> or <code className="text-amber-100">localhost</code>.
                </>
              ) : (
                <>
                  WebAuthn passkeys require a secure context (<code className="text-amber-100">https://</code> or{' '}
                  <code className="text-amber-100">localhost</code>). Sign in with your username and password while using a plain HTTP LAN address.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasPasskeys) {
    return null;
  }

  const handlePasskeySignIn = async () => {
    if (isAuthenticating || disabled) return;
    setIsAuthenticating(true);
    onError('');

    try {
      const optionsRes = await fetch('/api/auth/passkey/authenticate/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      const optionsData = await optionsRes.json();
      if (!optionsRes.ok) {
        onError(optionsData.error || 'Unable to initialize passkey sign-in.');
        return;
      }

      const assertion = await startAuthentication({ optionsJSON: optionsData });

      const verifyRes = await fetch('/api/auth/passkey/authenticate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: assertion }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        onError(verifyData.error || 'Passkey verification failed.');
        return;
      }

      onSuccess();
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        onError('Passkey prompt was cancelled or timed out.');
      } else {
        onError(err?.message || 'Passkey sign-in failed.');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-gunmetal-border/80">
      <button
        type="button"
        disabled={disabled || isAuthenticating}
        onClick={handlePasskeySignIn}
        className="w-full min-h-[44px] px-4 py-2.5 rounded-md border border-slate-600 bg-gunmetal-canvas hover:bg-gunmetal-border text-slate-100 font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
      >
        {isAuthenticating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
            <span>Waiting for Passkey...</span>
          </>
        ) : (
          <>
            <KeyRound className="w-4 h-4 text-sky-400" />
            <span>Sign in with Passkey</span>
          </>
        )}
      </button>
    </div>
  );
}