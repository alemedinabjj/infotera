import { ErrorState } from "@/shared/ui";

type ResultsErrorProps = { onRetry: () => void; retrying: boolean };

/** Erro da lista: mensagem fixa (nunca o texto da API) + "Tentar de novo". */
export const ResultsError = ({ onRetry, retrying }: ResultsErrorProps) => (
  <ErrorState
    title="Não foi possível carregar os hotéis"
    description="Verifique sua conexão e tente de novo."
    onRetry={onRetry}
    retrying={retrying}
    headingLevel={2}
  />
);
