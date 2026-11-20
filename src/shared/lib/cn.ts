import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Junta classes condicionais (clsx) e resolve conflitos do Tailwind (tailwind-merge). */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
