import { useRef, useCallback } from 'react';
import { emulatorService } from '../services/emulatorService';
import { useEmulatorStore } from '../store/emulatorStore';

export function useEmulator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const setStatus    = useEmulatorStore((s) => s.setStatus);
  const setRomLoaded = useEmulatorStore((s) => s.setRomLoaded);
  const setError     = useEmulatorStore((s) => s.setError);

  const initEmulator = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      setError('Canvas element is not mounted yet.');
      return;
    }

    setStatus('loading');

    try {
      await emulatorService.initialize(canvas);
      setStatus('idle');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  }, [setStatus, setError]);

  const loadRom = useCallback(async (file: File) => {
    try {
      const accepted = await emulatorService.loadRom(file);
      if (accepted) {
        setRomLoaded(file.name);
      } else {
        setError(`ROM rejected: "${file.name}" may be unsupported or corrupt.`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to load ROM: ${message}`);
    }
  }, [setRomLoaded, setError]);

  const loadSave = useCallback(async (file: File) => {
    try {
      await emulatorService.loadSave(file);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to load save: ${message}`);
    }
  }, [setError]);

  const pause = useCallback(() => {
    emulatorService.pause();
    setStatus('paused');
  }, [setStatus]);

  const resume = useCallback(async () => {
    try {
      setStatus('loading');
      await emulatorService.resume();
      setStatus('running');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to resume: ${message}`);
    }
  }, [setStatus, setError]);

  return {
    canvasRef,
    initEmulator,
    loadRom,
    loadSave,
    pause,
    resume,
  };
}
