"use client";

import { Button, copyCurrentUrl, LinkIcon } from "@/shared/ui";

/** Copia a URL atual (com os critérios da busca); o toast avisa o resultado. */
export const ShareButton = () => (
  <Button variant="ghost" leftIcon={<LinkIcon className="size-5" />} onClick={copyCurrentUrl}>
    Copiar link
  </Button>
);
