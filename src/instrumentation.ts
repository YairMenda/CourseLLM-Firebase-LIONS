/**
 * Next.js Instrumentation
 * 
 * This file runs once when the Next.js server starts.
 * We use it to polyfill localStorage for Node.js 25+ which has a broken implementation.
 */

export async function register() {
  // Only run on the server
  if (typeof window !== 'undefined') {
    return;
  }
  
  function needsLocalStoragePolyfill(): boolean {
    if (typeof globalThis.localStorage === 'undefined') {
      return true;
    }
    
    // Test if localStorage methods actually work
    try {
      const testKey = '__polyfill_test__';
      globalThis.localStorage.setItem(testKey, 'test');
      globalThis.localStorage.removeItem(testKey);
      return false; // It works
    } catch {
      return true; // It's broken
    }
  }

  if (needsLocalStoragePolyfill()) {
    console.log('📦 Polyfilling localStorage for Node.js server...');
    
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
        Object.keys(store).forEach(key => delete store[key]);
      },
      get length(): number {
        return Object.keys(store).length;
      },
      key: (index: number): string | null => {
        return Object.keys(store)[index] ?? null;
      },
    };
  }
}

