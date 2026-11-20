"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

type RoomSelection = {
  /** Quarto em "Selecionando…" (os demais botões ignoram o clique). */
  pendingRoomId: number | null;
  setPendingRoomId: (roomId: number | null) => void;
};

const RoomSelectionContext = createContext<RoomSelection | null>(null);

/**
 * A seleção em andamento é de **toda a lista**: cada quarto tem a sua ilha (`RoomStayAction`, um
 * Suspense por quarto) e o travamento dos outros botões atravessa as ilhas. Voltar pelo bfcache
 * (`pageshow` persistido) zera o estado.
 */
export const RoomSelectionProvider = ({ children }: { children: ReactNode }) => {
  const [pendingRoomId, setPendingRoomId] = useState<number | null>(null);

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPendingRoomId(null);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const value = useMemo(() => ({ pendingRoomId, setPendingRoomId }), [pendingRoomId]);
  return <RoomSelectionContext value={value}>{children}</RoomSelectionContext>;
};

export const useRoomSelection = (): RoomSelection => {
  const value = useContext(RoomSelectionContext);
  if (value === null) throw new Error("useRoomSelection must be used within RoomSelectionProvider");
  return value;
};
