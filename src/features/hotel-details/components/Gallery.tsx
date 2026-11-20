import type { Locale } from "@/shared/i18n/config";
import { cn } from "@/shared/lib/cn";
import { buttonClassName, RemoteImage } from "@/shared/ui";
import { hotelDetailsMessages } from "../i18n/messages";
import { galleryPreview, mainPhotoSpan, photoOpenLabel, thumbPlacement } from "../model/gallery";
import { photoHref } from "../model/photo-route";
import { PhotoLink } from "./PhotoLink";

type GalleryProps = { locale: Locale; hotelId: number; images: readonly string[] };

const MAIN_SIZES = "(min-width: 1152px) 560px, (min-width: 640px) 50vw, 100vw";
const THUMB_SIZES = "(min-width: 1152px) 280px, 25vw";

type PhotoTileProps = {
  locale: Locale;
  hotelId: number;
  src: string;
  index: number;
  total: number;
  sizes: string;
  className: string;
  main?: boolean;
  /** Faixa `+3 fotos` sobre a foto. */
  extra?: string;
};

const PhotoTile = ({
  locale,
  hotelId,
  src,
  index,
  total,
  sizes,
  className,
  main,
  extra,
}: PhotoTileProps) => (
  <PhotoLink
    href={photoHref(hotelId, index, locale)}
    label={photoOpenLabel(index, total, locale)}
    main={main}
    className={cn(
      "relative block overflow-hidden rounded-card transition-[filter] duration-150 hover:brightness-95",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
      className,
    )}
  >
    <RemoteImage src={src} alt="" sizes={sizes} priority={main} className="size-full" />
    {extra ? (
      <span className="absolute inset-x-0 bottom-0 bg-overlay/60 py-1 text-center text-sm font-semibold text-fg-on-primary">
        {extra}
      </span>
    ) : null}
  </PhotoLink>
);

/**
 * Foto principal + até 4 miniaturas (`sm+`) e "Ver todas as fotos" (Server Component). Cada foto é um
 * **link** para `/hotel/{id}/photos/{n}`: por navegação interna abre como modal (rota interceptada);
 * sem JS ou num reload, a página cheia. As miniaturas carregam sob demanda e não baixam no celular.
 */
export const Gallery = ({ locale, hotelId, images }: GalleryProps) => {
  const t = hotelDetailsMessages.get(locale).gallery;
  const total = images.length;
  const preview = galleryPreview(total);
  const [main] = images;
  if (main === undefined) return null;

  return (
    <div className="relative">
      <div className="grid gap-2 sm:h-72 sm:grid-cols-4 sm:grid-rows-2 lg:h-96">
        <PhotoTile
          locale={locale}
          hotelId={hotelId}
          src={main}
          index={0}
          total={total}
          sizes={MAIN_SIZES}
          main
          className={cn("aspect-video sm:aspect-auto", mainPhotoSpan(preview.thumbs.length))}
        />
        {preview.thumbs.map((photoIndex, position) => (
          <PhotoTile
            key={photoIndex}
            locale={locale}
            hotelId={hotelId}
            src={images[photoIndex] ?? main}
            index={photoIndex}
            total={total}
            sizes={THUMB_SIZES}
            extra={
              position === preview.thumbs.length - 1 && preview.hiddenCount > 0
                ? t.extra({ count: preview.hiddenCount })
                : undefined
            }
            className={cn("hidden sm:block", thumbPlacement(preview.thumbs.length, position))}
          />
        ))}
      </div>
      {total > 1 ? (
        <PhotoLink
          href={photoHref(hotelId, 0, locale)}
          label={t.seeAll({ count: total })}
          className={cn(
            buttonClassName({ variant: "secondary", size: "sm" }),
            "absolute right-3 bottom-3",
          )}
        >
          {t.seeAll({ count: total })}
        </PhotoLink>
      ) : null}
    </div>
  );
};
