import { create } from "zustand";
import {
  pushToast,
  type ToastAction,
  type ToastItemData,
  type ToastTone,
  toastDuration,
} from "./toast-model";

export type { ToastAction, ToastItemData, ToastTone } from "./toast-model";
export { MAX_VISIBLE_TOASTS } from "./toast-model";

type ToastOptions = { action?: ToastAction; key?: string; duration?: number };

type ToastState = { toasts: ToastItemData[] };

export const useToastStore = create<ToastState>(() => ({ toasts: [] }));

let nextId = 1;

const push = (tone: ToastTone, message: string, options: ToastOptions = {}): number => {
  const id = nextId++;
  const item: ToastItemData = {
    id,
    version: 0,
    tone,
    message,
    duration: toastDuration(tone, options.action !== undefined, options.duration),
    ...(options.key === undefined ? {} : { key: options.key }),
    ...(options.action ? { action: options.action } : {}),
  };
  useToastStore.setState((state) => ({ toasts: pushToast(state.toasts, item) }));
  const stored = useToastStore.getState().toasts.find((entry) => entry.key === options.key);
  return options.key === undefined ? id : (stored?.id ?? id);
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
