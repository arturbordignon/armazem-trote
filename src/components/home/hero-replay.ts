import { useSyncExternalStore } from 'react';

// "Chamar a charrete" lives in the notice, the charrete in the window next to it: this tiny
// store lets the button restart the animation without wrapping the hero in one client tree.

let replays = 0;
const listeners = new Set<() => void>();

export function callCharrete(): void {
  replays += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useReplayCount(): number {
  return useSyncExternalStore(
    subscribe,
    () => replays,
    () => 0,
  );
}
