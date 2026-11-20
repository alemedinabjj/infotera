"use client";

import Link from "next/link";
import type { Hotel } from "@/shared/api/schemas";
import { useLocale } from "@/shared/i18n/client";
import { localizePath } from "@/shared/i18n/paths";
import { hotelHref } from "@/shared/lib/links";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { FavoriteButton } from "@/shared/saved";
import { Button, RemoteImage } from "@/shared/ui";
import { useComparisonMessages } from "../hooks/useComparisonMessages";

type HotelColumnHeaderProps = {
  hotel: Hotel;
  /** Busca de origem: o link abre o hotel com as mesmas datas. */
  criteria: SearchCriteria | null;
  onRemove: (id: number) => void;
};

/** Cabeçalho de coluna: foto, nome (link para o hotel), coração e "Remover". */
export const HotelColumnHeader = ({ hotel, criteria, onRemove }: HotelColumnHeaderProps) => {
  const MESSAGES = useComparisonMessages();
  const locale = useLocale();
  return (
    <div className="flex min-w-0 flex-col gap-2 font-normal">
      <RemoteImage
        src={hotel.thumbnail}
        alt=""
        sizes="(min-width: 1024px) 20vw, 40vw"
        className="aspect-[4/3] w-full rounded-control"
      />
      <Link
        href={localizePath(locale, hotelHref(hotel.id, criteria))}
        className="min-w-0 font-semibold break-words text-fg hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {hotel.name}
      </Link>
      {/* Linha própria e com quebra: a coluna tem ~104 px em 320 px e o coração (44 px) não pode
          cobrir o link do vizinho (WCAG 2.5.8, tamanho e espaço dos alvos). */}
      <div className="flex flex-wrap items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          aria-label={MESSAGES.removeLabel(hotel.name)}
          onClick={() => onRemove(hotel.id)}
        >
          {MESSAGES.remove}
        </Button>
        <FavoriteButton hotelId={hotel.id} hotelName={hotel.name} />
      </div>
    </div>
  );
};
