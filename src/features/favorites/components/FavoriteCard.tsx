"use client";

import { m, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Hotel } from "@/shared/api/schemas";
import { cn } from "@/shared/lib/cn";
import { focusWhenReady } from "@/shared/lib/focus";
import { useLastSearch } from "@/shared/lib/last-search";
import { motionPreset, staggerDelay } from "@/shared/lib/motion";
import {
  CompareCheckbox,
  FavoriteButton,
  type FavoriteEntry,
  favoritesActions,
  useIsFavorite,
} from "@/shared/saved";
import { CompactHotelCard, PriceTag, Skeleton } from "@/shared/ui";
import type { PriceState } from "../model/favorites-view";
import { FAVORITES_MESSAGES } from "../model/messages";
import { RemovedFavorite } from "./RemovedFavorite";

type FavoriteCardProps = {
  hotel: Hotel;
  entry: FavoriteEntry | undefined;
  index: number;
  price: PriceState;
};

/** "a partir de" pelos quartos, como na busca e na comparação (o `pricePerNight` do hotel diverge). */
const CardPrice = ({ price }: { price: PriceState }) => {
  switch (price.state) {
    case "loading":
      return <Skeleton className="h-5 w-36" />;
    case "ready":
      return <PriceTag variant="nightly-line" nightly={price.nightly} />;
    case "unavailable":
      return <p className="text-sm text-fg-subtle">{FAVORITES_MESSAGES.priceUnavailable}</p>;
    default: {
      const unreachable: never = price;
      return unreachable;
    }
  }
};

type FocusTarget = "undo" | "heart" | null;

/**
 * Card da página de favoritos. Desfavoritar troca o conteúdo por um "fantasma" na mesma célula do
 * grid (o card original segue renderizado, `invisible` + `inert`): a altura é a mesma e nada
 * abaixo se move. O foco vai para "Desfazer" e, ao desfazer, volta ao coração.
 */
export const FavoriteCard = ({ hotel, entry, index, price }: FavoriteCardProps) => {
  const favorite = useIsFavorite(hotel.id);
  const lastSearch = useLastSearch();
  const preset = motionPreset("list-item", useReducedMotion() ?? false);
  const [focus, setFocus] = useState<FocusTarget>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const heartRef = useRef<HTMLButtonElement>(null);

  // Só foca quando o alvo já existe e não está inerte (o estado do store pode chegar depois do clique).
  useEffect(() => {
    if (focus === null || (focus === "undo") === favorite) return;
    // O alvo acabou de sair de `invisible`/`inert`: espera o navegador deixar focar.
    return focusWhenReady(
      () => (focus === "undo" ? undoRef : heartRef).current,
      () => setFocus(null),
    );
  }, [focus, favorite]);

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
          linkCriteria={lastSearch}
          layout="vertical"
          headingLevel={2}
          showDestination
          price={<CardPrice price={price} />}
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
