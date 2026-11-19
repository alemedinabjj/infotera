"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/shared/lib/cn";
import { BedIcon } from "@/shared/ui";
import { BLUR_DATA_URL, CARD_IMAGE_SIZES, unsplashLoader } from "../model/image";

type HotelImageProps = {
  src: string;
  /** Nome do hotel (alt). */
  alt: string;
  /** Esgotado: foto em tons de cinza. */
  muted?: boolean;
  /** Primeiro card da lista: carrega já (LCP). */
  eager?: boolean;
};

/** Foto 4:3 do card. Imagem quebrada vira bloco cinza com ícone, do mesmo tamanho. */
export const HotelImage = ({ src, alt, muted = false, eager = false }: HotelImageProps) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-surface-sunken sm:aspect-auto sm:min-h-42 sm:w-56">
      {failed ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <BedIcon aria-hidden="true" className="size-8 text-fg-subtle" />
        </span>
      ) : (
        <Image
          loader={unsplashLoader}
          src={src}
          alt={alt}
          fill
          sizes={CARD_IMAGE_SIZES}
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          onError={() => setFailed(true)}
          className={cn("object-cover", muted && "opacity-70 grayscale")}
        />
      )}
    </div>
  );
};
