import type { EventMap } from '../types/events';

type Handler<T> = (data: T) => void;

class EventBus {
  private listeners: Map<keyof EventMap, Set<Handler<unknown>>> = new Map();

  on<K extends keyof EventMap>(
    event: K,
    handler: (data: EventMap[K]) => void
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const handlers = this.listeners.get(event)!;
    handlers.add(handler as Handler<unknown>);

    return () => {
      handlers.delete(handler as Handler<unknown>);
    };
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    handlers.forEach((handler) => {
      try {
        (handler as Handler<EventMap[K]>)(data);
      } catch (err) {
        console.error(`[EventBus] Error in handler for "${String(event)}":`, err);
      }
    });
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
