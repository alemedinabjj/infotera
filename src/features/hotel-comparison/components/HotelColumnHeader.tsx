"use client";

import Link from "next/link";
import type { Hotel } from "@/shared/api/schemas";
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
  return (
    <div className="flex min-w-36 flex-col gap-2 font-normal">
      <RemoteImage
        src={hotel.thumbnail}
        alt=""
        sizes="(min-width: 1024px) 20vw, 40vw"
        className="aspect-[4/3] w-full rounded-control"
      />
      <div className="flex items-start justify-between gap-1">
        <Link
          href={hotelHref(hotel.id, criteria)}
          className="font-semibold text-fg hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {hotel.name}
        </Link>
        <FavoriteButton hotelId={hotel.id} hotelName={hotel.name} className="-mt-2 -mr-2" />
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-fit"
        aria-label={MESSAGES.removeLabel(hotel.name)}
        onClick={() => onRemove(hotel.id)}
      >
        {MESSAGES.remove}
      </Button>
    </div>
  );
};
