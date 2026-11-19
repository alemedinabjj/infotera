import Link from "next/link";

/** Cabeçalho global (Server Component): logo com link para a busca. */
export const SiteHeader = () => (
  <header className="sticky top-0 z-20 border-b border-border bg-surface print:hidden">
    <div className="mx-auto flex h-14 w-full max-w-6xl items-center px-4 md:px-6 lg:h-16 xl:px-8">
      <Link
        href="/"
        aria-label="Infotera Hotéis, página inicial"
        className="rounded-control text-lg font-bold text-fg hover:text-primary"
      >
        Infotera Hotéis
      </Link>
    </div>
  </header>
);
