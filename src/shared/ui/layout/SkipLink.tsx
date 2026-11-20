import type { MouseEventHandler } from "react";
import { commonMessages } from "../../i18n/common/messages";
import type { Locale } from "../../i18n/config";

type SkipLinkProps = {
  targetId?: string;
  /** Troca o salto padrão por âncora (ex.: focar um título sem alterar a URL). */
  onClick?: MouseEventHandler<HTMLAnchorElement>;
} & (
  | {
      /** Rótulo já traduzido por quem chama (salto para uma região específica). */
      label: string;
      locale?: never;
    }
  | {
      /** Sem `label`: o rótulo padrão ("Pular para o conteúdo") vem do dicionário do `locale`. */
      locale: Locale;
      label?: never;
    }
);

/** Primeiro elemento focável da página: pula direto para o conteúdo principal. */
export const SkipLink = ({ locale, targetId = "main-content", label, onClick }: SkipLinkProps) => (
  <a
    href={`#${targetId}`}
    onClick={onClick}
    className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-3 focus:font-medium focus:text-primary focus:shadow-raised"
  >
    {label ?? commonMessages.get(locale).ui.skipToContent}
  </a>
);
