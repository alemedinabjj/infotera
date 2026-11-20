"use client";

import { Spinner } from "@/shared/ui";
import { useHotelDetailsMessages } from "../hooks/useHotelDetailsMessages";
import { PhotoModalFrame } from "./PhotoModalFrame";

/** Corpo do carregamento: `Spinner` e o texto visível, como o `PhotoFrame`. */
export const PhotoLoadingBody = () => {
  const t = useHotelDetailsMessages().gallery;
  return (
    <div
      aria-busy="true"
      className="flex size-full flex-col items-center justify-center gap-2 text-sm"
    >
      <Spinner />
      <p role="status">{t.loading}</p>
    </div>
  );
};

/** Footer vazio: reserva a altura dos controles para a moldura não mexer quando a foto chega. */
export const PhotoLoadingFooter = () => <span aria-hidden="true" />;

/**
 * Carregando a rota da foto (`loading.tsx` do slot): a moldura do modal (título `Fotos do hotel`,
 * "Fechar") com o corpo de carregamento; um bloco claro sobre fundo escuro seria um flash.
 */
export const PhotoModalLoading = () => {
  const t = useHotelDetailsMessages().gallery;
  return (
    <PhotoModalFrame title={t.modalLoadingTitle} footer={<PhotoLoadingFooter />}>
      <PhotoLoadingBody />
    </PhotoModalFrame>
  );
};
