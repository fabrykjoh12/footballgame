import { useCallback, useRef } from 'react';

/**
 * Returns a stable function identity that always invokes the latest version of
 * `fn`. Lets timer effects depend on a callback without re-subscribing every
 * render, while still reading fresh state inside the callback.
 */
export function useCallbackRef<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = useRef(fn);
  ref.current = fn;
  return useCallback((...args: A) => ref.current(...args), []);
}
