"use client";

import Image from "next/image";
import { type ReactNode, useState } from "react";
import { cn } from "../../lib/cn";
import { BLUR_DATA_URL, unsplashLoader } from "../../lib/image";
import { BedIcon } from "../icons";

type RemoteImageProps = {
  src: string;
  /** Texto alternativo; vazio (`""`) quando um vizinho já nomeia a foto. */
  alt: string;
  /** Atributo `sizes` do `next/image` (largura real da foto em cada breakpoint). */
  sizes: string;
  /** Geometria do contêiner (aspect-ratio, largura): a imagem preenche o bloco. */
  className?: string;
  /** Esgotado: foto em tons de cinza. */
  muted?: boolean;
  /** Foto do topo da página (LCP): carrega já, com prioridade. */
  priority?: boolean;
  /** `cover` (padrão) corta; `contain` mostra a foto inteira (lightbox). */
  fit?: "cover" | "contain";
  /** Avisa que a foto terminou de carregar. */
  onLoad?: () => void;
  /** Conteúdo no lugar da foto quebrada (padrão: ícone `bed` centralizado). */
  fallback?: ReactNode;
};

const DefaultFallback = () => (
  <span className="absolute inset-0 flex items-center justify-center">
    <BedIcon aria-hidden="true" className="size-8 text-fg-subtle" />
  </span>
);

/**
 * Foto remota (`next/image` + loader do Unsplash + blur). Imagem quebrada vira bloco cinza com
 * ícone, do mesmo tamanho (sem layout shift). Quem usa define o tamanho por `className`.
 */
export const RemoteImage = ({
  src,
  alt,
  sizes,
  className,
  muted = false,
  priority = false,
  fit = "cover",
  onLoad,
  fallback,
}: RemoteImageProps) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn("relative overflow-hidden bg-surface-sunken", className)}>
      {failed ? (
        (fallback ?? <DefaultFallback />)
      ) : (
        <Image
          loader={unsplashLoader}
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          onLoad={onLoad}
          onError={() => setFailed(true)}
          className={cn(
            fit === "cover" ? "object-cover" : "object-contain",
            muted && "opacity-70 grayscale",
          )}
        />
      )}
    </div>
  );
};
