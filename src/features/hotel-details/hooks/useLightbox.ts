"use client";

import { type KeyboardEvent, useCallback, useState } from "react";
import { type GalleryAction, galleryKeyAction, galleryNavigation } from "../model/gallery";

type LightboxState = { open: boolean; index: number };

/** Estado do lightbox (aberto + foto atual) e o teclado, sobre `galleryNavigation`. */
export const useLightbox = (total: number) => {
  const [state, setState] = useState<LightboxState>({ open: false, index: 0 });

  const openAt = useCallback((index: number) => setState({ open: true, index }), []);
  const close = useCallback(() => setState((current) => ({ ...current, open: false })), []);
  const go = useCallback(
    (action: GalleryAction) =>
      setState((current) => ({
        ...current,
        index: galleryNavigation(current.index, total, action),
      })),
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

  return { open: state.open, index: state.index, openAt, close, go, onKeyDown };
};
