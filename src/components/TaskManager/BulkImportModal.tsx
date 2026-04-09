import React, { useState, useRef, useEffect } from 'react';
import { useUiStore } from '../../store/uiStore';
import { useTaskStore } from '../../store/taskStore';
import type { Task } from '../../types/task';

export function BulkImportModal() {
  const isOpen = useUiStore((s) => s.isBulkImportOpen);
  const setIsOpen = useUiStore((s) => s.setIsBulkImportOpen);
  const bulkAddTasks = useTaskStore((s) => s.bulkAddTasks);

  const [inputData, setInputData] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimerRef.current !== null) clearTimeout(successTimerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  function handleImport() {
    setErrorMsg('');
    setSuccess(false);

    if (!inputData.trim()) {
      setErrorMsg('Input is empty. Paste a JSON array of quests below.');
      return;
    }

    try {
      const parsed = JSON.parse(inputData);

      if (!Array.isArray(parsed)) {
        setErrorMsg('Expected a JSON array — make sure your input starts with [ and ends with ].');
        return;
      }

      if (parsed.some((item) => typeof item !== 'object' || item === null)) {
        setErrorMsg('Every item in the array must be an object with at least a "title" field.');
        return;
      }

      const missing = parsed.findIndex((item) => !item.title || typeof item.title !== 'string');
      if (missing !== -1) {
        setErrorMsg(`Item at index ${missing} is missing a "title" string.`);
        return;
      }

      bulkAddTasks(parsed as Partial<Task>[]);
      setImportCount(parsed.length);
      setSuccess(true);
      successTimerRef.current = setTimeout(() => {
        setSuccess(false);
        setInputData('');
        setIsOpen(false);
      }, 1200);
    } catch (err: any) {
      setErrorMsg(`JSON syntax error: ${err.message}`);
    }
  }

  function handleClose() {
    if (successTimerRef.current !== null) clearTimeout(successTimerRef.current);
    setIsOpen(false);
    setErrorMsg('');
    setInputData('');
    setSuccess(false);
  }

  return (
    <div className="bulk-modal">
      <div className="bulk-modal__overlay" onClick={handleClose} aria-hidden />
      <div
        className="bulk-modal__content card pixel-border"
        role="dialog"
        aria-modal="true"
        aria-label="Bulk add quests"
      >
        <header className="bulk-modal__header">
          <h2 className="glow-text--cyan bulk-modal__title">📥 BULK ADD QUESTS</h2>
          <button className="btn btn--ghost bulk-modal__close" onClick={handleClose} aria-label="Close">✕</button>
        </header>

        <hr className="pixel-divider" />

        <div className="bulk-modal__body">
          {/* ── Instructions ── */}
          <p className="bulk-modal__desc">
            Paste a JSON array below to add multiple quests at once. Each item must have a <code>title</code>. All other fields are optional.
          </p>

          {/* ── Field reference ── */}
          <div className="bulk-modal__schema">
            <div className="bulk-modal__schema-title">Supported fields</div>
            <table className="bulk-modal__table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Type</th>
                  <th>Required</th>
                  <th>Accepted values</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>title</code></td>
                  <td>string</td>
                  <td className="bulk-modal__required">Yes</td>
                  <td>Any text (max 80 chars)</td>
                </tr>
                <tr>
                  <td><code>description</code></td>
                  <td>string</td>
                  <td>No</td>
                  <td>Any text (max 300 chars)</td>
                </tr>
                <tr>
                  <td><code>priority</code></td>
                  <td>string</td>
                  <td>No</td>
                  <td><code>"low"</code> · <code>"medium"</code> · <code>"high"</code> · <code>"critical"</code><br /><span className="bulk-modal__default">Default: "medium"</span></td>
                </tr>
                <tr>
                  <td><code>recurrence</code></td>
                  <td>string</td>
                  <td>No</td>
                  <td><code>"none"</code> · <code>"daily"</code> · <code>"weekly"</code><br /><span className="bulk-modal__default">Default: "none"</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── Example ── */}
          <div className="bulk-modal__example">
            <span className="bulk-modal__example-label">Example</span>
            <pre>{`[
  { "title": "Defeat the gym leader", "priority": "critical" },
  { "title": "Buy 10 potions", "priority": "low", "description": "Stock up before route 8" },
  { "title": "Morning jog", "priority": "medium", "recurrence": "daily" },
  { "title": "Weekly review", "priority": "high", "recurrence": "weekly" }
]`}</pre>
          </div>

          {/* ── Input ── */}
          <textarea
            className="input bulk-modal__textarea"
            placeholder="Paste your JSON array here..."
            value={inputData}
            onChange={(e) => { setInputData(e.target.value); setErrorMsg(''); }}
            spellCheck={false}
          />

          {/* ── Error ── */}
          {errorMsg && (
            <div className="bulk-modal__error" role="alert">
              ⚠ {errorMsg}
            </div>
          )}

          {/* ── Submit ── */}
          <button
            className={`btn btn--primary bulk-modal__submit ${success ? 'bulk-modal__submit--success' : ''}`}
            onClick={handleImport}
            disabled={success}
          >
            {success ? `✓ ${importCount} quest${importCount !== 1 ? 's' : ''} added!` : '[ VALIDATE & IMPORT ]'}
          </button>
        </div>
      </div>

      <style>{`
        .bulk-modal {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-4);
        }

        .bulk-modal__overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.72);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
        }

        .bulk-modal__content {
          position: relative;
          width: 100%;
          max-width: 640px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          background: var(--color-surface-card);
          padding: var(--space-5);
          gap: var(--space-3);
          overflow-y: auto;
          animation: bulk-slide-up 0.18s ease forwards;
        }

        @keyframes bulk-slide-up {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .bulk-modal__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-3);
        }

        .bulk-modal__title {
          font-family: var(--font-pixel);
          font-size: 0.6rem;
          letter-spacing: 0.12em;
        }

        .bulk-modal__close {
          padding: var(--space-1) var(--space-2);
          font-size: 1rem;
          line-height: 1;
          flex-shrink: 0;
        }

        /* ── Body ── */
        .bulk-modal__body {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .bulk-modal__desc {
          font-family: var(--font-ui);
          color: var(--color-text-secondary);
          font-size: 0.9375rem;
          line-height: 1.6;
        }

        .bulk-modal__desc code {
          font-family: var(--font-mono);
          font-size: 0.875rem;
          color: var(--color-accent-cyan);
          background: rgba(56, 189, 248, 0.08);
          padding: 1px 5px;
          border-radius: 4px;
        }

        /* ── Schema table ── */
        .bulk-modal__schema {
          border: 1px solid var(--color-border-subtle);
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .bulk-modal__schema-title {
          font-family: var(--font-ui);
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--color-text-muted);
          padding: var(--space-2) var(--space-3);
          background: rgba(0, 0, 0, 0.2);
          border-bottom: 1px solid var(--color-border-subtle);
        }

        .bulk-modal__table {
          width: 100%;
          border-collapse: collapse;
          font-family: var(--font-ui);
          font-size: 0.8125rem;
        }

        .bulk-modal__table th {
          text-align: left;
          padding: var(--space-2) var(--space-3);
          color: var(--color-text-muted);
          font-weight: 600;
          font-size: 0.7rem;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          border-bottom: 1px solid var(--color-border-subtle);
          background: rgba(0, 0, 0, 0.12);
        }

        .bulk-modal__table td {
          padding: var(--space-2) var(--space-3);
          color: var(--color-text-primary);
          vertical-align: top;
          border-bottom: 1px solid var(--color-border-subtle);
          line-height: 1.6;
        }

        .bulk-modal__table tr:last-child td {
          border-bottom: none;
        }

        .bulk-modal__table code {
          font-family: var(--font-mono);
          font-size: 0.78rem;
          color: var(--color-accent-cyan);
          background: rgba(56, 189, 248, 0.08);
          padding: 1px 4px;
          border-radius: 3px;
        }

        .bulk-modal__required {
          color: var(--color-accent-yellow);
          font-weight: 600;
        }

        .bulk-modal__default {
          font-size: 0.72rem;
          color: var(--color-text-muted);
          display: block;
          margin-top: 2px;
        }

        /* ── Example block ── */
        .bulk-modal__example {
          background: rgba(0, 0, 0, 0.25);
          border: 1px dashed var(--color-border-subtle);
          border-radius: var(--radius-sm);
          padding: var(--space-3);
          overflow-x: auto;
        }

        .bulk-modal__example-label {
          display: block;
          font-family: var(--font-ui);
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--color-accent-cyan);
          margin-bottom: var(--space-2);
        }

        .bulk-modal__example pre {
          margin: 0;
          font-family: var(--font-mono);
          font-size: 0.82rem;
          color: var(--color-text-secondary);
          white-space: pre-wrap;
          line-height: 1.65;
        }

        /* ── Textarea ── */
        .bulk-modal__textarea {
          min-height: 160px;
          resize: vertical;
          font-family: var(--font-mono);
          font-size: 0.875rem;
          line-height: 1.6;
        }

        /* ── Error ── */
        .bulk-modal__error {
          color: var(--color-accent-red);
          font-family: var(--font-ui);
          font-size: 0.875rem;
          background: rgba(185, 28, 28, 0.08);
          border: 1px solid rgba(185, 28, 28, 0.25);
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-sm);
          line-height: 1.5;
        }

        /* ── Submit ── */
        .bulk-modal__submit {
          padding: var(--space-3);
          font-size: 0.9rem;
          width: 100%;
        }

        .bulk-modal__submit--success {
          background: #14532D;
          border-color: var(--color-accent-green);
          color: var(--color-accent-green);
          box-shadow: var(--shadow-green-sm);
        }

        /* ── Light theme ── */
        [data-theme="light"] .bulk-modal__schema-title {
          background: var(--color-surface-3);
        }
        [data-theme="light"] .bulk-modal__table th {
          background: var(--color-surface-2);
        }
        [data-theme="light"] .bulk-modal__example {
          background: var(--color-surface-3);
          border-color: var(--color-border-bright);
        }
        [data-theme="light"] .bulk-modal__error {
          background: rgba(185, 28, 28, 0.06);
        }

        /* ── Mobile ── */
        @media (max-width: 600px) {
          .bulk-modal {
            padding: var(--space-2);
            align-items: flex-end;
          }
          .bulk-modal__content {
            border-radius: var(--radius-lg) var(--radius-lg) 0 0;
            padding: var(--space-4);
            max-height: 92vh;
          }
          .bulk-modal__table {
            font-size: 0.75rem;
          }
          .bulk-modal__table th,
          .bulk-modal__table td {
            padding: var(--space-1) var(--space-2);
          }
        }
      `}</style>
    </div>
  );
}
