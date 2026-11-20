"use client";

import { useId } from "react";
import { useLocale } from "@/shared/i18n/client";
import { Dialog } from "@/shared/ui";
import { useCloseOnce } from "../hooks/useCloseOnce";
import { useHotelDetailsMessages } from "../hooks/useHotelDetailsMessages";
import { usePhotoViewer } from "../hooks/usePhotoViewer";
import { useSwipe } from "../hooks/useSwipe";
import { photoAlt } from "../model/gallery";
import { PhotoControls } from "./PhotoControls";
import { PhotoFrame, PhotoNeighbors } from "./PhotoFrame";

type PhotoModalProps = {
  hotelId: number;
  name: string;
  images: readonly string[];
  /** Índice (base 0) da foto da URL. */
  initialIndex: number;
};

/**
 * Galeria como **modal por rota interceptada** (`Dialog size="full"`). Esc, "Fechar" e Voltar do
 * navegador fazem a mesma coisa: o modal some e o foco volta à foto que o abriu. Fechar anima a saída,
 * fecha o `<dialog>`, devolve o foco e só então faz `router.back()`, no máximo **uma vez** (Esc duas
 * vezes não pode voltar duas entradas e tirar a pessoa do hotel). Voltar do navegador desmonta o modal
 * sem passar por aqui: o cleanup de `usePhotoOpener` devolve o foco.
 */
export const PhotoModal = ({ hotelId, name, images, initialIndex }: PhotoModalProps) => {
  const t = useHotelDetailsMessages().gallery;
  const locale = useLocale();
  const total = images.length;
  const viewer = usePhotoViewer({ hotelId, total, initialIndex, locale });
  const swipe = useSwipe(viewer.go);
  const { open, requestClose, onClosed } = useCloseOnce();
  const counterId = useId();
  const src = images[viewer.index];
  const several = total > 1;

  return (
    <Dialog
      open={open}
      onClose={requestClose}
      onClosed={onClosed}
      onKeyDown={viewer.onKeyDown}
      size="full"
      title={t.lightboxTitle({ name })}
      describedBy={several ? counterId : undefined}
      initialFocus={several ? "[data-photo-next]" : undefined}
      footer={
        several ? (
          <PhotoControls
            index={viewer.index}
            total={total}
            onGo={viewer.go}
            variant="overlay"
            counterId={counterId}
            className="w-full"
          />
        ) : undefined
      }
    >
      {src ? (
        // `touch-pan-y`: o gesto horizontal chega ao componente (troca de foto) sem rolar a página.
        <div className="size-full touch-pan-y" {...(several ? swipe : {})}>
          <PhotoFrame key={src} src={src} alt={photoAlt(name, viewer.index, total, locale)} />
        </div>
      ) : null}
      {several ? <PhotoNeighbors images={images} index={viewer.index} /> : null}
    </Dialog>
  );
};
