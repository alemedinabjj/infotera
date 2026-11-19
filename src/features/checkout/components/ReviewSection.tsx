import { type ReactNode, useId } from "react";
import { Button } from "@/shared/ui";

type ReviewSectionProps = {
  title: string;
  /** Sem `onEdit`, a seção não tem "Editar" (ex.: a estadia muda no hotel). */
  onEdit?: () => void;
  /** Complemento sr-only do nome do botão ("hóspedes", "pagamento"). */
  editLabel?: string;
  className?: string;
  children: ReactNode;
};

/** `<section aria-labelledby>` com h3 e "Editar" alinhado à direita. */
export const ReviewSection = ({
  title,
  onEdit,
  editLabel,
  className,
  children,
}: ReviewSectionProps) => {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={`flex flex-col gap-2 border-t border-border pt-5 ${className ?? ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 id={id} className="text-lg font-semibold text-fg">
          {title}
        </h3>
        {onEdit ? (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Editar<span className="sr-only"> {editLabel}</span>
          </Button>
        ) : null}
      </div>
      {children}
    </section>
  );
};
