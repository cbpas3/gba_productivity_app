import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task, TaskPriority } from '../types/task';
import type { Reward } from '../types/reward';
import { eventBus } from './eventBus';

function buildReward(priority: TaskPriority): Reward {
  switch (priority) {
    case 'low':
      return {
        type: 'heal_pokemon',
        targetSlot: 0,
        payload: { kind: 'heal' },
      };
    case 'medium':
      return {
        type: 'add_experience',
        targetSlot: 0,
        payload: { kind: 'experience', amount: 500 },
      };
    case 'high':
      return {
        type: 'give_item',
        targetSlot: 0,
        payload: { kind: 'item', itemId: 68 },
      };
    case 'critical':
      return {
        type: 'set_ivs',
        targetSlot: 0,
        payload: {
          kind: 'ivs',
          values: { hp: 31, atk: 31, def: 31, spd: 31, spatk: 31, spdef: 31 },
        },
      };
  }
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
