"use client";

import { usePathname } from "next/navigation";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { Locale } from "@/shared/i18n/config";
import { type GalleryAction, galleryKeyAction, galleryNavigation } from "../model/gallery";
import { photoHref, photoIndexFromPath } from "../model/photo-route";

type PhotoViewerOptions = {
  hotelId: number;
  total: number;
  /** Índice (base 0) da foto da URL de entrada. */
  initialIndex: number;
  locale: Locale;
};

/**
 * Foto atual do visualizador (modal e página cheia). Trocar de foto **não navega**: o índice é estado
 * local (instantâneo, sem request RSC) e a URL acompanha por `history.replaceState` (o Next integra a
 * History API ao router), então o reload abre a foto atual e Voltar continua levando ao hotel. As
 * teclas vêm de `galleryKeyAction`; as regras de índice, de `galleryNavigation`.
 */
export const usePhotoViewer = ({ hotelId, total, initialIndex, locale }: PhotoViewerOptions) => {
  const [index, setIndex] = useState(initialIndex);
  const written = useRef(initialIndex);
  const pathname = usePathname();
  const revealed = useRef(false);

  useEffect(() => {
    if (written.current === index) return;
    written.current = index;
    window.history.replaceState(null, "", photoHref(hotelId, index, locale));
  }, [index, hotelId, locale]);

  // Activity (cacheComponents) esconde a rota em vez de desmontar e a reexibe com o estado de antes. Ao
  // reexibir, a foto passa a ser a do caminho que o Next já confirmou (`usePathname`, que `replaceState`
  // mantém em dia), não o índice guardado. Ler `window.location` aqui corria com o `pushState` do Next:
  // às vezes ainda era o caminho do hotel e a foto 3 da visita anterior reaparecia no lugar da 1.
  useLayoutEffect(() => {
    // Na primeira montagem valem as props da rota; daí em diante (reexibição ou troca de caminho), o caminho.
    if (!revealed.current) {
      revealed.current = true;
      return;
    }
    const fromUrl = photoIndexFromPath(pathname, total);
    if (fromUrl === null || fromUrl === written.current) return;
    written.current = fromUrl;
    setIndex(fromUrl);
  }, [pathname, total]);

  const go = useCallback(
    (action: GalleryAction) => setIndex((current) => galleryNavigation(current, total, action)),
    [total],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const action = galleryKeyAction(event.key);
      if (action === null) return;
      event.preventDefault();
      go(action);
    },
    [go],
  );

  return { index, go, onKeyDown };
};
