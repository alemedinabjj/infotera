"use client";

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
  const revealed = useRef(false);

  useEffect(() => {
    if (written.current === index) return;
    written.current = index;
    window.history.replaceState(null, "", photoHref(hotelId, index, locale));
  }, [index, hotelId, locale]);

  // Activity (cacheComponents) esconde a rota em vez de desmontar e a reexibe no Voltar/Avançar, com o
  // estado de antes. Os efeitos rodam de novo ao reexibir: a foto passa a ser a da URL do histórico
  // (que `replaceState` manteve em dia), não o índice guardado nem o das props da rota.
  useLayoutEffect(() => {
    if (!revealed.current) {
      revealed.current = true;
      return;
    }
    const fromUrl = photoIndexFromPath(window.location.pathname, total);
    if (fromUrl === null) return;
    written.current = fromUrl;
    setIndex(fromUrl);
  }, [total]);

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
