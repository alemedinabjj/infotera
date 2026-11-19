import type { ReactNode } from "react";
import { cardClassName } from "@/shared/ui";

type ReceiptSectionProps = {
  /** Id do `h2`: a seção é nomeada por ele (`aria-labelledby`). */
  titleId: string;
  title: string;
  /** `h2` focável (`tabindex="-1"`): alvo de foco quando o conteúdo em streaming troca o botão. */
  focusable?: boolean;
  children: ReactNode;
};

/** Bloco do recibo: `<section>` num card estático, com `h2` fora de qualquer Suspense. */
export const ReceiptSection = ({
  titleId,
  title,
  focusable = false,
  children,
}: ReceiptSectionProps) => (
  <section
    aria-labelledby={titleId}
    className={cardClassName({
      className: "gap-4 p-4 md:p-5 print:break-inside-avoid print:shadow-none",
    })}
  >
    <h2
      id={titleId}
      tabIndex={focusable ? -1 : undefined}
      className="text-xl font-semibold text-fg"
    >
      {title}
    </h2>
    {children}
  </section>
);
