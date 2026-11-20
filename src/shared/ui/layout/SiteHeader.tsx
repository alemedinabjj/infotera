import Link from "next/link";
import type { ReactNode } from "react";

type SiteHeaderProps = {
  /** Nome acessível do logo ("Infotera Hotéis, página inicial"), no idioma da página. */
  homeLabel: string;
  /** Link do logo (home do idioma). */
  homeHref: string;
  /** Links de ação à direita (ex.: `SavedNav`, client). O cabeçalho continua Server Component. */
  actions?: ReactNode;
};

/** Cabeçalho global (Server Component): logo com link para a busca e slot de ações. */
export const SiteHeader = ({ actions, homeLabel, homeHref }: SiteHeaderProps) => (
  <header className="sticky top-0 z-20 border-b border-border bg-surface print:hidden">
    <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-4 md:px-6 lg:h-16 xl:px-8">
      <Link
        href={homeHref}
        aria-label={homeLabel}
        className="rounded-control text-lg font-bold text-fg hover:text-primary"
      >
        Infotera Hotéis
      </Link>
      {actions}
    </div>
  </header>
);
