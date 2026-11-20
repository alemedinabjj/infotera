import { BRAND_PRIMARY } from "@/shared/lib/brand";

type IconArtProps = {
  /** Lado do quadrado em px. */
  size: number;
  /** Fração do lado ocupada pelo "i" (o maskable fica na área segura de 80%). */
  scale: number;
};

/**
 * Arte do ícone: o "i" da marca, branco sobre o azul primário, feito só com formas (nada de fonte:
 * o `ImageResponse` não precisa carregar arquivo). Usado por `icon.tsx` e `apple-icon.tsx`.
 */
export const IconArt = ({ size, scale }: IconArtProps) => {
  const glyph = size * scale;
  const dot = glyph * 0.2;
  const bar = { width: glyph * 0.2, height: glyph * 0.5 };
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND_PRIMARY,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          height: glyph,
        }}
      >
        <div style={{ width: dot, height: dot, borderRadius: dot, background: "#ffffff" }} />
        <div style={{ ...bar, borderRadius: bar.width / 2, background: "#ffffff" }} />
      </div>
    </div>
  );
};
