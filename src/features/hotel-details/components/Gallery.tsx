"use client";

import { cn } from "@/shared/lib/cn";
import { Button, RemoteImage } from "@/shared/ui";
import { useLightbox } from "../hooks/useLightbox";
import { galleryPreview, mainPhotoSpan, photoOpenLabel, thumbPlacement } from "../model/gallery";
import { Lightbox } from "./Lightbox";

type GalleryProps = { name: string; images: readonly string[] };

type PhotoButtonProps = {
  src: string;
  label: string;
  className?: string;
  priority?: boolean;
  sizes: string;
  /** Faixa `+3 fotos` sobre a foto. */
  extra?: string;
  onOpen: () => void;
};

const PhotoButton = ({
  src,
  label,
  className,
  priority,
  sizes,
  extra,
  onOpen,
}: PhotoButtonProps) => (
  <button
    type="button"
    aria-label={label}
    onClick={onOpen}
    className={cn(
      "relative block overflow-hidden rounded-card transition-[filter] duration-150 hover:brightness-95",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
      className,
    )}
  >
    <RemoteImage src={src} alt="" sizes={sizes} priority={priority} className="size-full" />
    {extra ? (
      <span className="absolute inset-x-0 bottom-0 bg-overlay/60 py-1 text-center text-sm font-semibold text-fg-on-primary">
        {extra}
      </span>
    ) : null}
  </button>
);

const MAIN_SIZES = "(min-width: 1152px) 560px, (min-width: 640px) 50vw, 100vw";
const THUMB_SIZES = "(min-width: 1152px) 280px, 25vw";

/**
 * Foto principal + até 4 miniaturas (`sm+`) e "Ver todas as fotos". Cada foto é um botão que abre
 * o lightbox nela; as miniaturas carregam sob demanda e não baixam no celular (`hidden`).
 */
export const Gallery = ({ name, images }: GalleryProps) => {
  const total = images.length;
  const lightbox = useLightbox(total);
  const preview = galleryPreview(total);
  const [main] = images;
  if (main === undefined) return null;

  return (
    <div className="relative">
      <div className="grid gap-2 sm:h-72 sm:grid-cols-4 sm:grid-rows-2 lg:h-96">
        <PhotoButton
          src={main}
          label={photoOpenLabel(0, total)}
          sizes={MAIN_SIZES}
          priority
          className={cn("aspect-video sm:aspect-auto", mainPhotoSpan(preview.thumbs.length))}
          onOpen={() => lightbox.openAt(0)}
        />
        {preview.thumbs.map((photoIndex, position) => (
          <PhotoButton
            key={photoIndex}
            src={images[photoIndex] ?? main}
            label={photoOpenLabel(photoIndex, total)}
            sizes={THUMB_SIZES}
            extra={
              position === preview.thumbs.length - 1 && preview.hiddenCount > 0
                ? `+${preview.hiddenCount} ${preview.hiddenCount === 1 ? "foto" : "fotos"}`
                : undefined
            }
            className={cn("hidden sm:block", thumbPlacement(preview.thumbs.length, position))}
            onOpen={() => lightbox.openAt(photoIndex)}
          />
        ))}
      </div>
      {total > 1 ? (
        <Button
          variant="secondary"
          size="sm"
          className="absolute right-3 bottom-3"
          onClick={() => lightbox.openAt(0)}
        >
          Ver todas as fotos ({total})
        </Button>
      ) : null}
      <Lightbox
        name={name}
        images={images}
        open={lightbox.open}
        index={lightbox.index}
        onClose={lightbox.close}
        onGo={lightbox.go}
        onKeyDown={lightbox.onKeyDown}
      />
    </div>
  );
};
