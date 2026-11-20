import type { MetadataRoute } from "next";
import { BRAND_CANVAS, BRAND_NAME, BRAND_PRIMARY, BRAND_SHORT_NAME } from "@/shared/lib/brand";

/**
 * Manifest do PWA. Só existe um (o Next aceita `manifest` apenas na raiz de `app/`): o nome é a
 * marca nos dois idiomas e a descrição é em pt-BR. Os ícones vêm de `icon.tsx` (`generateImageMetadata`:
 * ids `192`, `512` e `maskable`), gerados por código, sem binários no repositório.
 */
const manifest = (): MetadataRoute.Manifest => ({
  name: BRAND_NAME,
  short_name: BRAND_SHORT_NAME,
  description: "Busque, compare e reserve hotéis com preço claro do início ao fim.",
  start_url: "/",
  scope: "/",
  display: "standalone",
  background_color: BRAND_CANVAS,
  theme_color: BRAND_PRIMARY,
  lang: "pt-BR",
  icons: [
    { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icon/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
});

export default manifest;
