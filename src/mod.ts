// deno-lint-ignore-file no-explicit-any

/**
 * Event emitter system
 * Simple pub/sub for engine-wide events with async support
 */

export type EventHandler<T = any> = (data?: T) => void | Promise<void>;

export interface EventEmitter {
  on<T = unknown>(event: string, handler: EventHandler<T>): void;
  off<T = unknown>(event: string, handler: EventHandler<T>): void;
  once<T = unknown>(event: string, handler: EventHandler<T>): void;
  emit(event: string, data?: unknown): void | Promise<void>;
  removeAllListeners(event?: string): void;
  listenerCount(event: string): number;
  eventNames(): string[];
}

interface EventListener {
  handler: EventHandler;
  once: boolean;
}

interface IEventEmitter extends EventEmitter {}

/**
 * EventEmitter implementation
 *
 * Features:
 * - Async event handling
 * - One-time event listeners
 * - Maximum listener limit
 * - Event name warnings
 */
export class EventEmitter implements IEventEmitter {
  private events = new Map<string, Set<EventListener>>();
  private maxListeners = 10;
  private warningIssued = new Set<string>();

  /**
   * Subscribe to an event
   */
  on<T = unknown>(event: string, handler: EventHandler<T>): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }

    const listeners = this.events.get(event)!;
    listeners.add({ handler, once: false });

    // Warn about potential memory leaks
    if (listeners.size > this.maxListeners && !this.warningIssued.has(event)) {
      console.warn(
        `Warning: Possible EventEmitter memory leak detected. ` +
          `${listeners.size} listeners added for event "${event}". ` +
          `Use setMaxListeners() to increase limit.`,
      );
      this.warningIssued.add(event);
    }
  }

  /**
   * Unsubscribe from an event
   */
  off<T = unknown>(event: string, handler: EventHandler<T>): void {
    const listeners = this.events.get(event);
    if (!listeners) return;

    // Find and remove the listener
    for (const listener of listeners) {
      if (listener.handler === handler) {
        listeners.delete(listener);
        break;
      }
    }

    // Clean up empty event sets
    if (listeners.size === 0) {
      this.events.delete(event);
      this.warningIssued.delete(event);
    }
  }

  /**
   * Subscribe to an event for one-time execution
   */
  once<T = unknown>(event: string, handler: EventHandler<T>): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }

    this.events.get(event)!.add({ handler, once: true });
  }

  /**
   * Emit an event to all subscribers
   */
  async emit(event: string, data?: unknown): Promise<void> {
    const listeners = this.events.get(event);
    if (!listeners || listeners.size === 0) return;

    const promises: Promise<void>[] = [];
    const toRemove: EventListener[] = [];

    for (const listener of listeners) {
      try {
        const result = listener.handler(data);
        if (result instanceof Promise) {
          promises.push(result);
        }

        // Mark once listeners for removal
        if (listener.once) {
          toRemove.push(listener);
        }
      } catch (error) {
        console.error(`Error in event handler for "${event}":`, error);
      }
    }

    // Remove once listeners
    toRemove.forEach((listener) => listeners.delete(listener));

    // Wait for all async handlers to complete
    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }
  }

  /**
   * Remove all listeners for an event (or all events)
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
      this.warningIssued.delete(event);
    } else {
      this.events.clear();
      this.warningIssued.clear();
    }
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount(event: string): number {
    const listeners = this.events.get(event);
    return listeners ? listeners.size : 0;
  }

  /**
   * Get all event names that have listeners
   */
  eventNames(): string[] {
    return Array.from(this.events.keys());
  }

  /**
   * Set the maximum number of listeners before warning
   */
  setMaxListeners(n: number): void {
    this.maxListeners = n;
  }

  /**
   * Get the maximum number of listeners
   */
  getMaxListeners(): number {
    return this.maxListeners;
  }

  /**
   * Get all listeners for an event
   */
  listeners(event: string): EventHandler[] {
    const listeners = this.events.get(event);
    if (!listeners) return [];
    return Array.from(listeners).map((l) => l.handler);
  }

  /**
   * Get raw listeners (including once flag)
   */
  rawListeners(event: string): EventListener[] {
    const listeners = this.events.get(event);
    if (!listeners) return [];
    return Array.from(listeners);
  }

  /**
   * Alias for on()
   */
  addListener<T = unknown>(event: string, handler: EventHandler<T>): void {
    this.on(event, handler);
  }

  /**
   * Alias for off()
   */
  removeListener<T = unknown>(event: string, handler: EventHandler<T>): void {
    this.off(event, handler);
  }
}

/**
 * @deprecated Use EventEmitter instead
 */
export class SimpleEventEmitter extends EventEmitter {}

/**
 * Create an event emitter
 */
export function createEventEmitter(): EventEmitter {
  return new EventEmitter();
}

/**
 * Typed event emitter for specific event schemas
 */
export class TypedEventEmitter<EventMap extends Record<string, unknown>> {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new SimpleEventEmitter();
  }

  on<K extends keyof EventMap>(
    event: K,
    handler: EventHandler<EventMap[K]>,
  ): void {
    this.emitter.on(event as string, handler);
  }

  off<K extends keyof EventMap>(
    event: K,
    handler: EventHandler<EventMap[K]>,
  ): void {
    this.emitter.off(event as string, handler);
  }

  once<K extends keyof EventMap>(
    event: K,
    handler: EventHandler<EventMap[K]>,
  ): void {
    this.emitter.once(event as string, handler);
  }

  async emit<K extends keyof EventMap>(
    event: K,
    data: EventMap[K],
  ): Promise<void> {
    await this.emitter.emit(event as string, data);
  }

  removeAllListeners<K extends keyof EventMap>(event?: K): void {
    this.emitter.removeAllListeners(event as string);
  }

  listenerCount<K extends keyof EventMap>(event: K): number {
    return this.emitter.listenerCount(event as string);
  }
}

/**
 * Create a typed event emitter
 */
export function createTypedEventEmitter<
  EventMap extends Record<string, unknown>,
>(): TypedEventEmitter<EventMap> {
  return new TypedEventEmitter<EventMap>();
}

/**
 * Event bus for global application events
 */
export class EventBus {
  private static instance: EventEmitter;

  static getInstance(): EventEmitter {
    if (!EventBus.instance) {
      EventBus.instance = new SimpleEventEmitter();
    }
    return EventBus.instance;
  }

  static reset(): void {
    EventBus.instance = new SimpleEventEmitter();
  }
}
