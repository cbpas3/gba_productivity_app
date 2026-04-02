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
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the auto-close timer on unmount to prevent it firing after the modal
  // is gone and wiping inputData mid-type if the user re-opens within 1 second.
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
      setErrorMsg('Input is empty.');
      return;
    }

    try {
      const parsed = JSON.parse(inputData);
      
      if (!Array.isArray(parsed)) {
        setErrorMsg('Invalid format: Expected a JSON Array (e.g., [...])');
        return;
      }
      
      // Additional simple validation: verify elements are objects
      if (parsed.some(item => typeof item !== 'object' || item === null)) {
        setErrorMsg('Invalid format: Array must contain JSON objects.');
        return;
      }

      bulkAddTasks(parsed as Partial<Task>[]);
      
      setSuccess(true);
      successTimerRef.current = setTimeout(() => {
        setSuccess(false);
        setInputData('');
        setIsOpen(false);
      }, 1000);
      
    } catch (err: any) {
      setErrorMsg(`JSON Syntax Error: ${err.message}`);
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
      <div className="bulk-modal__overlay" onClick={handleClose} />
      <div className="bulk-modal__content card pixel-border">
        <header className="bulk-modal__header">
          <h2 className="glow-text--cyan">BULK IMPORT QUESTS</h2>
          <button className="btn btn--danger" onClick={handleClose}>✕ CLOSE</button>
        </header>

        <div className="bulk-modal__body">
          <p className="bulk-modal__desc">
            Paste a JSON array of quests to import them all at once.
          </p>
          <div className="bulk-modal__example">
            <strong>Example:</strong>
            <pre>
{`[
  { "title": "Defeat the gym leader", "priority": "critical" },
  { "title": "Buy 10 potions", "priority": "low" },
  { "title": "Daily training", "recurrence": "daily", "priority": "medium" }
]`}
            </pre>
          </div>

          <textarea
            className="input bulk-modal__textarea"
            placeholder="Paste your JSON array here..."
            value={inputData}
            onChange={(e) => setInputData(e.target.value)}
          />

          {errorMsg && (
            <div className="bulk-modal__error">
              {errorMsg}
            </div>
          )}

          <button 
            className={`btn btn--primary bulk-modal__submit ${success ? 'bulk-modal__submit--success' : ''}`}
            onClick={handleImport}
          >
            {success ? '✓ SUCCESSFULLY IMPORTED!' : '[ VALIDATE & IMPORT ]'}
          </button>
        </div>
      </div>

      <style>{`
        .bulk-modal {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-4);
        }
        .bulk-modal__overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(4px);
        }
        .bulk-modal__content {
          position: relative;
          width: 100%;
          max-width: 600px;
          display: flex;
          flex-direction: column;
          background: var(--color-surface-card);
          padding: var(--space-4);
          gap: var(--space-4);
          border: 4px solid var(--color-border-bright);
        }
        .bulk-modal__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: var(--font-pixel);
          font-size: 1.2rem;
        }
        .bulk-modal__body {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .bulk-modal__desc {
          font-family: var(--font-retro);
          color: var(--color-text-secondary);
          font-size: 1.1rem;
        }
        .bulk-modal__example {
          background: rgba(0, 0, 0, 0.4);
          border: 1px dashed var(--color-border-subtle);
          border-radius: var(--radius-sm);
          padding: var(--space-2);
          font-family: monospace;
          font-size: 0.85rem;
          color: var(--color-text-muted);
        }
        .bulk-modal__example strong {
          color: var(--color-accent-cyan);
          display: block;
          margin-bottom: 4px;
        }
        .bulk-modal__example pre {
          margin: 0;
          white-space: pre-wrap;
        }
        .bulk-modal__textarea {
          min-height: 200px;
          resize: vertical;
          font-family: monospace;
          font-size: 0.9rem;
        }
        .bulk-modal__error {
          color: var(--color-accent-red);
          font-family: var(--font-retro);
          font-size: 0.9rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          padding: var(--space-2);
          border-radius: var(--radius-sm);
        }
        .bulk-modal__submit {
          padding: var(--space-3);
          font-size: 1rem;
        }
        .bulk-modal__submit--success {
          background: #1B5E20;
          border-color: var(--color-accent-green);
          color: var(--color-accent-green);
          box-shadow: var(--shadow-green-sm);
        }
      `}</style>
    </div>
  );
}
