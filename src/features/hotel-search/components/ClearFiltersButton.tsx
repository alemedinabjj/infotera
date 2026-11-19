import { Button } from "@/shared/ui";

type ClearFiltersButtonProps = {
  /** Há filtro ativo? Sem filtro o botão fica `aria-disabled` (continua focável). */
  active: boolean;
  onClear: () => void;
  className?: string;
};

/**
 * "Limpar filtros" sempre montado: some o efeito, não o botão, para o foco não se perder ao limpar.
 */
export const ClearFiltersButton = ({ active, onClear, className }: ClearFiltersButtonProps) => (
  <Button
    variant="ghost"
    size="sm"
    aria-disabled={active ? undefined : true}
    className={className}
    onClick={() => {
      if (active) onClear();
    }}
  >
    Limpar filtros
  </Button>
);
