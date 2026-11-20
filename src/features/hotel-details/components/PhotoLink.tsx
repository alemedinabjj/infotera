"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useOnline } from "@/shared/hooks/useOnline";
import { Dialog } from "@/shared/ui";
import { useHotelDetailsMessages } from "../hooks/useHotelDetailsMessages";
import { usePhotoOpening } from "../hooks/usePhotoOpening";
import { PHOTO_RETRY_SELECTOR, photoOpenStatus } from "../model/photo-open-status";
import { PhotoLoadingBody, PhotoLoadingFooter } from "./PhotoModalLoading";
import { PhotoOpenError } from "./PhotoOpenError";

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
 * link como gatilho (para o foco voltar a ele ao fechar), mostra o modal de carregamento na hora e,
 * sem internet, o estado "sem internet" sem navegar (ver `usePhotoOpening`). Sem JS é um link comum:
 * abre a página cheia.
 */
export const PhotoLink = ({ href, label, className, main, children }: PhotoLinkProps) => {
  const t = useHotelDetailsMessages().gallery;
  const online = useOnline();
  const { phase, onClick, dismiss, retry } = usePhotoOpening(href);

  return (
    <>
      <Link
        href={href}
        scroll={false}
        aria-label={label}
        data-photo-main={main ? "" : undefined}
        className={className}
        onClick={onClick}
      >
        {children}
      </Link>
      {/* Montado só enquanto há o que mostrar: sai sem animação, para não disputar o travamento de
          scroll com o modal da rota que assume o lugar. */}
      {phase === "idle" ? null : (
        <Dialog
          open
          size="full"
          title={t.modalLoadingTitle}
          initialFocus={phase === "offline" ? PHOTO_RETRY_SELECTOR : undefined}
          onClose={dismiss}
          footer={phase === "opening" ? <PhotoLoadingFooter /> : undefined}
        >
          {phase === "opening" ? (
            <PhotoLoadingBody />
          ) : (
            <PhotoOpenError status={photoOpenStatus(true, online)} onRetry={retry} />
          )}
        </Dialog>
      )}
    </>
  );
};
