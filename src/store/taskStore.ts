import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task, TaskPriority, TaskRecurrence } from '../types/task';
import type { Reward } from '../types/reward';

import { eventBus } from './eventBus';
import { useRewardStore } from './rewardStore';
import { useAuthStore } from './authStore';
import * as syncService from '../services/syncService';

function getUserId(): string | null {
  return useAuthStore.getState().user?.id ?? null;
}

const EXP_PERCENT: Record<TaskPriority, number> = {
  low:      10,
  medium:   20,
  high:     50,
  critical: 100,
};

function buildReward(priority: TaskPriority): Reward {
  return {
    type: 'add_experience_percent',
    targetSlot: 0,
    payload: { kind: 'experience_percent', percent: EXP_PERCENT[priority] },
  };
}

interface TaskState {
  tasks: Task[];
  addTask: (title: string, description: string, priority: TaskPriority, recurrence?: TaskRecurrence, customReward?: Reward) => void;
  bulkAddTasks: (rawTasks: Partial<Task>[]) => void;
  completeTask: (id: string) => void;
  deleteTask: (id: string) => void;
  updateTaskPriority: (id: string, newPriority: TaskPriority) => void;
  resetRecurringTasks: () => void;
  /** Replace local task list with data pulled from the cloud. */
  hydrateTasks: (tasks: Task[]) => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],

      addTask: (title, description, priority, recurrence = 'none', customReward) => {
        const task: Task = {
          id: crypto.randomUUID(),
          title,
          description,
          priority,
          status: 'pending',
          recurrence,
          createdAt: Date.now(),
          lastCompletedAt: null,
          rewardClaimed: false,
          ...(customReward ? { customReward } : {}),
        };
        set((state) => ({ tasks: [...state.tasks, task] }));
        eventBus.emit('task:created', { task });

        const uid = getUserId();
        if (uid) syncService.pushTask(uid, task).catch(console.error);
      },

      bulkAddTasks: (rawTasks) => {
        if (!Array.isArray(rawTasks)) return;

        const VALID_PRIORITIES = new Set<TaskPriority>(['low', 'medium', 'high', 'critical']);
        const VALID_RECURRENCES = new Set<TaskRecurrence>(['none', 'daily', 'weekly', 'repeatable']);

        const resolvedTasks: Task[] = rawTasks.map((rt) => ({
          id: crypto.randomUUID(),
          title: rt.title || 'Untitled imported task',
          description: rt.description || '',
          priority: VALID_PRIORITIES.has(rt.priority as TaskPriority)
            ? (rt.priority as TaskPriority)
            : 'low',
          status: 'pending',
          recurrence: VALID_RECURRENCES.has(rt.recurrence as TaskRecurrence)
            ? (rt.recurrence as TaskRecurrence)
            : 'none',
          createdAt: Date.now(),
          lastCompletedAt: null,
          rewardClaimed: false,
        }));

        set((state) => ({ tasks: [...state.tasks, ...resolvedTasks] }));

        const uid = getUserId();
        if (uid) syncService.pushTaskBatch(uid, resolvedTasks).catch(console.error);
      },

      completeTask: (id) => {
        const task = get().tasks.find((t) => t.id === id);
        if (!task || task.status === 'completed') return;

        const reward = task.customReward ?? buildReward(task.priority);
        const now = Date.now();

        // Repeatable tasks: give reward then immediately reset to pending.
        if (task.recurrence === 'repeatable') {
          const resetTask: Task = {
            ...task,
            status: 'pending',
            completedAt: undefined,
            lastCompletedAt: now,
            rewardClaimed: false,
          };
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? resetTask : t)),
          }));
          eventBus.emit('task:completed', { task: { ...task, status: 'completed', completedAt: now }, reward });
          useRewardStore.getState().addPending(reward);
          const uid = getUserId();
          if (uid) syncService.pushTask(uid, resetTask).catch(console.error);
          return;
        }

        const completedTask: Task = {
          ...task,
          status: 'completed',
          completedAt: now,
          lastCompletedAt: now,
          rewardClaimed: true,
        };

        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? completedTask : t)),
        }));

        eventBus.emit('task:completed', { task: completedTask, reward });
        useRewardStore.getState().addPending(reward);

        const uid = getUserId();
        if (uid) syncService.pushTask(uid, completedTask).catch(console.error);
      },

      deleteTask: (id) => {
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
        eventBus.emit('task:deleted', { taskId: id });

        const uid = getUserId();
        if (uid) syncService.deleteTask(uid, id).catch(console.error);
      },

      updateTaskPriority: (id, newPriority) => {
        let updated: Task | undefined;
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id !== id) return t;
            updated = { ...t, priority: newPriority };
            return updated;
          }),
        }));

        if (updated) {
          const uid = getUserId();
          if (uid) syncService.pushTask(uid, updated).catch(console.error);
        }
      },

      resetRecurringTasks: () => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const dayOfWeek = now.getDay();
        const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const thisMondayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday).getTime();

        let changed = false;
        const tasks = get().tasks.map((task) => {
          if (task.status !== 'completed' || !task.recurrence || task.recurrence === 'none') {
            return task;
          }

          let needsReset = false;
          if (task.recurrence === 'daily') {
            needsReset = (task.lastCompletedAt || 0) < todayStart;
          } else if (task.recurrence === 'weekly') {
            needsReset = (task.lastCompletedAt || 0) < thisMondayStart;
          }

          if (needsReset) {
            changed = true;
            return {
              ...task,
              status: 'pending',
              completedAt: undefined,
              rewardClaimed: false,
              lastCompletedAt: null,
            } as Task;
          }
          return task;
        });

        if (changed) {
          set({ tasks });
          // Sync all reset tasks back to cloud.
          const uid = getUserId();
          if (uid) {
            const resetTasks = tasks.filter((t) => t.status === 'pending' && t.recurrence !== 'none');
            syncService.pushTaskBatch(uid, resetTasks).catch(console.error);
          }
        }
      },

      hydrateTasks: (tasks) => {
        set({ tasks });
      },
    }),
    {
      name: 'gba-tasks',
    }
  )
);
