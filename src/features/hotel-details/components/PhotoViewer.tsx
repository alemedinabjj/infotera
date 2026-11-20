"use client";

import { useEffect, useId } from "react";
import { useLocale } from "@/shared/i18n/client";
import type { Locale } from "@/shared/i18n/config";
import { usePhotoViewer } from "../hooks/usePhotoViewer";
import { useSwipe } from "../hooks/useSwipe";
import { photoAlt } from "../model/gallery";
import { photoPageTitle } from "../model/photo-route";
import { PhotoControls } from "./PhotoControls";
import { PhotoFrame, PhotoNeighbors } from "./PhotoFrame";

type PhotoViewerProps = {
  hotelId: number;
  name: string;
  images: readonly string[];
  initialIndex: number;
  /** `id` do h1 da página: rotula o grupo do visualizador. */
  headingId: string;
};

/**
 * Visualizador da **página cheia** da foto (tema claro, dentro do layout). ←/→/Home/End com foco em
 * qualquer controle trocam a foto (o `onKeyDown` fica no grupo; não capturamos o documento, as setas
 * seguem rolando a página). A URL e o título da aba acompanham a foto, sem `<Link>` entre fotos
 * (um link seria interceptado e abriria o modal por cima da própria página).
 */
export const PhotoViewer = ({
  hotelId,
  name,
  images,
  initialIndex,
  headingId,
}: PhotoViewerProps) => {
  const locale: Locale = useLocale();
  const total = images.length;
  const viewer = usePhotoViewer({ hotelId, total, initialIndex, locale });
  const swipe = useSwipe(viewer.go);
  const src = images[viewer.index];
  const several = total > 1;
  const counterId = useId();

  useEffect(() => {
    document.title = photoPageTitle(
      { kind: "photo", hotel: name, index: viewer.index, total },
      locale,
    );
  }, [viewer.index, name, total, locale]);

  return (
    // biome-ignore lint/a11y/useSemanticElements: grupo rotulado pelo h1; <fieldset> seria semântica de formulário
    <div
      role="group"
      aria-labelledby={headingId}
      aria-describedby={counterId}
      onKeyDown={viewer.onKeyDown}
      className="flex w-full flex-col gap-4"
    >
      <div
        className="relative aspect-[4/3] w-full touch-pan-y overflow-hidden rounded-card bg-fg sm:aspect-video"
        {...(several ? swipe : {})}
      >
        {src ? (
          <PhotoFrame key={src} src={src} alt={photoAlt(name, viewer.index, total, locale)} />
        ) : null}
      </div>
      {several ? (
        <PhotoControls
          index={viewer.index}
          total={total}
          onGo={viewer.go}
          variant="secondary"
          counterId={counterId}
        />
      ) : null}
      {several ? <PhotoNeighbors images={images} index={viewer.index} /> : null}
    </div>
  );
};
