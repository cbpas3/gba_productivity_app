import type { Task } from './task';
import type { Reward } from './reward';
import type { EmulatorStatus } from './emulator';

export interface EventMap {
  'task:created': { task: Task };
  'task:completed': { task: Task; reward: Reward };
  'task:deleted': { taskId: string };
  'reward:apply': { reward: Reward };
  'reward:applied': { reward: Reward; success: boolean; error?: string };
  'emulator:status': { status: EmulatorStatus };
  'emulator:save-modified': { partySlot: number };
}
