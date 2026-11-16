'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthPasskeyPublic, AuthSessionPublic, AuthStatusResponse } from '@/types';
import SettingsIntroBanner from './shared/SettingsIntroBanner';
import AuthStatusCard from './security/AuthStatusCard';
import CredentialsCard from './security/CredentialsCard';
import PasskeysCard from './security/PasskeysCard';
import ActiveSessionsCard from './security/ActiveSessionsCard';
import DisableAuthModal from './security/DisableAuthModal';

interface Props {
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

export default function SecurityTab({ onNotify }: Props) {
  const [status, setStatus] = useState<AuthStatusResponse | null>(null);
  const [passkeys, setPasskeys] = useState<AuthPasskeyPublic[]>([]);
  const [sessions, setSessions] = useState<AuthSessionPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDisableModal, setShowDisableModal] = useState(false);

  const loadSecurityData = useCallback(async () => {
    try {
      const [statusRes, passkeysRes, sessionsRes] = await Promise.all([
        fetch('/api/auth/session', { cache: 'no-store' }),
        fetch('/api/auth/passkey', { cache: 'no-store' }),
        fetch('/api/auth/sessions', { cache: 'no-store' }),
      ]);

      if (statusRes.ok) {
        const statusData: AuthStatusResponse = await statusRes.json();
        setStatus(statusData);
      }
      if (passkeysRes.ok) {
        const pkData = await passkeysRes.json();
        setPasskeys(Array.isArray(pkData.passkeys) ? pkData.passkeys : []);
      }
      if (sessionsRes.ok) {
        const sessData = await sessionsRes.json();
        setSessions(Array.isArray(sessData.sessions) ? sessData.sessions : []);
      }
    } catch {
      onNotify('Failed to load security configuration', 'error');
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    void loadSecurityData();
  }, [loadSecurityData]);

  if (loading || !status) {
    return (
      <div className="py-10 flex items-center justify-center gap-2 text-xs sm:text-sm text-gunmetal-muted">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading security settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-2">
      <SettingsIntroBanner
        title="Authentication, Sessions & Passkeys"
        description="Protect your FlightSentry dashboard and API endpoints with optional username/password login, multi-device WebAuthn passkeys, and revocable SQLite sessions."
      />

      <AuthStatusCard
        status={status}
        onRequestDisable={() => setShowDisableModal(true)}
      />

      <CredentialsCard
        status={status}
        onSaved={async (msg) => {
          await loadSecurityData();
          onNotify(msg, 'success');
        }}
        onError={(msg) => onNotify(msg, 'error')}
      />

      <PasskeysCard
        authEnabled={status.authEnabled}
        passkeys={passkeys}
        onRefresh={loadSecurityData}
        onNotify={onNotify}
      />

      <ActiveSessionsCard
        authEnabled={status.authEnabled}
        sessionDurationDays={status.sessionDurationDays ?? 30}
        sessions={sessions}
        onRefresh={loadSecurityData}
        onNotify={onNotify}
      />

      <DisableAuthModal
        isOpen={showDisableModal}
        onClose={() => setShowDisableModal(false)}
        onDisabled={async () => {
          window.dispatchEvent(new Event('flightsentry:auth-changed'));
          await loadSecurityData();
          onNotify('Authentication disabled and all sessions revoked', 'success');
        }}
      />
    </div>
  );
}