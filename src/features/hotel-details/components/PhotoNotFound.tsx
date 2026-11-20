"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useLocale } from "@/shared/i18n/client";
import { localizePath } from "@/shared/i18n/paths";
import { buttonClassName, EmptyState } from "@/shared/ui";
import { useHotelDetailsMessages } from "../hooks/useHotelDetailsMessages";
import { parseHotelId } from "../model/hotel-id";

/**
 * 404 da rota da foto (`0`, `abc`, `01`, acima do total): o `not-found.tsx` não recebe `params`, então o
 * id do hotel vem de `useParams`. Não linka para outra foto: um `<Link>` de `/photos/abc` para
 * `/photos/1` seria interceptado e abriria o modal por cima da página de erro.
 */
export const PhotoNotFound = () => {
  const t = useHotelDetailsMessages().photoPage;
  const locale = useLocale();
  const params = useParams<{ hotelId?: string }>();
  const hotelId = parseHotelId(params.hotelId ?? "");
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
