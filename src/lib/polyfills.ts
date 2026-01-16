/**
 * Server-side polyfills for browser APIs
 *
 * This module should be imported at the top of any server-side code that
 * uses libraries expecting browser globals (like Firebase).
 *
 * Node.js 25+ has a --localstorage-file flag that creates a broken localStorage
 * object when the path is invalid. We need to detect and fix this.
 */

function needsLocalStoragePolyfill(): boolean {
  if (typeof globalThis.localStorage === "undefined") {
    return true;
  }

  // Test if localStorage methods actually work
  try {
    const testKey = "__polyfill_test__";
    globalThis.localStorage.setItem(testKey, "test");
    globalThis.localStorage.removeItem(testKey);
    return false; // It works
  } catch {
    return true; // It's broken
  }
}

if (needsLocalStoragePolyfill()) {
  // Create a simple in-memory localStorage polyfill for the server
  const store: Record<string, string> = {};

  (globalThis as any).localStorage = {
    getItem: (key: string): string | null => {
      return store[key] ?? null;
    },
    setItem: (key: string, value: string): void => {
      store[key] = String(value);
    },
    removeItem: (key: string): void => {
      delete store[key];
    },
    clear: (): void => {
      Object.keys(store).forEach((key) => delete store[key]);
    },
    get length(): number {
      return Object.keys(store).length;
    },
    key: (index: number): string | null => {
      return Object.keys(store)[index] ?? null;
    },
  };
}

export {};
