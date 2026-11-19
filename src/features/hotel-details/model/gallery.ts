/** Fotos mostradas na página: a principal + até 4 miniaturas. */
export const GALLERY_PREVIEW_COUNT = 5;

const MAX_THUMBS = GALLERY_PREVIEW_COUNT - 1;

export type GalleryAction = "next" | "prev" | "first" | "last";

/** Próximo índice do lightbox: `next`/`prev` dão a volta; `first`/`last` vão às pontas. */
export const galleryNavigation = (index: number, total: number, action: GalleryAction): number => {
  if (total <= 0) return 0;
  switch (action) {
    case "next":
      return (index + 1) % total;
    case "prev":
      return (index - 1 + total) % total;
    case "first":
      return 0;
    case "last":
      return total - 1;
    default: {
      const unreachable: never = action;
      return unreachable;
    }
  }
};

/** `Hotel Copacabana Palace, foto 2 de 5` (índice base 0). */
export const photoAlt = (name: string, index: number, total: number): string =>
  `${name}, foto ${index + 1} de ${total}`;

/** Nome acessível do botão-foto: `Abrir foto 2 de 5`. */
export const photoOpenLabel = (index: number, total: number): string =>
  `Abrir foto ${index + 1} de ${total}`;

/** `Foto 2 de 5` (contador do lightbox). */
export const photoCounter = (index: number, total: number): string =>
  `Foto ${index + 1} de ${total}`;

export type GalleryPreview = {
  /** Índice (na lista completa) das miniaturas mostradas: 1..4. */
  thumbs: number[];
  /** Fotos além das 5 mostradas (`+3 fotos` sobre a última miniatura). */
  hiddenCount: number;
};

/** Quais fotos aparecem na página além da principal (índice 0) e quantas ficam escondidas. */
export const galleryPreview = (total: number): GalleryPreview => {
  const thumbCount = Math.max(0, Math.min(total - 1, MAX_THUMBS));
  return {
    thumbs: Array.from({ length: thumbCount }, (_, i) => i + 1),
    hiddenCount: Math.max(0, total - GALLERY_PREVIEW_COUNT),
  };
};

/** Classes da principal na grade `sm+` (ocupa tudo quando não há miniaturas). */
export const mainPhotoSpan = (thumbCount: number): string =>
  thumbCount === 0 ? "col-span-4 row-span-2" : "col-span-2 row-span-2";

const THUMB_PLACEMENT: Record<number, readonly string[]> = {
  4: ["", "", "", ""],
  3: ["col-start-3 row-start-1", "col-start-3 row-start-2", "col-start-4 row-start-1 row-span-2"],
  2: ["col-start-3 row-span-2", "col-start-4 row-span-2"],
  1: ["col-span-2 row-span-2"],
};

/** Posição da miniatura `position` (0-based) na grade de 4 colunas × 2 linhas, sem buracos. */
export const thumbPlacement = (thumbCount: number, position: number): string =>
  THUMB_PLACEMENT[thumbCount]?.[position] ?? "";
