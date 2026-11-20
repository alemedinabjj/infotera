import Link from "next/link";
import type { Hotel } from "@/shared/api/schemas";
import type { Locale } from "@/shared/i18n/config";
import { localizePath } from "@/shared/i18n/paths";
import { buttonClassName, ChevronLeftIcon } from "@/shared/ui";
import { hotelDetailsMessages } from "../i18n/messages";
import { PhotoViewer } from "./PhotoViewer";

const HEADING_ID = "photo-page-title";

type PhotoPageProps = { locale: Locale; hotel: Hotel; index: number };

/**
 * Página cheia da foto (`/hotel/{id}/photos/{n}` aberta por URL, reload ou link compartilhado):
 * "Voltar para o hotel" antes do h1 (é a saída da página), h1 e o visualizador. Sem miniaturas nem
 * preço: ela é a foto. "Voltar" vai a `/hotel/{id}` sem critérios (a galeria não depende da URL de
 * busca, para continuar na casca estática).
 */
export const PhotoPage = ({ locale, hotel, index }: PhotoPageProps) => {
  const t = hotelDetailsMessages.get(locale);
  return (
    <div className="flex w-full flex-col gap-4 lg:mx-auto lg:max-w-4xl">
      <Link
        href={localizePath(locale, `/hotel/${hotel.id}`)}
        // `-ml-4` compensa o padding do ghost: o texto alinha com o h1 e com a moldura.
        className={`${buttonClassName({ variant: "ghost" })} -ml-4 self-start`}
      >
        <ChevronLeftIcon aria-hidden="true" className="size-5" />
        {t.photoPage.back}
      </Link>
      <h1 id={HEADING_ID} className="text-xl font-bold text-fg lg:text-2xl">
        {t.gallery.lightboxTitle({ name: hotel.name })}
      </h1>
      <PhotoViewer
        hotelId={hotel.id}
        name={hotel.name}
        images={hotel.images}
        initialIndex={index}
        headingId={HEADING_ID}
      />
    </div>
  );
};
