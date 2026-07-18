// Add global mocks or configuration here if needed
import "vitest-canvas-mock";

// Node 25's built-in localStorage getter emits a warning when no backing file
// is configured. Tests need isolated in-memory state anyway, so replace it
// without reading the warning-producing getter first.
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
