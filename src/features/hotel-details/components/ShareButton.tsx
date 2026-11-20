"use client";

import { useLocale } from "@/shared/i18n/client";
import { Button, copyCurrentUrl, LinkIcon } from "@/shared/ui";
import { useHotelDetailsMessages } from "../hooks/useHotelDetailsMessages";

/**
 * Copia a URL atual (com os critérios da busca); o toast avisa o resultado. Abaixo de ~360px só o
 * ícone fica à vista (o texto segue no nome acessível), para caber ao lado de "Ver quartos".
 */
export const ShareButton = () => {
  const locale = useLocale();
  const t = useHotelDetailsMessages().header;
  return (
    <Button
      variant="ghost"
      leftIcon={<LinkIcon className="size-5" />}
      onClick={() => void copyCurrentUrl(locale)}
    >
      <span className="max-[22.5rem]:sr-only">{t.copyLink}</span>
    </Button>
  );
};
