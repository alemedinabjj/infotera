import Link from "next/link";
import type { Locale } from "@/shared/i18n/config";
import { localizePath } from "@/shared/i18n/paths";
import { buttonClassName, EmptyState } from "@/shared/ui";
import { hotelDetailsMessages } from "../i18n/messages";

type PhotoNotFoundViewProps = {
  locale: Locale;
  /** Id do hotel já validado; sem ele (id inválido) não há para onde voltar. */
  hotelId: number | null;
};

/**
 * "Foto não encontrada" (índice fora de `1..total`, `0`, `abc`, `01`). Não linka para outra foto: um
 * `<Link>` de `/photos/abc` para `/photos/1` seria interceptado e abriria o modal por cima da página de
 * erro. Sem estado nem hook: a página renderiza no servidor (HTML com h1 e link sem JavaScript) e o
 * `not-found.tsx` a reaproveita no cliente.
 */
export const PhotoNotFoundView = ({ locale, hotelId }: PhotoNotFoundViewProps) => {
  const t = hotelDetailsMessages.get(locale).photoPage;
  return (
    <EmptyState
      headingLevel={1}
      title={t.notFoundTitle}
      description={t.notFoundBody}
      action={
        hotelId === null ? undefined : (
          <Link
            href={localizePath(locale, `/hotel/${hotelId}`)}
            className={buttonClassName({ variant: "primary" })}
          >
            {t.viewHotel}
          </Link>
        )
      }
    />
  );
};
