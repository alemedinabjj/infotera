"use client";

import { useState } from "react";
import { BedIcon, RemoteImage, Spinner } from "@/shared/ui";

type LightboxPhotoProps = { src: string; alt: string };

const Overlay = ({ children }: { children: React.ReactNode }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-fg-on-primary">
    {children}
  </div>
);

/**
 * Foto inteira (`object-contain`) com estado próprio: carregando (spinner + texto) e quebrada
 * (ícone + texto, as setas continuam). Montar com `key` = foto para reiniciar o estado.
 */
export const LightboxPhoto = ({ src, alt }: LightboxPhotoProps) => {
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
            <p>Não foi possível carregar esta foto.</p>
          </Overlay>
        }
      />
      {status === "loading" ? (
        <Overlay>
          <Spinner />
          <p>Carregando foto…</p>
        </Overlay>
      ) : null}
    </div>
  );
};
