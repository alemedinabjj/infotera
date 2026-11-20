"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { markPhotoOpener } from "../hooks/usePhotoOpener";

type PhotoLinkProps = {
  href: string;
  label: string;
  className?: string;
  /** A foto principal: destino do foco quando o link de origem não existe mais. */
  main?: boolean;
  children: ReactNode;
};

/**
 * Link de uma foto da galeria. `scroll={false}` abre o modal sem rolar a página; o clique registra o
 * link como gatilho (para o foco voltar a ele ao fechar). Sem JS é um link comum: abre a página cheia.
 */
export const PhotoLink = ({ href, label, className, main, children }: PhotoLinkProps) => (
  <Link
    href={href}
    scroll={false}
    aria-label={label}
    data-photo-main={main ? "" : undefined}
    className={className}
    onClick={(event) => markPhotoOpener(event.currentTarget)}
  >
    {children}
  </Link>
);
