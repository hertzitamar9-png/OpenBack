export type GameEvent = object;

export interface EventConstructor<T extends GameEvent = GameEvent> {
  new (...args: any[]): T;
}

export class EventBus {
  private listeners: Map<EventConstructor, Array<(event: GameEvent) => void>> =
    new Map();

  emit<T extends GameEvent>(event: T): void {
    const eventConstructor = event.constructor as EventConstructor<T>;
    const callbacks = this.listeners.get(eventConstructor);
    if (callbacks) {
      for (const callback of callbacks) {
        callback(event);
      }
    }
  }

  on<T extends GameEvent>(
    eventType: EventConstructor<T>,
    callback: (event: T) => void,
    options?: { signal?: AbortSignal },
  ): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    const callbacks = this.listeners.get(eventType)!;
    callbacks.push(callback as (event: GameEvent) => void);

    const unsubscribe = () => this.off(eventType, callback);
    if (options?.signal) {
      if (options.signal.aborted) {
        unsubscribe();
      } else {
        options.signal.addEventListener("abort", unsubscribe, { once: true });
      }
    }
    return unsubscribe;
  }

  off<T extends GameEvent>(
    eventType: EventConstructor<T>,
    callback: (event: T) => void,
  ): void {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      const index = callbacks.indexOf(callback as (event: GameEvent) => void);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Create a per-session view of this bus. Scoped listeners receive the same
   * events as the parent, but can all be released together when a game ends.
   */
  scoped(): EventBus {
    return new ScopedEventBus(this);
  }

  /** No-op for the root bus; scoped buses override this. */
  dispose(): void {}
}

class ScopedEventBus extends EventBus {
  private readonly unsubscribers = new Set<() => void>();
  private disposed = false;

  constructor(private readonly parent: EventBus) {
    super();
  }

  override emit<T extends GameEvent>(event: T): void {
    if (!this.disposed) this.parent.emit(event);
  }

  override on<T extends GameEvent>(
    eventType: EventConstructor<T>,
    callback: (event: T) => void,
    options?: { signal?: AbortSignal },
  ): () => void {
    if (this.disposed) return () => {};
    const parentUnsubscribe = this.parent.on(eventType, callback, options);
    const unsubscribe = () => {
      parentUnsubscribe();
      this.unsubscribers.delete(unsubscribe);
    };
    this.unsubscribers.add(unsubscribe);
    return unsubscribe;
  }

  override off<T extends GameEvent>(
    eventType: EventConstructor<T>,
    callback: (event: T) => void,
  ): void {
    this.parent.off(eventType, callback);
  }

  override dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const unsubscribe of [...this.unsubscribers]) unsubscribe();
    this.unsubscribers.clear();
  }
}
