import Link from "next/link";
import type { ReactNode } from "react";

type SiteHeaderProps = {
  /** Links de ação à direita (ex.: `SavedNav`, client). O cabeçalho continua Server Component. */
  actions?: ReactNode;
};

/** Cabeçalho global (Server Component): logo com link para a busca e slot de ações. */
export const SiteHeader = ({ actions }: SiteHeaderProps) => (
  <header className="sticky top-0 z-20 border-b border-border bg-surface print:hidden">
    <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-4 md:px-6 lg:h-16 xl:px-8">
      <Link
        href="/"
        aria-label="Infotera Hotéis, página inicial"
        className="rounded-control text-lg font-bold text-fg hover:text-primary"
      >
        Infotera Hotéis
      </Link>
      {actions}
    </div>
  </header>
);
