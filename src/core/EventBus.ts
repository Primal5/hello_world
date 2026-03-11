export type EventMap = {
  'interaction:success': { message: string };
};

type EventKey = keyof EventMap;
type Listener<T extends EventKey> = (payload: EventMap[T]) => void;

export class EventBus {
  private listeners: { [K in EventKey]?: Set<Listener<K>> } = {};

  on<T extends EventKey>(event: T, listener: Listener<T>): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set() as Set<Listener<T>>;
    }

    this.listeners[event]?.add(listener);
    return () => this.listeners[event]?.delete(listener);
  }

  emit<T extends EventKey>(event: T, payload: EventMap[T]): void {
    this.listeners[event]?.forEach((listener) => listener(payload as never));
  }
}
