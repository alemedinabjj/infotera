"use client";

import type { KeyboardEventHandler } from "react";
import { ChevronLeftIcon, ChevronRightIcon, Dialog, IconButton, RemoteImage } from "@/shared/ui";
import { useSwipe } from "../hooks/useSwipe";
import { type GalleryAction, photoAlt, photoCounter } from "../model/gallery";
import { LightboxPhoto } from "./LightboxPhoto";

type LightboxProps = {
  name: string;
  images: readonly string[];
  open: boolean;
  index: number;
  onClose: () => void;
  onGo: (action: GalleryAction) => void;
  onKeyDown: KeyboardEventHandler<HTMLDialogElement>;
};

/** Anel de foco branco: o `primary` sobre o fundo escuro não passa 3:1 (design system §1.1). */
const ARROW = "text-fg";

/** Fotos vizinhas, carregadas escondidas para a troca ser instantânea (sem duplicar com 2 fotos). */
const Neighbors = ({ images, index }: { images: readonly string[]; index: number }) => {
  const total = images.length;
  const indices = [...new Set([(index + 1) % total, (index - 1 + total) % total])].filter(
    (candidate) => candidate !== index,
  );
  return (
    <div hidden>
      {indices.map((candidate) => (
        <RemoteImage
          key={candidate}
          src={images[candidate] ?? ""}
          alt=""
          sizes="100vw"
          blur={false}
          priority
        />
      ))}
    </div>
  );
};

/**
 * Galeria em tela cheia (`Dialog size="full"`). ←/→/Home/End trocam a foto; `Esc`, foco preso e o
 * foco de volta ao botão que abriu vêm do `<dialog>`. Arrastar na horizontal (celular) também troca
 * a foto. Com 1 foto, sem setas, contador nem gesto.
 */
export const Lightbox = ({
  name,
  images,
  open,
  index,
  onClose,
  onGo,
  onKeyDown,
}: LightboxProps) => {
  const total = images.length;
  const src = images[index];
  const several = total > 1;
  const swipe = useSwipe(onGo);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      onKeyDown={onKeyDown}
      size="full"
      title={`Fotos de ${name}`}
      initialFocus={several ? "[data-lightbox-next]" : undefined}
      footer={
        several ? (
          <>
            <IconButton
              aria-label="Foto anterior"
              variant="overlay"
              className={ARROW}
              icon={<ChevronLeftIcon className="size-6" />}
              onClick={() => onGo("prev")}
            />
            <p aria-live="polite" className="w-28 text-center tabular-nums">
              {photoCounter(index, total)}
            </p>
            <IconButton
              aria-label="Próxima foto"
              variant="overlay"
              className={ARROW}
              data-lightbox-next=""
              icon={<ChevronRightIcon className="size-6" />}
              onClick={() => onGo("next")}
            />
          </>
        ) : undefined
      }
    >
      {src ? (
        // `touch-pan-y`: o gesto horizontal chega ao componente (troca de foto) sem rolar a página.
        <div className="size-full touch-pan-y" {...(several ? swipe : {})}>
          <LightboxPhoto key={src} src={src} alt={photoAlt(name, index, total)} />
        </div>
      ) : null}
      {several ? <Neighbors images={images} index={index} /> : null}
    </Dialog>
  );
};
