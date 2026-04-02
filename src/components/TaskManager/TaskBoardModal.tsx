import React, { useState } from 'react';
import { useTaskStore } from '../../store/taskStore';
import { useUiStore } from '../../store/uiStore';
import type { Task, TaskPriority } from '../../types/task';

const PRIORITIES: { id: TaskPriority; label: string; color: string }[] = [
  { id: 'low', label: 'Low (10%)', color: 'var(--color-accent-blue)' },
  { id: 'medium', label: 'Medium (20%)', color: 'var(--color-accent-green)' },
  { id: 'high', label: 'High (50%)', color: 'var(--color-accent-yellow)' },
  { id: 'critical', label: 'Critical (100%)', color: 'var(--color-accent-red)' },
];

export function TaskBoardModal() {
  const isOpen = useUiStore((s) => s.isTaskBoardOpen);
  const setIsOpen = useUiStore((s) => s.setIsTaskBoardOpen);
  
  const tasks = useTaskStore((s) => s.tasks);
  const updateTaskPriority = useTaskStore((s) => s.updateTaskPriority);
  const completeTask = useTaskStore((s) => s.completeTask);

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Active columns: pending, in-progress, and completed-but-recurring (locked cards).
  // in-progress is included so tasks in that state are not silently invisible.
  const priorityTasks = tasks.filter(t =>
    t.status === 'pending' ||
    t.status === 'in-progress' ||
    (t.status === 'completed' && t.recurrence && t.recurrence !== 'none')
  );

  const completedOneOffTasks = tasks.filter(t => 
    t.status === 'completed' && (!t.recurrence || t.recurrence === 'none')
  );

  function handleDragStart(e: React.DragEvent, task: Task) {
    if (task.status === 'completed') {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', task.id);
    setDraggedTaskId(task.id);
  }

  function handleDragEnd() {
    setDraggedTaskId(null);
  }

  function handleDropPriority(e: React.DragEvent, priority: TaskPriority) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) updateTaskPriority(id, priority);
    setDraggedTaskId(null);
  }

  function handleDropCompleted(e: React.DragEvent) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) {
      const task = tasks.find((t) => t.id === id);
      if (task && task.status === 'pending') completeTask(id);
    }
    setDraggedTaskId(null);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  // Prevent drag-over propagation if dropped outside of column grid
  return (
    <div className="task-board-modal">
      <div className="task-board-modal__overlay" onClick={() => setIsOpen(false)} />
      <div className="task-board-modal__content pixel-border card">
        <header className="task-board-modal__header">
          <h2 className="glow-text--cyan">QUEST BOARD</h2>
          <button className="btn btn--danger" onClick={() => setIsOpen(false)}>✕ CLOSE</button>
        </header>

        <div className="task-board-modal__grid">
          {PRIORITIES.map((p) => {
            const colTasks = priorityTasks.filter(t => t.priority === p.id);
            return (
              <div 
                key={p.id} 
                className="task-board-modal__column"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropPriority(e, p.id)}
              >
                <h3 className="task-board-modal__col-title" style={{ borderBottomColor: p.color }}>
                  {p.label}
                </h3>
                <div className="task-board-modal__task-list">
                  {colTasks.map(t => (
                    <div 
                      key={t.id}
                      draggable={t.status !== 'completed'}
                      onDragStart={(e) => handleDragStart(e, t)}
                      onDragEnd={handleDragEnd}
                      className={`task-board-card ${t.status === 'completed' ? 'task-board-card--locked' : ''} ${draggedTaskId === t.id ? 'task-board-card--dragging' : ''}`}
                      style={{ borderLeftColor: p.color }}
                    >
                      <div className="task-board-card__title">{t.title}</div>
                      {t.recurrence && t.recurrence !== 'none' && (
                        <div className="task-board-card__badge">
                          {t.status === 'completed' ? '🔁 LOCKED' : `🔁 ${t.recurrence.toUpperCase()}`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Completed Column */}
          <div 
            className="task-board-modal__column task-board-modal__column--completed"
            onDragOver={handleDragOver}
            onDrop={handleDropCompleted}
          >
            <h3 className="task-board-modal__col-title" style={{ borderBottomColor: 'var(--color-text-muted)' }}>
              Completed
            </h3>
            <div className="task-board-modal__task-list">
              {completedOneOffTasks.map(t => (
                <div 
                  key={t.id}
                  className="task-board-card task-board-card--completed"
                >
                  <div className="task-board-card__title">{t.title}</div>
                  <div className="task-board-card__badge">✓ DONE</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        .task-board-modal {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-4);
        }
        .task-board-modal__overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(4px);
        }
        .task-board-modal__content {
          position: relative;
          width: 100%;
          max-width: 1400px;
          height: 90vh;
          display: flex;
          flex-direction: column;
          background: var(--color-surface-card);
          padding: var(--space-4);
          gap: var(--space-4);
          border: 4px solid var(--color-border-bright);
        }
        .task-board-modal__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: var(--font-pixel);
          font-size: 1.2rem;
          margin-bottom: var(--space-2);
        }
        .task-board-modal__grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: var(--space-3);
          flex: 1;
          min-height: 0;
        }
        .task-board-modal__column {
          display: flex;
          flex-direction: column;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--color-border-subtle);
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        .task-board-modal__col-title {
          font-family: var(--font-pixel);
          font-size: 0.6rem;
          padding: var(--space-3);
          background: rgba(0, 0, 0, 0.4);
          border-bottom: 2px solid transparent;
          text-align: center;
          letter-spacing: 0.1em;
        }
        .task-board-modal__task-list {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-2);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .task-board-card {
          background: var(--color-surface-body);
          border: 1px solid var(--color-border-subtle);
          border-left: 4px solid transparent;
          border-radius: var(--radius-sm);
          padding: var(--space-3);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          cursor: grab;
          transition: transform 0.1s, box-shadow 0.1s;
        }
        .task-board-card:active {
          cursor: grabbing;
        }
        .task-board-card--dragging {
          opacity: 0.5;
        }
        .task-board-card__title {
          font-family: var(--font-retro);
          font-size: 1.1rem;
          color: var(--color-text-primary);
          word-break: break-word;
        }
        .task-board-card__badge {
          font-family: var(--font-pixel);
          font-size: 0.4rem;
          color: var(--color-text-muted);
          background: rgba(0, 0, 0, 0.3);
          padding: 4px 6px;
          border-radius: var(--radius-sm);
          align-self: flex-start;
        }
        .task-board-card--locked {
          opacity: 0.5;
          cursor: not-allowed;
          border-color: #2a1a4a;
          background: rgba(0, 0, 0, 0.5);
        }
        .task-board-card--locked:active {
          cursor: not-allowed;
        }
        .task-board-card--completed {
          opacity: 0.6;
          cursor: default;
          border-left-color: var(--color-text-muted);
        }
        .task-board-card--completed:active {
          cursor: default;
        }
        
        /* Smooth scrollbars */
        .task-board-modal__task-list::-webkit-scrollbar {
          width: 6px;
        }
        .task-board-modal__task-list::-webkit-scrollbar-thumb {
          background: var(--color-border-subtle);
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
}
