import { useEffect, useRef } from 'react';
import { useEmulatorStore } from '../../store/emulatorStore';
import { useAuthStore } from '../../store/authStore';

function formatSyncTime(ts: number): string {
  const now = new Date();
  const then = new Date(ts);
  const diffMins = Math.floor((now.getTime() - ts) / 60_000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;

  const timeStr = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(then);

  const isToday =
    now.getFullYear() === then.getFullYear() &&
    now.getMonth() === then.getMonth() &&
    now.getDate() === then.getDate();
  if (isToday) return `Today at ${timeStr}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    yesterday.getFullYear() === then.getFullYear() &&
    yesterday.getMonth() === then.getMonth() &&
    yesterday.getDate() === then.getDate();
  if (isYesterday) return `Yesterday at ${timeStr}`;

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(then);
}

export function SyncStatus() {
  const user = useAuthStore((s) => s.user);
  const lastSaveSyncTime = useEmulatorStore((s) => s.lastSaveSyncTime);
  const isSyncing = useEmulatorStore((s) => s.isSyncing);
  const lastSyncStatus = useEmulatorStore((s) => s.lastSyncStatus);
  const setSyncStatus = useEmulatorStore((s) => s.setSyncStatus);
  const pushSave = useEmulatorStore((s) => s.pushSave);
  const pullSave = useEmulatorStore((s) => s.pullSave);

  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!lastSyncStatus) return;
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => setSyncStatus(null), 3000);
    return () => { if (clearTimer.current) clearTimeout(clearTimer.current); };
  }, [lastSyncStatus, setSyncStatus]);

  if (!user) return null;

  const syncLabel = lastSaveSyncTime ? formatSyncTime(lastSaveSyncTime) : 'Never';

  return (
    <div className="sync-status">
      <span className={`sync-status__indicator ${lastSyncStatus ? `sync-status__indicator--${lastSyncStatus}` : ''}`}>
        {lastSyncStatus === 'success' ? '✓' : lastSyncStatus === 'error' ? '✗' : ''}
      </span>
      <span className="sync-status__label">
        {isSyncing ? 'Syncing…' : `Synced: ${syncLabel}`}
      </span>
      <button
        className="btn sync-status__btn"
        onClick={() => pushSave()}
        disabled={isSyncing}
        title="Upload current save to cloud"
      >
        {isSyncing ? '↻' : '↑'} PUSH
      </button>
      <button
        className="btn sync-status__btn"
        onClick={() => pullSave()}
        disabled={isSyncing}
        title="Download save from cloud"
      >
        {isSyncing ? '↻' : '↓'} PULL
      </button>

      <style>{`
        .sync-status {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          justify-content: flex-end;
        }

        .sync-status__indicator {
          font-size: 0.9rem;
          line-height: 1;
          min-width: 1ch;
          transition: color 0.2s;
        }

        .sync-status__indicator--success { color: #34d399; }
        .sync-status__indicator--error   { color: #f87171; }

        .sync-status__label {
          font-family: var(--font-pixel);
          font-size: 0.38rem;
          color: var(--color-text-muted);
          letter-spacing: 0.05em;
          white-space: nowrap;
        }

        .sync-status__btn {
          display: flex;
          align-items: center;
          gap: 3px;
          font-family: var(--font-pixel);
          font-size: 0.38rem;
          padding: 3px var(--space-2);
          background: var(--color-surface-body);
          border: 1px solid var(--color-border-subtle);
          color: var(--color-text-muted);
          cursor: pointer;
          transition: all var(--transition-fast);
          border-radius: var(--radius-sm);
          white-space: nowrap;
        }

        .sync-status__btn:hover:not(:disabled) {
          border-color: var(--color-border-bright);
          color: var(--color-text-primary);
        }

        .sync-status__btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
