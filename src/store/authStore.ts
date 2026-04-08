import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;

  /** Call once at app startup. Restores the session and subscribes to changes. */
  initialize: () => Promise<() => void>;

  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;

  /** Internal — used by the auth state change listener. */
  _setSession: (session: Session | null) => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  session: null,
  isLoading: false,

  initialize: async () => {
    if (!isSupabaseConfigured) return () => {};

    set({ isLoading: true });

    const { data: { session } } = await supabase.auth.getSession();
    set({ session, user: session?.user ?? null, isLoading: false });

    // Subscribe to auth changes (sign-in, sign-out, token refresh).
    // The hydration side-effect (pull cloud data into stores) is handled by
    // the caller (App.tsx) via the onAuthStateChange callback it registers.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        set({ session: newSession, user: newSession?.user ?? null });
      }
    );

    return () => subscription.unsubscribe();
  },

  signIn: async (email, password) => {
    if (!isSupabaseConfigured) return 'Supabase is not configured.';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  },

  signUp: async (email, password) => {
    if (!isSupabaseConfigured) return 'Supabase is not configured.';
    const { error } = await supabase.auth.signUp({ email, password });
    return error ? error.message : null;
  },

  signOut: async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },

  _setSession: (session) => set({ session, user: session?.user ?? null }),
}));
