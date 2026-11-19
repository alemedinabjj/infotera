import type { z } from "zod";

export const STORAGE_PREFIX = "infotera:";

type StorageKind = "local" | "session";

type SafeStorage = {
  /** Lê e valida; qualquer falha (ausente, JSON inválido, schema, acesso) devolve `fallback`. */
  read: <T>(key: string, schema: z.ZodType<T>, fallback: T) => T;
  /** Grava como JSON; nunca lança (cota cheia, modo privado, SSR). */
  write: (key: string, value: unknown) => void;
  remove: (key: string) => void;
};

const getBackend = (kind: StorageKind): Storage | null => {
  if (typeof window === "undefined") return null;
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
};

/** Wrapper de Web Storage com prefixo `infotera:`, seguro em SSR e em erro. */
export const createStorage = (kind: StorageKind): SafeStorage => ({
  read: (key, schema, fallback) => {
    try {
      const raw = getBackend(kind)?.getItem(STORAGE_PREFIX + key);
      if (raw === null || raw === undefined) return fallback;
      const parsed = schema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : fallback;
    } catch {
      return fallback;
    }
  },
  write: (key, value) => {
    try {
      getBackend(kind)?.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch {
      // Cota excedida ou storage indisponível: persistência é best-effort.
    }
  },
  remove: (key) => {
    try {
      getBackend(kind)?.removeItem(STORAGE_PREFIX + key);
    } catch {
      // Ignorado de propósito.
    }
  },
});
