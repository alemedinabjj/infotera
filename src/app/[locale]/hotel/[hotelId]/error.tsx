"use client";

import Link from "next/link";
import { useLocale } from "@/shared/i18n/client";
import { useCommonMessages } from "@/shared/i18n/common/useCommonMessages";
import { localizePath } from "@/shared/i18n/paths";
import { buttonClassName, ErrorState } from "@/shared/ui";

type HotelErrorProps = { error: unknown; retry: () => void };

/**
 * Erro inesperado ao abrir o hotel (500, timeout). Só importa `@/shared/ui`: o `index.ts` da
 * feature levaria o código de servidor (`loadHotel`) para o bundle do cliente.
 */
const HotelError = ({ retry }: HotelErrorProps) => {
  const t = useCommonMessages().routes;
  const locale = useLocale();
  return (
    <ErrorState
      variant="page"
      headingLevel={1}
      title={t.hotelError}
      description={t.tryOrSearch}
      onRetry={retry}
      action={
        <Link href={localizePath(locale, "/")} className={buttonClassName({ variant: "ghost" })}>
          {t.newSearch}
        </Link>
      }
    />
  );
};

export default HotelError;
