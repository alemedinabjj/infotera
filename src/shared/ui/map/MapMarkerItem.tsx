"use client";

import type { Marker as LeafletMarker, PopupEvent } from "leaflet";
import {
  type KeyboardEvent,
  memo,
  type ReactNode,
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Marker, Popup } from "react-leaflet";
import { IconButton } from "../atoms/IconButton";
import { XIcon } from "../icons";
import { createMarkerIcon, decorateMarkerElement } from "./MapMarkerElement";
import { nextMarkerElement, popupKeyAction } from "./popup-keys";
import type { MapMarker, PopupApi } from "./types";

const FOCUSABLE = "a[href], button:not([disabled])";

const focusables = (root: HTMLElement | null): HTMLElement[] =>
  root ? Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];

const MAX_FRAMES = 30;

/** `checkVisibility` falta em ambientes antigos e no jsdom: aí vale "visível". */
const isVisible = (element: HTMLElement): boolean =>
  typeof element.checkVisibility === "function"
    ? element.checkVisibility({ visibilityProperty: true })
    : true;

/** Foca o elemento assim que ele ficar visível (até ~30 quadros); devolve o cancelamento. */
const focusWhenVisible = (find: () => HTMLElement | undefined): (() => void) => {
  let frame = 0;
  let attempts = 0;
  const tick = () => {
    const element = find();
    if (element && isVisible(element)) {
      element.focus({ preventScroll: true });
      return;
    }
    attempts += 1;
    if (attempts < MAX_FRAMES) frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
};

type PopupBodyProps = {
  titleId: string;
  /** Muda a cada abertura: o Leaflet mantém o conteúdo montado entre aberturas, então o foco segue este valor. */
  openCount: number;
  closeLabel: string;
  /** Fecha o popup; `next` leva o foco ao próximo marcador, `marker` ao próprio. */
  onClose: (focusTo: "marker" | "next") => void;
  children: ReactNode;
};

/**
 * Conteúdo do popup (diálogo não modal). O Leaflet só monta o conteúdo depois de abrir, então a cada
 * abertura o foco entra no primeiro controle (no popup só com nome, o ×). O × é nosso (alvo de 44 px,
 * último no DOM) e o teclado segue o DS §9.9: Esc ou Shift+Tab no primeiro voltam ao marcador, Tab no
 * último fecha e vai ao próximo marcador.
 */
const PopupBody = ({ titleId, openCount, closeLabel, onClose, children }: PopupBodyProps) => {
  const ref = useRef<HTMLDialogElement>(null);

  // O Leaflet mantém o popup `visibility: hidden` até posicioná-lo (e `focus()` num elemento oculto
  // não faz nada): o foco entra no primeiro quadro em que o popup já está visível.
  // biome-ignore lint/correctness/useExhaustiveDependencies: o gatilho é o contador de aberturas
  useEffect(() => focusWhenVisible(() => focusables(ref.current)[0]), [openCount]);

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    const items = focusables(ref.current);
    const action = popupKeyAction({
      key: event.key,
      shiftKey: event.shiftKey,
      atFirst: document.activeElement === items[0],
      atLast: document.activeElement === items.at(-1),
    });
    if (action === null) return;
    event.preventDefault();
    event.stopPropagation();
    onClose(action === "close-to-next" ? "next" : "marker");
  };

  return (
    // `<dialog open>` (não modal, sem `showModal`): a semântica de diálogo vem do elemento nativo.
    <dialog
      ref={ref}
      open
      aria-labelledby={titleId}
      onKeyDown={onKeyDown}
      className="relative m-0 block w-auto max-w-none border-0 bg-transparent p-0 text-inherit"
    >
      {children}
      <IconButton
        aria-label={closeLabel}
        icon={<XIcon aria-hidden="true" className="size-5" />}
        onClick={() => onClose("marker")}
        className="absolute top-1 right-1"
      />
    </dialog>
  );
};

type MarkerItemProps = {
  marker: MapMarker;
  active: boolean;
  closeLabel: string;
  onActiveChange: ((id: string | null) => void) | undefined;
  onSelect: ((id: string) => void) | undefined;
  renderPopup: ((id: string, popup: PopupApi) => ReactNode) | undefined;
};

