import { create } from "zustand";

export type ToastTone = "success" | "error" | "info";

export type ToastAction = { label: string; onClick: () => void };

export type ToastItemData = {
  id: number;
  tone: ToastTone;
  message: string;
  action?: ToastAction;
  /** Duração em ms até sumir sozinho. */
  duration: number;
};

type ToastOptions = { action?: ToastAction };

export const MAX_VISIBLE_TOASTS = 3;
const DEFAULT_DURATION_MS = 5000;
const ERROR_DURATION_MS = 8000;

type ToastState = { toasts: ToastItemData[] };

export const useToastStore = create<ToastState>(() => ({ toasts: [] }));

let nextId = 1;

const push = (tone: ToastTone, message: string, options: ToastOptions = {}): number => {
  const id = nextId++;
  const toastItem: ToastItemData = {
    id,
    tone,
    message,
    duration: tone === "error" ? ERROR_DURATION_MS : DEFAULT_DURATION_MS,
    ...(options.action ? { action: options.action } : {}),
  };
  useToastStore.setState((state) => ({
    toasts: [...state.toasts, toastItem].slice(-MAX_VISIBLE_TOASTS),
  }));
  return id;
};

const dismiss = (id: number): void => {
  useToastStore.setState((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) }));
};

/** API imperativa; pode ser chamada fora de React (ex.: `onError` de mutation). */
export const toast = {
  success: (message: string, options?: ToastOptions) => push("success", message, options),
  error: (message: string, options?: ToastOptions) => push("error", message, options),
  info: (message: string, options?: ToastOptions) => push("info", message, options),
  dismiss,
};
