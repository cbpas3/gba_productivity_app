import { useEffect } from 'react';
import { AppLayout } from './components/Layout';
import { useKeyboardInput } from './hooks/useKeyboardInput';
import { useRewards } from './hooks/useRewards';
import { isCrossOriginIsolated } from './utils/crossOriginCheck';
import { bootstrapServices } from './services/bootstrap';

export default function App() {
  // Wire up keyboard input for the emulator globally
  useKeyboardInput();

  // Subscribe to reward:applied events via the event bus
  useRewards();

  // Bootstrap service wiring (crypto -> save file -> reward bridge)
  useEffect(() => {
    const teardown = bootstrapServices();
    return teardown;
  }, []);

  const crossOriginOk = isCrossOriginIsolated();

  return (
    <>
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
    </>
  );
}
