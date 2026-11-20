"use client";

import { m, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { type Ref, useState } from "react";
import { motionPreset } from "../../lib/motion";
import { IconButton } from "../../ui/atoms/IconButton";
import { HeartIcon } from "../../ui/icons";
import { toast } from "../../ui/toast/toast-store";
import { useSavedMessages } from "../hooks/useSavedMessages";
import type { ToggleResult } from "../model/favorites";
import { FAVORITES_PATH } from "../model/routes";
import { favoritesActions, useFavoritesStore, useIsFavorite } from "../stores/favorites";

type FavoriteButtonProps = {
  hotelId: number;
  hotelName: string;
  variant?: "overlay" | "ghost" | "secondary";
  className?: string;
  /** `false` nas páginas pessoais (favoritos): o desfazer é inline e não há toast. */
  notify?: boolean;
  /** Avisa o resultado do clique (ex.: levar o foco ao "Desfazer"). */
  onToggle?: (result: ToggleResult) => void;
  ref?: Ref<HTMLButtonElement>;
};

/**
 * Coração de favoritar: `aria-pressed`, nome fixo ("Salvar nos favoritos: {nome}") e toast com
 * `key` (clicar várias vezes mantém 1 toast). O pulso do ícone fica dentro da caixa fixa de 44 px:
 * o botão nunca muda de tamanho nem de posição. Fora do link do card (não navega).
 */
export const FavoriteButton = ({
  hotelId,
  hotelName,
  variant = "ghost",
  className,
  notify = true,
  onToggle,
  ref,
}: FavoriteButtonProps) => {
  const MESSAGES = useSavedMessages().favorite;
  const favorite = useIsFavorite(hotelId);
  const router = useRouter();
  const reduced = useReducedMotion() ?? false;
  const [pulses, setPulses] = useState(0);
  const preset = motionPreset("favorite-pulse", reduced);
  const key = `favorite:${hotelId}`;

  const onClick = () => {
    const previous = useFavoritesStore.getState().items.find((entry) => entry.id === hotelId);
    const result = favoritesActions.toggle(hotelId);
    if (result === "added") setPulses((count) => count + 1);
    onToggle?.(result);
    if (!notify) return;
    if (result === "added") {
      toast.success(MESSAGES.added(hotelName), {
        key,
        action: {
          label: MESSAGES.viewAction,
          onClick: () => router.push(FAVORITES_PATH),
          navigates: true,
        },
      });
    } else if (result === "removed" && previous) {
      toast.info(MESSAGES.removed(hotelName), {
        key,
        action: { label: MESSAGES.undoAction, onClick: () => favoritesActions.restore(previous) },
      });
    } else if (result === "limit") {
      toast.info(MESSAGES.limit, { key });
    }
  };

  return (
    <IconButton
      ref={ref}
      variant={variant}
      aria-label={MESSAGES.label(hotelName)}
      aria-pressed={favorite}
      className={className}
      onClick={onClick}
      icon={
        <m.span
          key={pulses}
          initial={pulses > 0 ? preset.initial : false}
          animate={pulses > 0 ? preset.animate : undefined}
          transition={preset.transition}
          className={favorite ? "text-danger" : undefined}
        >
          <HeartIcon filled={favorite} className="size-6" />
        </m.span>
      }
    />
  );
};
