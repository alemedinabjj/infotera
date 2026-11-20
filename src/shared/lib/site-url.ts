import { z } from "./zod";

/** Endereço público do site quando `NEXT_PUBLIC_SITE_URL` não está definida (desenvolvimento local). */
export const DEFAULT_SITE_URL = "http://localhost:3000";

const siteUrlSchema = z.url({ protocol: /^https?$/ });

/**
 * Base absoluta do site (`metadataBase`: canonical, hreflang e imagens sociais viram URLs absolutas).
 * Valor ausente ou inválido cai em `DEFAULT_SITE_URL`: o build nunca quebra por causa disso.
 */
export const parseSiteUrl = (raw: string | undefined): URL => {
  const parsed = siteUrlSchema.safeParse(raw);
  return new URL(parsed.success ? parsed.data : DEFAULT_SITE_URL);
};

// Referência estática: o Next só faz inline de `process.env.NEXT_PUBLIC_*` acessado diretamente.
export const SITE_URL = parseSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
