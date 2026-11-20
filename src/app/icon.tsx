import { ImageResponse } from "next/og";
import { IconArt } from "./icon-art";

type IconSpec = { id: string; size: number; scale: number };

/** `maskable`: o sistema recorta o ícone (círculo, squircle), então o "i" fica na área segura (80%). */
const ICONS: readonly IconSpec[] = [
  { id: "192", size: 192, scale: 0.7 },
  { id: "512", size: 512, scale: 0.7 },
  { id: "maskable", size: 512, scale: 0.5 },
];

export const generateImageMetadata = () =>
  ICONS.map(({ id, size }) => ({
    id,
    size: { width: size, height: size },
    contentType: "image/png",
  }));

const Icon = async ({ id }: { id: Promise<string | number> }) => {
  const wanted = String(await id);
  const spec = ICONS.find((icon) => icon.id === wanted) ?? ICONS[0];
  if (!spec) return new Response(null, { status: 404 });
  return new ImageResponse(<IconArt size={spec.size} scale={spec.scale} />, {
    width: spec.size,
    height: spec.size,
  });
};

export default Icon;
