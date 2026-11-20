import Link from "next/link";
import type { Locale } from "@/shared/i18n/config";
import { localizePath } from "@/shared/i18n/paths";
import { buttonClassName, EmptyState } from "@/shared/ui";
import { hotelDetailsMessages } from "../i18n/messages";

type PhotoNotFoundProps = { locale: Locale; hotelId: number; hotelName: string };

/**
 * Foto fora de `1..total` (`0`, `abc`, `01`). Não linka para outra foto: um `<Link>` de
 * `/photos/abc` para `/photos/1` seria interceptado e abriria o modal por cima da página de erro.
 */
export const PhotoNotFound = ({ locale, hotelId, hotelName }: PhotoNotFoundProps) => {
  const t = hotelDetailsMessages.get(locale).photoPage;
  return (
    <EmptyState
      headingLevel={1}
      title={t.notFoundTitle}
      description={t.notFoundBody({ hotel: hotelName })}
      action={
        <Link
          href={localizePath(locale, `/hotel/${hotelId}`)}
          className={buttonClassName({ variant: "primary" })}
        >
          {t.viewHotel}
        </Link>
      }
    />
  );
};
