/**
 * syncService — thin Supabase data-access layer.
 *
 * All functions are fire-and-forget safe: callers should .catch(console.error)
 * but never need to await them for local-state correctness.
 *
 * Naming note: the DB column is "pending_exp" (as specified in the schema)
 * but the TypeScript side calls it pendingRewards for clarity.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { Task } from '../types/task';
import type { Reward } from '../types/reward';

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

/** Map a Zustand Task to the DB row shape. */
function taskToRow(userId: string, task: Task) {
  return {
    id:                task.id,
    user_id:           userId,
    title:             task.title,
    description:       task.description,
    priority:          task.priority,
    status:            task.status,
    recurrence:        task.recurrence,
    reward_claimed:    task.rewardClaimed,
    created_at:        task.createdAt,
    completed_at:      task.completedAt ?? null,
    last_completed_at: task.lastCompletedAt ?? null,
  };
}

/** Map a DB row back to a Zustand Task. */
function rowToTask(row: Record<string, unknown>): Task {
  return {
    id:               row.id as string,
    title:            row.title as string,
    description:      (row.description as string) ?? '',
    priority:         row.priority as Task['priority'],
    status:           row.status as Task['status'],
    recurrence:       row.recurrence as Task['recurrence'],
    rewardClaimed:    row.reward_claimed as boolean,
    createdAt:        row.created_at as number,
    completedAt:      row.completed_at as number | undefined,
    lastCompletedAt:  row.last_completed_at as number | null,
  };
}

/** Upsert a single task for the given user. */
export async function pushTask(userId: string, task: Task): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from('tasks')
    .upsert(taskToRow(userId, task), { onConflict: 'id' });
  if (error) throw error;
}

/** Upsert multiple tasks in a single round-trip. */
export async function pushTaskBatch(userId: string, tasks: Task[]): Promise<void> {
  if (!isSupabaseConfigured || tasks.length === 0) return;
  const { error } = await supabase
    .from('tasks')
    .upsert(tasks.map((t) => taskToRow(userId, t)), { onConflict: 'id' });
  if (error) throw error;
}

/** Hard-delete a task by id. */
export async function deleteTask(userId: string, taskId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('user_id', userId);
  if (error) throw error;
}

/** Fetch all tasks for a user from Supabase. */
export async function fetchTasks(userId: string): Promise<Task[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToTask);
}

// ---------------------------------------------------------------------------
// Profile (pending rewards + settings)
// ---------------------------------------------------------------------------

interface ProfileRow {
  pending_exp: Reward[];
  settings_json: Record<string, unknown>;
}

/** Upsert the user's profile (pending rewards + settings). */
export async function pushProfile(
  userId: string,
  pendingRewards: Reward[],
  settings: Record<string, unknown> = {},
): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('profiles').upsert(
    {
      user_id:       userId,
      pending_exp:   pendingRewards,
      settings_json: settings,
      updated_at:    new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error) throw error;
}

/** Fetch the user's profile. Returns null when not yet created. */
export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('pending_exp, settings_json')
    .eq('user_id', userId)
    .single();
  if (error) {
    // "No rows" is not a hard error — the trigger may not have fired yet.
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as ProfileRow;
}

// ---------------------------------------------------------------------------
// Save files (Supabase Storage)
// ---------------------------------------------------------------------------

function savePath(userId: string): string {
  return `${userId}/game.sav`;
}

/** Upload a .sav Uint8Array to the user's storage slot. */
export async function uploadSave(userId: string, data: Uint8Array): Promise<void> {
  if (!isSupabaseConfigured) return;
  // Copy into a guaranteed plain ArrayBuffer — the WASM Uint8Array may be
  // backed by a SharedArrayBuffer which the Blob constructor rejects.
  const plain = new Uint8Array(data).buffer as ArrayBuffer;
  const blob = new Blob([plain], { type: 'application/octet-stream' });
  const { error } = await supabase.storage
    .from('saves')
    .upload(savePath(userId), blob, { upsert: true });
  if (error) throw error;
}

/**
 * Download the .sav from the user's storage slot.
 * Returns null if no save has been uploaded yet.
 */
export async function downloadSave(userId: string): Promise<Uint8Array | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.storage
    .from('saves')
    .download(savePath(userId));
  if (error) {
    // 404-style "Object not found" — first-time user, not a real error.
    if (error.message?.includes('Object not found') || error.message?.includes('404')) {
      return null;
    }
    throw error;
  }
  if (!data) return null;
  const buffer = await data.arrayBuffer();
  return new Uint8Array(buffer);
}
