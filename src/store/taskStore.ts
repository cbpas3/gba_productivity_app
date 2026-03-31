import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task, TaskPriority } from '../types/task';
import type { Reward } from '../types/reward';
import { eventBus } from './eventBus';

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
  addTask: (title: string, description: string, priority: TaskPriority) => void;
  completeTask: (id: string) => void;
  deleteTask: (id: string) => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],

      addTask: (title, description, priority) => {
        const task: Task = {
          id: crypto.randomUUID(),
          title,
          description,
          priority,
          status: 'pending',
          createdAt: Date.now(),
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
          rewardClaimed: true,
        };

        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? completedTask : t)),
        }));

        eventBus.emit('task:completed', { task: completedTask, reward });
        eventBus.emit('reward:apply', { reward });
      },

      deleteTask: (id) => {
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
        eventBus.emit('task:deleted', { taskId: id });
      },
    }),
    {
      name: 'gba-tasks',
    }
  )
);
