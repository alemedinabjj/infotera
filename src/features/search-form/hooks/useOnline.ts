import { useSyncExternalStore } from "react";

const subscribe = (notify: () => void): (() => void) => {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
};

/** `navigator.onLine` reativo; no servidor (e na hidratação) assume online. */
export const useOnline = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
