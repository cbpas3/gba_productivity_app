export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'pending' | 'in-progress' | 'completed';
export type TaskRecurrence = 'none' | 'daily' | 'weekly';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  recurrence: TaskRecurrence;
  createdAt: number;
  completedAt?: number;
  lastCompletedAt?: number | null;
  rewardClaimed: boolean;
}
