import { cn } from "@/shared/lib/cn";
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
    className={cn(
      // Inativo: sem cor de ação, sem fundo, só cinza (sem riscado) e cursor proibido (o botão segue focável).
      "aria-disabled:bg-transparent aria-disabled:text-fg-subtle aria-disabled:opacity-60 aria-disabled:hover:bg-transparent aria-disabled:active:bg-transparent",
      className,
    )}
    onClick={() => {
      if (active) onClear();
    }}
  >
    Limpar filtros
  </Button>
);
