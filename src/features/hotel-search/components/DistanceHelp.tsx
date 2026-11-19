type DistanceHelpProps = { id: string; destination: string };

/** Explica o que é o "centro" da ordenação por distância (só aparece com `sort=distance`). */
export const DistanceHelp = ({ id, destination }: DistanceHelpProps) => (
  <p id={id} className="text-sm text-fg-muted">
    Distância em linha reta até o ponto médio dos hotéis de {destination}.
  </p>
);
