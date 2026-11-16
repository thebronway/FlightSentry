'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Mail } from 'lucide-react';
import { ImapAccountPublic, Settings } from '@/types';
import SettingsIntroBanner from './shared/SettingsIntroBanner';
import EmailScannerPollingCard from './emailScanner/EmailScannerPollingCard';
import ImapAccountCard from './emailScanner/ImapAccountCard';
import ImapAccountModal from './emailScanner/ImapAccountModal';
import { ImapTestFeedback } from './emailScanner/ImapConnectionTestBanner';

interface Props {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onAutoSave?: (
    updatedSettings: Settings,
    statusKey: string,
    pillMessage?: string,
    toastMessage?: string
  ) => Promise<void>;
  onNotify?: (message: string, type?: 'success' | 'error') => void;
}

export default function EmailScannerTab({
  settings,
  onChange,
  onAutoSave,
  onNotify,
}: Props) {
  const [accounts, setAccounts] = useState<ImapAccountPublic[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ImapAccountPublic | null>(null);
  const [testingAccountId, setTestingAccountId] = useState<number | null>(null);
  const [accountTestFeedback, setAccountTestFeedback] = useState<
    Record<number, ImapTestFeedback | null>
  >({});
  const [scanningNow, setScanningNow] = useState(false);
  const [lastScanSummary, setLastScanSummary] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/email-scanner/accounts', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error('Failed to load IMAP accounts:', err);
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);

  const handleToggleAccountEnabled = async (account: ImapAccountPublic, enabled: boolean) => {
    try {
      const res = await fetch(`/api/email-scanner/accounts/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: enabled ? 1 : 0 }),
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts((prev) =>
          prev.map((a) => (a.id === account.id ? data.account : a))
        );
        if (onNotify) {
          onNotify(`${account.label} ${enabled ? 'enabled' : 'paused'}`, 'success');
        }
      }
    } catch (err: any) {
      if (onNotify) onNotify(err?.message || 'Failed to toggle account', 'error');
    }
  };

  const handleTestAccount = async (account: ImapAccountPublic) => {
    setTestingAccountId(account.id);
    setAccountTestFeedback((prev) => ({ ...prev, [account.id]: null }));
    try {
      const res = await fetch('/api/email-scanner/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          host: account.host,
          port: account.port,
          tls: account.tls,
          username: account.username,
          folder: account.folder,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAccountTestFeedback((prev) => ({
          ...prev,
          [account.id]: {
            type: 'success',
            message: `Connection verified (${data.folder})`,
            details: `Folder messages: ${data.exists} · UIDNEXT: ${data.uidNext} · Tracking UID > ${account.lastUid}`,
          },
        }));
        if (onNotify) onNotify(`${account.label}: IMAP connection verified`, 'success');
      } else {
        setAccountTestFeedback((prev) => ({
          ...prev,
          [account.id]: {
            type: 'error',
            message: data.error || 'Connection failed',
          },
        }));
        if (onNotify) onNotify(`${account.label}: ${data.error || 'Connection failed'}`, 'error');
      }
    } catch (err: any) {
      setAccountTestFeedback((prev) => ({
        ...prev,
        [account.id]: {
          type: 'error',
          message: err?.message || 'Network error during IMAP test',
        },
      }));
    } finally {
      setTestingAccountId(null);
    }
  };

  const handleDeleteAccount = async (account: ImapAccountPublic) => {
    try {
      const res = await fetch(`/api/email-scanner/accounts/${account.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAccounts((prev) => prev.filter((a) => a.id !== account.id));
        if (onNotify) onNotify(`Removed IMAP account "${account.label}"`, 'success');
      } else {
        const data = await res.json();
        if (onNotify) onNotify(data.error || 'Failed to delete account', 'error');
      }
    } catch (err: any) {
      if (onNotify) onNotify(err?.message || 'Network error deleting account', 'error');
    }
  };

  const handleScanNow = async () => {
    setScanningNow(true);
    setLastScanSummary(null);
    try {
      const res = await fetch('/api/email-scanner/scan', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        const summary = `Scanned ${data.scannedAccounts} account(s): checked ${data.totalMessagesFetched} new message(s), queued ${data.totalEventsQueued} flight event(s) (${data.pendingQueueCount} pending review).`;
        setLastScanSummary(summary);
        if (onNotify) onNotify(summary, 'success');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('flightsentry:email-queue-updated'));
        }
        void fetchAccounts();
      } else {
        if (onNotify) onNotify(data.error || 'Scan failed', 'error');
      }
    } catch (err: any) {
      if (onNotify) onNotify(err?.message || 'Network error during IMAP scan', 'error');
    } finally {
      setScanningNow(false);
    }
  };

  const enabledAccountCount = accounts.filter((a) => a.enabled === 1).length;

  return (
    <div className="space-y-6 pt-2">
      <SettingsIntroBanner
        title="Multi-Account IMAP Email Scanner"
        description="Connect one or more email inboxes via IMAP to automatically detect newly arriving airline confirmations, schedule changes, and cancellations. Detected events are staged in the Dashboard Email Queue for review before any flights are created or modified."
      />

      <EmailScannerPollingCard
        settings={settings}
        scanningNow={scanningNow}
        lastScanSummary={lastScanSummary}
        enabledAccountCount={enabledAccountCount}
        onToggleScannerEnabled={(checked) => {
          const val = checked ? 1 : 0;
          const updated = { ...settings, emailScannerEnabled: val };
          onChange(updated);
          if (onAutoSave) {
            onAutoSave(
              updated,
              'emailscanner',
              undefined,
              `Email scanner ${checked ? 'enabled' : 'disabled'}`
            );
          }
        }}
        onPollIntervalChange={(minutes) => {
          const updated = { ...settings, emailScannerPollIntervalMinutes: minutes };
          onChange(updated);
          if (onAutoSave) {
            onAutoSave(
              updated,
              'emailscanner',
              undefined,
              `Email polling interval set to ${minutes} minutes`
            );
          }
        }}
        onToggleNotifyEnabled={(checked) => {
          const val = checked ? 1 : 0;
          const updated = { ...settings, emailScannerNotifyEnabled: val };
          onChange(updated);
          if (onAutoSave) {
            onAutoSave(
              updated,
              'emailscanner',
              undefined,
              `Email queue alerts ${checked ? 'enabled' : 'disabled'}`
            );
          }
        }}
        onAppBaseUrlChange={(url) => onChange({ ...settings, appBaseUrl: url })}
        onAppBaseUrlBlur={() => {
          if (onAutoSave) {
            onAutoSave(settings, 'emailscanner', undefined, 'App Base URL saved');
          }
        }}
        onScanNow={handleScanNow}
      />

      {/* Monitored IMAP Accounts List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Monitored IMAP Accounts</h3>
            <p className="text-xs text-gunmetal-muted">
              Passwords are encrypted at rest using AES-256-GCM. Each account tracks its own folder <span className="font-mono text-slate-300">UIDNEXT</span> cursor so historical emails are skipped.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingAccount(null);
              setIsModalOpen(true);
            }}
            className="min-h-[44px] sm:min-h-[38px] px-4 py-2 bg-gunmetal-border hover:bg-slate-700 text-slate-100 border border-slate-500 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Email Account</span>
          </button>
        </div>

        {loadingAccounts ? (
          <div className="p-6 text-center text-xs text-gunmetal-muted border border-gunmetal-border rounded-lg bg-gunmetal-canvas/40">
            Loading IMAP accounts...
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-gunmetal-border rounded-lg bg-gunmetal-canvas/30 space-y-2">
            <Mail className="w-6 h-6 text-gunmetal-muted mx-auto" />
            <p className="text-sm font-semibold text-slate-300">No IMAP accounts configured yet</p>
            <p className="text-xs text-gunmetal-muted max-w-md mx-auto">
              Click &ldquo;Add Email Account&rdquo; above to connect Gmail, Outlook, iCloud, Fastmail, or any custom IMAP inbox.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => (
              <ImapAccountCard
                key={account.id}
                account={account}
                testing={testingAccountId === account.id}
                testFeedback={accountTestFeedback[account.id] || null}
                onToggleEnabled={handleToggleAccountEnabled}
                onTestConnection={handleTestAccount}
                onEdit={(acc) => {
                  setEditingAccount(acc);
                  setIsModalOpen(true);
                }}
                onDelete={handleDeleteAccount}
              />
            ))}
          </div>
        )}
      </div>

      <ImapAccountModal
        isOpen={isModalOpen}
        editingAccount={editingAccount}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAccount(null);
        }}
        onSaved={(savedAcc, isNew) => {
          setAccounts((prev) =>
            isNew
              ? [...prev, savedAcc]
              : prev.map((a) => (a.id === savedAcc.id ? savedAcc : a))
          );
          if (onNotify) {
            onNotify(
              isNew
                ? `Added IMAP account "${savedAcc.label}" (UID baseline recorded)`
                : `Updated IMAP account "${savedAcc.label}"`,
              'success'
            );
          }
        }}
      />
    </div>
  );
}