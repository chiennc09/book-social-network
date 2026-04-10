/**
 * tabScrollBus — lightweight pub/sub for tab bar scroll control.
 *
 * Replaces the broken `import { EventEmitter } from 'events'` (Node.js only).
 * Uses a simple callback set — zero dependencies, zero overhead.
 */
type ScrollDirection = 'up' | 'down';
type ScrollListener   = (dir: ScrollDirection) => void;

const listeners = new Set<ScrollListener>();

export const tabScrollBus = {
  emit(direction: ScrollDirection) {
    listeners.forEach(fn => fn(direction));
  },
  subscribe(fn: ScrollListener) {
    listeners.add(fn);
    return () => listeners.delete(fn);  // unsubscribe
  },
};
