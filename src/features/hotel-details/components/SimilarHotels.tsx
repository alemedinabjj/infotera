import Link from "next/link";
import { isApiError } from "@/shared/api/http";
import type { Hotel } from "@/shared/api/schemas";
import { searchHref } from "@/shared/lib/links";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { buttonClassName, CompactHotelCard } from "@/shared/ui";
import { fetchSimilarHotels } from "../api/similar";

type SimilarHotelsProps = {
  hotelId: number;
  destination: string;
  criteria: SearchCriteria | null;
};

const LINK = "w-fit font-medium text-primary hover:underline";

const logFailure = (hotelId: number, error: unknown): void => {
  console.error("[hotel-details] similar hotels failed", {
    hotelId,
    kind: isApiError(error) ? error.kind : "unknown",
    status: isApiError(error) ? error.status : null,
  });
};

/**
 * Hotéis do mesmo destino, sem JS (RSC assíncrono sob Suspense). É recomendação: se falhar, a
 * página não cai nem pede retry; mostra um texto e um link para a lista do destino.
 */
export const SimilarHotels = async ({ hotelId, destination, criteria }: SimilarHotelsProps) => {
  let hotels: Hotel[];
  try {
    hotels = await fetchSimilarHotels(destination, hotelId);
  } catch (error) {
    logFailure(hotelId, error);
    return (
      <div className="flex flex-col items-start gap-1 text-fg-muted">
        <p>Não foi possível carregar hotéis similares.</p>
        <Link href={searchHref(destination, criteria)} className={LINK}>
          Ver hotéis em {destination}
        </Link>
      </div>
    );
  }

  if (hotels.length === 0) {
    return (
      <div className="flex flex-col items-start gap-1 text-fg-muted">
        <p>Nenhum outro hotel em {destination}.</p>
        <Link href="/" className={buttonClassName({ variant: "secondary" })}>
          Fazer nova busca
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
      {hotels.map((hotel) => (
        <li key={hotel.id} className="flex">
          <CompactHotelCard hotel={hotel} criteria={criteria} />
        </li>
      ))}
    </ul>
  );
};