/** Um marcador. `active` vem por seletor, então passar o mouse re-renderiza só dois itens. */
export const MarkerItem = memo(function MarkerItem({
  marker,
  active,
  closeLabel,
  onActiveChange,
  onSelect,
  renderPopup,
}: MarkerItemProps) {
  const { id, label, variant, text, tone, position } = marker;
  const ref = useRef<LeafletMarker | null>(null);
  const titleId = useId();
  const hasPopup = renderPopup !== undefined;
  const [expanded, setExpanded] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const notifyActive = useEffectEvent((value: string | null) => onActiveChange?.(value));
  const notifySelect = useEffectEvent(() => onSelect?.(id));
  // O ícone depende só do que é desenhado; o destaque é CSS (`data-active`).
  const icon = useMemo(() => createMarkerIcon({ variant, text, tone }), [variant, text, tone]);
  const highlighted = active || expanded;

  // biome-ignore lint/correctness/useExhaustiveDependencies: `icon` novo faz o Leaflet trocar o elemento do marcador
  useEffect(() => {
    decorateMarkerElement(
      ref.current?.getElement(),
      { id, label },
      { active: highlighted, expanded: hasPopup ? expanded : null },
    );
  }, [id, label, highlighted, hasPopup, expanded, icon]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `icon` novo faz o Leaflet trocar o elemento do marcador
  useEffect(() => {
    const element = ref.current?.getElement();
    if (!element) return;
    const enter = () => notifyActive(id);
    const leave = () => notifyActive(null);
    // O Leaflet abre o popup no `keypress` Enter; o Espaço (botão) abre da mesma forma, sem rolar a página.
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") ref.current?.closePopup();
      if (event.key === " " && hasPopup) {
        event.preventDefault();
        ref.current?.togglePopup();
      }
      if (event.key === "Enter" || event.key === " ") notifySelect();
    };
    element.addEventListener("focus", enter);
    element.addEventListener("blur", leave);
    element.addEventListener("keydown", onKeyDown);
    return () => {
      element.removeEventListener("focus", enter);
      element.removeEventListener("blur", leave);
      element.removeEventListener("keydown", onKeyDown);
    };
  }, [id, hasPopup, icon]);

  /** Fecha por clique fora ou pela API: se o foco ficou no popup (ou no `body`), volta ao marcador. */
  const onPopupClose = (event: PopupEvent) => {
    setExpanded(false);
    const focused = document.activeElement;
    const insidePopup = Boolean(event.popup.getElement()?.contains(focused));
    if (insidePopup || focused === document.body) ref.current?.getElement()?.focus();
  };

  const closeTo = useCallback((focusTo: "marker" | "next") => {
    const element = ref.current?.getElement();
    ref.current?.closePopup();
    (focusTo === "next" ? nextMarkerElement(element) : element)?.focus();
  }, []);

  // Elemento estável entre renders: o react-leaflet refaz o popup a cada `children` novo e o marcador
  // re-renderiza a cada hover/foco.
  const popupContent = useMemo(
    () =>
      renderPopup ? (
        <PopupBody
          titleId={titleId}
          openCount={openCount}
          closeLabel={closeLabel}
          onClose={closeTo}
        >
          {renderPopup(id, { close: () => closeTo("marker"), titleId })}
        </PopupBody>
      ) : null,
    [renderPopup, id, titleId, openCount, closeLabel, closeTo],
  );

  return (
    <Marker
      ref={ref}
      position={position}
      icon={icon}
      keyboard
      zIndexOffset={highlighted ? 1000 : 0}
      eventHandlers={{
        click: () => onSelect?.(id),
        mouseover: () => onActiveChange?.(id),
        mouseout: () => onActiveChange?.(null),
        popupopen: () => {
          setExpanded(true);
          setOpenCount((count) => count + 1);
        },
        popupclose: onPopupClose,
      }}
    >
      {popupContent ? (
        <Popup
          closeButton={false}
          minWidth={224}
          maxWidth={224}
          autoPanPaddingTopLeft={[56, 8]}
          autoPanPaddingBottomRight={[8, 24]}
        >
          {popupContent}
        </Popup>
      ) : null}
    </Marker>
  );
});
