"use client";

import { m, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Hotel } from "@/shared/api/schemas";
import { cn } from "@/shared/lib/cn";
import { motionPreset, staggerDelay } from "@/shared/lib/motion";
import {
  CompareCheckbox,
  FavoriteButton,
  type FavoriteEntry,
  favoritesActions,
  useIsFavorite,
} from "@/shared/saved";
import { CompactHotelCard } from "@/shared/ui";
import { RemovedFavorite } from "./RemovedFavorite";

type FavoriteCardProps = { hotel: Hotel; entry: FavoriteEntry | undefined; index: number };

type FocusTarget = "undo" | "heart" | null;

/**
 * Card da página de favoritos. Desfavoritar troca o conteúdo por um "fantasma" na mesma célula do
 * grid (o card original segue renderizado, `invisible` + `inert`): a altura é a mesma e nada
 * abaixo se move. O foco vai para "Desfazer" e, ao desfazer, volta ao coração.
 */
export const FavoriteCard = ({ hotel, entry, index }: FavoriteCardProps) => {
  const favorite = useIsFavorite(hotel.id);
  const preset = motionPreset("list-item", useReducedMotion() ?? false);
  const [focus, setFocus] = useState<FocusTarget>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const heartRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (focus === null) return;
    (focus === "undo" ? undoRef : heartRef).current?.focus();
    setFocus(null);
  }, [focus]);

  const undo = () => {
    if (entry) favoritesActions.restore(entry);
    setFocus("heart");
  };

  return (
    <m.li
      initial={preset.initial}
      animate={preset.animate}
      transition={{ ...preset.transition, delay: staggerDelay(index) }}
      className="grid"
    >
      <div
        className={cn("col-start-1 row-start-1 flex", !favorite && "invisible")}
        inert={!favorite}
      >
        <CompactHotelCard
          hotel={hotel}
          criteria={null}
          layout="vertical"
          headingLevel={2}
          showDestination
          media={
            <FavoriteButton
              ref={heartRef}
              hotelId={hotel.id}
              hotelName={hotel.name}
              variant="overlay"
              notify={false}
              onToggle={(result) => result === "removed" && setFocus("undo")}
            />
          }
          actions={<CompareCheckbox hotelId={hotel.id} hotelName={hotel.name} />}
        />
      </div>
      {favorite ? null : <RemovedFavorite name={hotel.name} onUndo={undo} undoRef={undoRef} />}
    </m.li>
  );
};
