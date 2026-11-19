import { useSyncExternalStore } from "react";
import { type ISODate, todayISO } from "@/shared/lib/dates";

const subscribe = (): (() => void) => () => undefined;
const getSnapshot = (): ISODate => todayISO();
const getServerSnapshot = (): null => null;

/**
 * Data local de hoje, só no cliente. No servidor e na hidratação é `null` (evita mismatch
 * quando servidor e usuário estão em dias diferentes): use para `min`/`max` dos inputs.
 */
export const useToday = (): ISODate | null =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
