export type EventMap = {
  'interaction:success': { message: string };
};

type EventKey = keyof EventMap;
type Listener<T extends EventKey> = (payload: EventMap[T]) => void;

export class EventBus {
  private listeners = new Map<EventKey, Set<Listener<EventKey>>>();

  on<T extends EventKey>(event: T, listener: Listener<T>): () => void {
    const listeners = this.listeners.get(event) ?? new Set<Listener<EventKey>>();
    listeners.add(listener as Listener<EventKey>);
    this.listeners.set(event, listeners);

    return () => {
      listeners.delete(listener as Listener<EventKey>);

      if (listeners.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  emit<T extends EventKey>(event: T, payload: EventMap[T]): void {
    this.listeners.get(event)?.forEach((listener) => {
      (listener as Listener<T>)(payload);
    });
  }
}
