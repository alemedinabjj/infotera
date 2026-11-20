"use client";

import { useRouter } from "next/navigation";
import { useOnline } from "@/shared/hooks/useOnline";
import { useHotelDetailsMessages } from "../hooks/useHotelDetailsMessages";
import { PHOTO_RETRY_SELECTOR, photoOpenStatus } from "../model/photo-open-status";
import { PhotoModalFrame } from "./PhotoModalFrame";
import { PhotoOpenError } from "./PhotoOpenError";

type PhotoModalErrorProps = { retry: () => void };

/**
 * Erro ao abrir a foto no modal (RSC 500, rede): mesma moldura do modal, foco inicial em "Tentar de
 * novo". O "Fechar" do cabeçalho faz o mesmo que Esc: volta uma entrada, para o hotel.
 */
export const PhotoModalError = ({ retry }: PhotoModalErrorProps) => {
  const t = useHotelDetailsMessages().gallery;
  const router = useRouter();
  const online = useOnline();
  return (
    <PhotoModalFrame title={t.modalLoadingTitle} initialFocus={PHOTO_RETRY_SELECTOR}>
      <PhotoOpenError
        status={photoOpenStatus(false, online)}
        onRetry={() => {
          retry();
          router.refresh();
        }}
      />
    </PhotoModalFrame>
  );
};
