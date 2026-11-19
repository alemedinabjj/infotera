type SkipLinkProps = { targetId?: string; label?: string };

/** Primeiro elemento focável da página: pula direto para o conteúdo principal. */
export const SkipLink = ({
  targetId = "main-content",
  label = "Pular para o conteúdo",
}: SkipLinkProps) => (
  <a
    href={`#${targetId}`}
    className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-3 focus:font-medium focus:text-primary focus:shadow-raised"
  >
    {label}
  </a>
);
