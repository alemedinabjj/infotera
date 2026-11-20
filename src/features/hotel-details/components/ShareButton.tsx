"use client";

import { Button, copyCurrentUrl, LinkIcon } from "@/shared/ui";

/**
 * Copia a URL atual (com os critérios da busca); o toast avisa o resultado. Abaixo de ~360px só o
 * ícone fica à vista (o texto segue no nome acessível), para caber ao lado de "Ver quartos".
 */
export const ShareButton = () => (
  <Button variant="ghost" leftIcon={<LinkIcon className="size-5" />} onClick={copyCurrentUrl}>
    <span className="max-[22.5rem]:sr-only">Copiar link</span>
  </Button>
);
