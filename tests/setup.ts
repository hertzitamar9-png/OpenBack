// Add global mocks or configuration here if needed
import "vitest-canvas-mock";

// Node 25 exposes an incomplete global localStorage object when no
// --localstorage-file is configured. JSDOM does not replace it, so install a
// small standards-shaped in-memory implementation for browser-facing tests.
if (typeof globalThis.localStorage?.getItem !== "function") {
  let storage: Record<string, string> = {};
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    writable: true,
    value: {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = String(value);
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        storage = {};
      },
      key: (index: number) => Object.keys(storage)[index] ?? null,
      get length() {
        return Object.keys(storage).length;
      },
    } satisfies Storage,
  });
}
