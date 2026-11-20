import type { Locale } from "@/shared/i18n/config";
import { localizePath } from "@/shared/i18n/paths";
import { hotelDetailsMessages } from "../i18n/messages";

const PHOTO_PARAM_PATTERN = /^[1-9]\d{0,2}$/;

/**
 * Segmento `[photo]` da rota da galeria (1-based: `/photos/3` é a 3ª foto) para índice base 0.
 * Só inteiro sem zero à esquerda, até 3 dígitos, dentro de `1..total`. O resto é `null`.
 */
export const parsePhotoParam = (raw: string, total: number): number | null => {
  if (!PHOTO_PARAM_PATTERN.test(raw)) return null;
  const position = Number(raw);
  return position <= total ? position - 1 : null;
};

/**
 * Índice (base 0) da foto que a URL atual aponta (`/hotel/1/photos/3`, com ou sem `/en`), ou `null`
 * se o caminho não é de uma foto válida. O visualizador troca a foto por `replaceState`, então a URL
 * (e não as props da rota renderizada) é a fonte da verdade quando o histórico reexibe a rota.
 */
export const photoIndexFromPath = (pathname: string, total: number): number | null => {
  const segments = pathname.split("/").filter(Boolean);
  const [photos, raw] = segments.slice(-2);
  return photos === "photos" && raw !== undefined ? parsePhotoParam(raw, total) : null;
};

/** URL pública da foto de índice `index` (base 0) no idioma: `/hotel/1/photos/3`, `/en/hotel/1/photos/3`. */
export const photoHref = (hotelId: number, index: number, locale: Locale): string =>
  localizePath(locale, `/hotel/${hotelId}/photos/${index + 1}`);

type PhotoTitleState =
  | { kind: "photo"; hotel: string; index: number; total: number }
  | { kind: "not-found" };

/** `<title>` da página cheia da foto (índice base 0). */
export const photoPageTitle = (state: PhotoTitleState, locale: Locale): string => {
  const t = hotelDetailsMessages.get(locale).photoPage;
  switch (state.kind) {
    case "photo":
      return t.metaTitle({ index: state.index + 1, total: state.total, hotel: state.hotel });
    case "not-found":
      return t.metaNotFound;
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
};
