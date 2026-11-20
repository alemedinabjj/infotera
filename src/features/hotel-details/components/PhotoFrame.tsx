"use client";

import { useState } from "react";
import { BedIcon, RemoteImage, Spinner } from "@/shared/ui";
import { useHotelDetailsMessages } from "../hooks/useHotelDetailsMessages";

type PhotoFrameProps = { src: string; alt: string };

const Overlay = ({ children }: { children: React.ReactNode }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-fg-on-primary">
    {children}
  </div>
);

/**
 * Foto inteira (`object-contain`) com estado próprio: carregando (spinner + texto) e quebrada
 * (ícone + texto, as setas continuam). Montar com `key` = foto para reiniciar o estado. Serve ao modal
 * (fundo `bg-fg` em tela cheia) e à página cheia da foto.
 */
export const PhotoFrame = ({ src, alt }: PhotoFrameProps) => {
  const t = useHotelDetailsMessages().gallery;
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">("loading");
  return (
    <div className="relative size-full">
      <RemoteImage
        src={src}
        alt={alt}
        sizes="100vw"
        fit="contain"
        blur={false}
        priority
        className="size-full bg-fg"
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("failed")}
        fallback={
          <Overlay>
            <BedIcon aria-hidden="true" className="size-8" />
            <p>{t.failed}</p>
          </Overlay>
        }
      />
      {status === "loading" ? (
        <Overlay>
          <Spinner />
          <p>{t.loading}</p>
        </Overlay>
      ) : null}
    </div>
  );
};

/** Fotos vizinhas, carregadas escondidas para a troca ser instantânea (sem duplicar com 2 fotos). */
export const PhotoNeighbors = ({ images, index }: { images: readonly string[]; index: number }) => {
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
