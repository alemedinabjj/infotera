import { Alert, Button } from "@/shared/ui";

type FiltersErrorProps = { onRetry: () => void };

/** Fallback compacto da seção de filtros: a lista continua funcionando sem eles. */
export const FiltersError = ({ onRetry }: FiltersErrorProps) => (
  <Alert
    tone="danger"
    title="Não foi possível mostrar os filtros."
    action={
      <Button variant="secondary" size="sm" className="self-start" onClick={onRetry}>
        Tentar de novo
      </Button>
    }
  />
);
