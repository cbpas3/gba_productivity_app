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
  const isSyncingSave = useEmulatorStore((s) => s.isSyncingSave);
  const forceSyncSave = useEmulatorStore((s) => s.forceSyncSave);

  if (!user) return null;

  const label = lastSaveSyncTime
    ? `Last synced: ${formatSyncTime(lastSaveSyncTime)}`
    : 'Not synced';

  return (
    <div className="sync-status">
      <span className="sync-status__label">{label}</span>
      <button
        className={`btn sync-status__btn ${isSyncingSave ? 'sync-status__btn--busy' : ''}`}
        onClick={() => forceSyncSave()}
        disabled={isSyncingSave}
        title="Sync save to cloud"
        aria-label="Manual save sync"
      >
        <span className={`sync-status__icon ${isSyncingSave ? 'sync-status__icon--spin' : ''}`}>
          {isSyncingSave ? '↻' : '☁'}
        </span>
        <span className="sync-status__btn-text">
          {isSyncingSave ? 'SYNCING…' : 'SYNC'}
        </span>
      </button>

      <style>{`
        .sync-status {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          width: 100%;
          justify-content: flex-end;
        }

        .sync-status__label {
          font-family: var(--font-pixel);
          font-size: 0.38rem;
          color: var(--color-text-muted);
          letter-spacing: 0.05em;
        }

        .sync-status__btn {
          display: flex;
          align-items: center;
          gap: 4px;
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

        .sync-status__btn--busy,
        .sync-status__btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .sync-status__icon {
          font-size: 0.7rem;
          line-height: 1;
          display: inline-block;
        }

        .sync-status__icon--spin {
          animation: sync-spin 0.8s linear infinite;
        }

        @keyframes sync-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
