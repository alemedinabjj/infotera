/** Placeholder do blur: SVG 4:3 na cor `surface-sunken` do design system (constante, sem custo por imagem). */
export const BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0IDMiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjMiIGZpbGw9IiNlOWVkZjIiLz48L3N2Zz4=";

/** Celular: 100% da largura; a partir de `sm` a foto do card tem 14rem. */
export const CARD_IMAGE_SIZES = "(min-width: 640px) 14rem, 100vw";

const UNSPLASH_HOST = "images.unsplash.com";
const DEFAULT_QUALITY = 75;

type LoaderInput = { src: string; width: number; quality?: number };

/**
 * Loader do `next/image` para o CDN do Unsplash (imgix redimensiona na borda, sem custo de
 * otimização no servidor do Next). Reescreve `w`, `h` (4:3), `fit=crop`, `q` e `auto=format`
 * e preserva os demais params. URL que não é do Unsplash volta intacta.
 */
export const unsplashLoader = ({ src, width, quality }: LoaderInput): string => {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }
  if (url.hostname !== UNSPLASH_HOST) return src;
  url.searchParams.set("w", String(width));
  url.searchParams.set("h", String(Math.round((width * 3) / 4)));
  url.searchParams.set("fit", "crop");
  url.searchParams.set("q", String(quality ?? DEFAULT_QUALITY));
  url.searchParams.set("auto", "format");
  return url.toString();
};
