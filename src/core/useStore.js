import { useSyncExternalStore } from 'react';
import { Store } from './store.js';

/**
 * Subscribes a component to the store.
 *
 * The store predates React and mutates a single state object in place, so
 * object identity cannot signal a change. It exposes a monotonic `version`
 * instead, which is what React compares between renders.
 *
 * Returns the live state object. Read from it during render; never mutate it
 * directly — go through Store.set / Store.patchDraft so subscribers fire.
 */
export function useStore() {
  useSyncExternalStore(
    cb => Store.sub(cb),
    () => Store.getSnapshot(),
    () => Store.getSnapshot(),
  );
  return Store.s;
}
