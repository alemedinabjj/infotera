import Link from "next/link";
import type { Locale } from "@/shared/i18n/config";
import { localizePath } from "@/shared/i18n/paths";
import { Badge, BedIcon, CheckIcon, ChevronRightIcon, MapPinIcon, RemoteImage } from "@/shared/ui";
import { confirmationMessages } from "../i18n/messages";
import type { HotelView } from "../model/confirmation-view";

const PHOTO = "aspect-[4/3] w-24 shrink-0 rounded-control sm:w-40";

const Photo = ({ hotel }: { hotel: HotelView & { status: "ok" } }) => (
  <RemoteImage src={hotel.image} alt="" sizes="(min-width: 640px) 160px, 96px" className={PHOTO} />
);

/** Hotel `ok`, `missing` (id da reserva + aviso, sem retry) ou `error` (o `ErrorState` explica). */
type BlockProps = { hotel: HotelView; locale: Locale };

export const HotelBlock = ({ hotel, locale }: BlockProps) => {
  const t = confirmationMessages.get(locale).stay;
  switch (hotel.status) {
    case "ok":
      return (
        <div>
          <div className="flex items-start gap-4">
            <Photo hotel={hotel} />
            <div className="min-w-0">
              <h3 className="text-lg font-semibold wrap-anywhere text-fg">{hotel.name}</h3>
              <p className="mt-1 flex items-start gap-1.5 text-sm text-fg-muted">
                <MapPinIcon className="mt-0.5 size-4 shrink-0" />
                <span className="max-w-prose">{hotel.address}</span>
              </p>
            </div>
          </div>
          <Link
            href={localizePath(locale, hotel.href)}
            className="mt-1 inline-flex min-h-11 items-center gap-1 rounded-control font-medium text-primary hover:underline print:hidden"
          >
            {t.viewHotel}
            <ChevronRightIcon className="size-4" />
          </Link>
        </div>
      );
    case "missing":
      return (
        <div className="flex items-start gap-4">
          <span className="flex aspect-[4/3] w-24 shrink-0 items-center justify-center rounded-control bg-surface-sunken text-fg-subtle sm:w-40">
            <BedIcon className="size-8" />
          </span>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold wrap-anywhere text-fg">{hotel.title}</h3>
            <p className="mt-1 text-sm text-fg-muted">{hotel.notice}</p>
          </div>
        </div>
      );
    case "error":
      return null;
    default: {
      const unreachable: never = hotel;
      return unreachable;
    }
  }
};

/** Política de cancelamento sempre aberta: é o que a pessoa volta para conferir (e imprime). */
export const CancellationBlock = ({ hotel, locale }: BlockProps) => {
  if (hotel.status !== "ok") return null;
  const { label, tone, details } = hotel.cancellation;
  return (
    <div className="flex flex-col items-start gap-2">
      <h3 className="text-base font-semibold text-fg">
        {confirmationMessages.get(locale).stay.cancellation}
      </h3>
      <Badge tone={tone} icon={tone === "success" ? <CheckIcon className="size-3.5" /> : undefined}>
        {label}
      </Badge>
      <ul className="max-w-prose list-disc pl-5 text-sm text-fg-muted">
        {details.map((detail) => (
          <li key={detail}>{detail}</li>
        ))}
      </ul>
    </div>
  );
};
