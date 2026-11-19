import type { MouseEventHandler } from "react";

type SkipLinkProps = {
  targetId?: string;
  label?: string;
  /** Troca o salto padrão por âncora (ex.: focar um título sem alterar a URL). */
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

/** Primeiro elemento focável da página: pula direto para o conteúdo principal. */
export const SkipLink = ({
  targetId = "main-content",
  label = "Pular para o conteúdo",
  onClick,
}: SkipLinkProps) => (
  <a
    href={`#${targetId}`}
    onClick={onClick}
    className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-3 focus:font-medium focus:text-primary focus:shadow-raised"
  >
    {label}
  </a>
);
