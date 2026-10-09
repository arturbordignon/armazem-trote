import { useSyncExternalStore } from 'react';

// Telegram toasts ("TELEGRAMMA · EMBARCADO"). A tiny external store so any component (and the
// cart store) can send one without prop drilling or a provider.

export interface ToastAction {
  label: string;
  run: () => void;
}

export interface Toast {
  id: number;
  title: string;
  body: string;
  action?: ToastAction;
}

const VISIBLE_TOASTS = 3;
const TOAST_LIFETIME_MS = 5_000;

let toasts: readonly Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit(next: readonly Toast[]): void {
  toasts = next;
  listeners.forEach((listener) => listener());
}

export function showToast(toast: Omit<Toast, 'id'>): void {
  const id = nextId++;
  emit([...toasts.slice(-(VISIBLE_TOASTS - 1)), { ...toast, id }]);
  setTimeout(() => dismissToast(id), TOAST_LIFETIME_MS);
}

export function dismissToast(id: number): void {
  if (toasts.some((t) => t.id === id)) emit(toasts.filter((t) => t.id !== id));
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const NO_TOASTS: readonly Toast[] = [];

export function useToasts(): readonly Toast[] {
  return useSyncExternalStore(
    subscribe,
    () => toasts,
    () => NO_TOASTS,
  );
}
