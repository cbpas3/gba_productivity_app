import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task, TaskPriority, TaskRecurrence } from '../types/task';
import type { Reward } from '../types/reward';
import { eventBus } from './eventBus';
import { useRewardStore } from './rewardStore';

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
  addTask: (title: string, description: string, priority: TaskPriority, recurrence?: TaskRecurrence) => void;
  completeTask: (id: string) => void;
  deleteTask: (id: string) => void;
  resetRecurringTasks: () => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],

      addTask: (title, description, priority, recurrence = 'none') => {
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
        };
        set((state) => ({ tasks: [...state.tasks, task] }));
        eventBus.emit('task:created', { task });
      },

      completeTask: (id) => {
        const task = get().tasks.find((t) => t.id === id);
        if (!task || task.status === 'completed') return;

        const reward = buildReward(task.priority);
        const completedTask: Task = {
          ...task,
          status: 'completed',
          completedAt: Date.now(),
          lastCompletedAt: Date.now(),
          rewardClaimed: true,
        };

        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? completedTask : t)),
        }));

        eventBus.emit('task:completed', { task: completedTask, reward });
        // Pool the reward — no game reset until user clicks "CLAIM REWARDS"
        useRewardStore.getState().addPending(reward);
      },

      deleteTask: (id) => {
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
        eventBus.emit('task:deleted', { taskId: id });
      },

      resetRecurringTasks: () => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const dayOfWeek = now.getDay();
        const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const thisMondayStart = todayStart - daysSinceMonday * 86400000;

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
              rewardClaimed: false,
              lastCompletedAt: null,
            } as Task;
          }
          return task;
        });

        if (changed) {
          set({ tasks });
        }
      },
    }),
    {
      name: 'gba-tasks',
    }
  )
);
