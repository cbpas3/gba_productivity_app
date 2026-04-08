import { useEffect } from 'react';
import { AppLayout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useKeyboardInput } from './hooks/useKeyboardInput';
import { useRewards } from './hooks/useRewards';
import { isCrossOriginIsolated } from './utils/crossOriginCheck';
import { bootstrapServices } from './services/bootstrap';
import { useAuthStore } from './store/authStore';
import { hydrateFromCloud } from './services/syncBootstrap';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';

export default function App() {
  // Wire up keyboard input for the emulator globally
  useKeyboardInput();

  // Subscribe to rewards:claimed events via the event bus
  useRewards();

  // Bootstrap service wiring (crypto -> save file -> reward bridge)
  useEffect(() => {
    const teardown = bootstrapServices();
    return teardown;
  }, []);

  // Initialise auth session from persisted cookie / localStorage.
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let teardownAuth: (() => void) | undefined;

    useAuthStore.getState().initialize().then((unsub) => {
      teardownAuth = unsub;

      // Pull cloud data into local stores for the current session (if any).
      const userId = useAuthStore.getState().user?.id;
      if (userId) {
        hydrateFromCloud(userId);
      }
    });

    // Listen for future sign-in events (e.g. user logs in via AccountModal)
    // and re-hydrate with their cloud data.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          hydrateFromCloud(session.user.id);
        }
      }
    );

    return () => {
      teardownAuth?.();
      subscription.unsubscribe();
    };
  }, []);

  const crossOriginOk = isCrossOriginIsolated();

  return (
    <ErrorBoundary>
      {!crossOriginOk && (
        <div
          className="cross-origin-warning"
          role="alert"
          aria-live="assertive"
        >
          <strong>WARNING: Cross-Origin Isolation not active.</strong>
          {'  '}
          The GBA emulator requires SharedArrayBuffer (WASM threads).
          {'  '}
          Ensure the server sends:
          {'  '}
          Cross-Origin-Opener-Policy: same-origin
          {'  '}
          &amp;{'  '}
          Cross-Origin-Embedder-Policy: require-corp
        </div>
      )}
      <AppLayout />
    </ErrorBoundary>
  );
}
