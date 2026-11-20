import { z } from "zod";

const ERROR_MESSAGE =
  "NEXT_PUBLIC_API_URL ausente ou inválida. Copie .env.example para .env.local.";

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z
    .url({ protocol: /^https?$/, error: ERROR_MESSAGE })
    .transform((url) => url.replace(/\/+$/, "")),
});

export type Env = z.infer<typeof envSchema>;

type RawEnv = { NEXT_PUBLIC_API_URL?: string | undefined };

/** Valida as variáveis públicas; lança com mensagem em pt-BR se faltar ou for inválida. */
export const parseEnv = (raw: RawEnv): Env => {
  const result = envSchema.safeParse(raw);
  if (!result.success) throw new Error(ERROR_MESSAGE);
  return result.data;
};

// Referência estática: o Next só faz inline de `process.env.NEXT_PUBLIC_*` acessado diretamente.
export const env: Env = parseEnv({ NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL });
