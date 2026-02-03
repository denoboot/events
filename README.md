# @denoboot/events

A lightweight, fully asynchronous event emitter system for Deno.  
Provides simple **pub/sub** functionality for engine-wide events with support for async handlers, one-time listeners, and typed events.

---

## Features

- Async event handling
- One-time event listeners (`once`)
- Maximum listener warnings to prevent memory leaks
- Typed event emitters for strict event schemas
- Global `EventBus` for application-wide events
- Fully compatible with Deno/TypeScript

---

## Installation

```bash
deno add jsr:@denoboot/events
```

Or import directly in your Deno project:

```ts
import {
  EventEmitter,
  createEventEmitter,
  TypedEventEmitter,
  createTypedEventEmitter,
  EventBus,
} from "@denoboot/events/mod.ts";
```

---

## Usage

### Basic EventEmitter

```ts
const emitter = new EventEmitter();

emitter.on("data", (payload) => {
  console.log("Received data:", payload);
});

emitter.emit("data", { value: 42 });
```

### One-time listeners

```ts
emitter.once("init", () => {
  console.log("This will run only once");
});

await emitter.emit("init");
await emitter.emit("init"); // Won't trigger
```

### Removing listeners

```ts
function handler(data: any) {
  console.log("Handled:", data);
}

emitter.on("event", handler);
emitter.off("event", handler); // Unsubscribe
```

### Listener utilities

```ts
console.log(emitter.listenerCount("data")); // Number of listeners
console.log(emitter.eventNames());          // List of event names
emitter.removeAllListeners("data");         // Remove all for a specific event
emitter.removeAllListeners();               // Remove all listeners
```

---

## Typed EventEmitter

```ts
interface MyEvents {
  login: { userId: string };
  logout: { userId: string };
}

const typedEmitter = createTypedEventEmitter<MyEvents>();

typedEmitter.on("login", (data) => {
  console.log("User logged in:", data.userId);
});

await typedEmitter.emit("login", { userId: "abc123" });
```

Typed emitters ensure correct event names and payload types at compile-time.

---

## Global Event Bus

The `EventBus` provides a singleton for application-wide events:

```ts
const bus = EventBus.getInstance();

bus.on("shutdown", () => {
  console.log("Application is shutting down");
});

await bus.emit("shutdown");
```

Reset the bus if needed:

```ts
EventBus.reset();
```

---

## Advanced Features

* **Async handlers:** Event handlers can return promises, and `emit` will wait for all to resolve.
* **Max listeners:** Warns when too many listeners are registered for the same event. Customize with `setMaxListeners`.
* **One-time listeners:** Automatically removed after first execution.
* **Aliases:** `addListener` and `removeListener` are aliases for `on` and `off`.

---

## API

### `EventEmitter`

* `on(event: string, handler: EventHandler)`
* `off(event: string, handler: EventHandler)`
* `once(event: string, handler: EventHandler)`
* `emit(event: string, data?: unknown): Promise<void>`
* `removeAllListeners(event?: string)`
* `listenerCount(event: string): number`
* `eventNames(): string[]`
* `setMaxListeners(n: number)`
* `getMaxListeners(): number`
* `listeners(event: string): EventHandler[]`
* `rawListeners(event: string): EventListener[]`
* `addListener` / `removeListener` (aliases)

### `TypedEventEmitter<EventMap>`

* `on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>)`
* `off<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>)`
* `once<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>)`
* `emit<K extends keyof EventMap>(event: K, data: EventMap[K]): Promise<void>`
* `removeAllListeners<K extends keyof EventMap>(event?: K)`
* `listenerCount<K extends keyof EventMap>(event: K): number`

### `EventBus`

* `getInstance(): EventEmitter`
* `reset(): void`

---

## Example: Async Handlers

```ts
const emitter = new EventEmitter();

emitter.on("process", async (data) => {
  await new Promise((res) => setTimeout(res, 1000));
  console.log("Processed:", data);
});

await emitter.emit("process", { taskId: 1 });
console.log("All handlers finished");
```

---

## License

[MIT](LICENSE)