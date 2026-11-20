"use client";

type DistanceHelpProps = { id: string; destination: string };

/** Explica o que é o "centro" da ordenação por distância (só aparece com `sort=distance`). */
export const DistanceHelp = ({ id, destination }: DistanceHelpProps) => {
  const t = useHotelSearchMessages().distance;
  return (
    <p id={id} className="text-sm text-fg-muted">
      {t.helpLine({ destination })}
    </p>
  );
};

import { useHotelSearchMessages } from "../hooks/useHotelSearchMessages";
