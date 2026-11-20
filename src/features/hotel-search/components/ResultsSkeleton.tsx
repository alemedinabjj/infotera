import { HotelCardSkeleton } from "./HotelCardSkeleton";

const PLACEHOLDERS = ["a", "b", "c", "d"] as const;

/** 4 cards-esqueleto. O contêiner é `aria-busy`; o texto de carregamento vem do anunciador. */
export const ResultsSkeleton = () => (
  <ul aria-busy="true" className="flex flex-col gap-4 lg:gap-6">
    {PLACEHOLDERS.map((key) => (
      <HotelCardSkeleton key={key} />
    ))}
  </ul>
);
