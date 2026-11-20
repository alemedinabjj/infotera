"use client";

import { usePathname, useRouter } from "next/navigation";
import { type MouseEvent, useEffect, useRef, useState } from "react";
import {
  arrivedAfterDismiss,
  hasArrived,
  IDLE_OPENING,
  isModifiedClick,
  type PhotoOpening,
  visiblePhase,
} from "../model/photo-opening";
import { markPhotoOpener, restorePhotoFocus } from "./usePhotoOpener";

/**
 * O que acontece entre o clique numa foto e a rota responder. O Next só mostra o `loading.tsx` do slot
 * quando a navegação já tem o que mostrar (em dev e sem prefetch, nada aparece até o RSC chegar), então o
 * clique abre a moldura de carregamento na hora (`opening`) e sem internet nem navega (`offline`).
 * Ela some quando o caminho muda (a rota assume). Fechar antes disso desfaz a abertura: quando a rota
 * chegar, volta uma entrada (o modal não pode aparecer depois de a pessoa ter desistido).
 */
export const usePhotoOpening = (href: string) => {
  const router = useRouter();
  const pathname = usePathname();
  const [opening, setOpening] = useState<PhotoOpening>(IDLE_OPENING);
  const restoreFocus = useRef(false);
  const phase = visiblePhase(opening, pathname);

  useEffect(() => {
    if (!hasArrived(opening, pathname)) return;
    setOpening(IDLE_OPENING);
    if (arrivedAfterDismiss(opening, pathname)) router.back();
  }, [opening, pathname, router]);

  useEffect(() => {
    if (phase !== "idle" || !restoreFocus.current) return;
    restoreFocus.current = false;
    restorePhotoFocus();
  }, [phase]);

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isModifiedClick(event.nativeEvent)) return;
    markPhotoOpener(event.currentTarget);
    if (navigator.onLine) {
      setOpening({ phase: "opening", from: pathname, dismissed: false });
      return;
    }
    event.preventDefault();
    setOpening({ phase: "offline", from: pathname, dismissed: false });
  };

  const dismiss = () => {
    restoreFocus.current = true;
    // Fechar o carregamento não cancela a navegação do Next: guarda a desistência até a rota chegar.
    setOpening((current) =>
      current.phase === "opening" ? { ...current, dismissed: true } : IDLE_OPENING,
    );
  };

  const retry = () => {
    if (!navigator.onLine) return;
    setOpening({ phase: "opening", from: pathname, dismissed: false });
    router.push(href, { scroll: false });
  };

  return { phase, onClick, dismiss, retry };
};
