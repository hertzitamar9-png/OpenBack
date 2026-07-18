import { describe, expect, test, vi } from "vitest";
import { EventBus } from "../src/core/EventBus";

class TestEvent {
  constructor(readonly value: number) {}
}

describe("EventBus scopes", () => {
  test("scoped listeners receive shared events and are removed together", () => {
    const root = new EventBus();
    const scope = root.scoped();
    const listener = vi.fn();
    scope.on(TestEvent, listener);

    scope.emit(new TestEvent(1));
    root.emit(new TestEvent(2));
    expect(listener).toHaveBeenCalledTimes(2);

    scope.dispose();
    root.emit(new TestEvent(3));
    scope.emit(new TestEvent(4));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  test("abort signals unsubscribe ordinary listeners", () => {
    const bus = new EventBus();
    const abort = new AbortController();
    const listener = vi.fn();
    bus.on(TestEvent, listener, { signal: abort.signal });

    bus.emit(new TestEvent(1));
    abort.abort();
    bus.emit(new TestEvent(2));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
