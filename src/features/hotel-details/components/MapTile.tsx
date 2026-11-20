"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type MapTileProps = {
  src: string;
  /** Posição e tamanho em % do mapa (de `staticMapLayout`). */
  style: { left: string; top: string; width: string; height: string };
};

/**
 * Tile do mapa: só fica visível depois de carregar. Tile que falha continua invisível e sobra o
 * fundo cinza com o marcador (o navegador desenharia um ícone de imagem quebrada). A imagem pode
 * terminar de carregar antes da hidratação (o `onLoad` não dispara de novo), então a montagem
 * confere `complete`.
 */
export const MapTile = ({ src, style }: MapTileProps) => {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const image = ref.current;
    if (image?.complete && image.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    <Image
      ref={ref}
      src={src}
      alt=""
      width={256}
      height={256}
      unoptimized
      className={loaded ? "absolute max-w-none" : "invisible absolute max-w-none"}
      style={style}
      onLoad={() => setLoaded(true)}
      onError={() => setLoaded(false)}
    />
  );
};
