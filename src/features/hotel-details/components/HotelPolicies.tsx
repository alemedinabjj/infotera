import type { Hotel } from "@/shared/api/schemas";
import type { Locale } from "@/shared/i18n/config";
import { cancellationDetails } from "@/shared/lib/cancellation";
import { Badge, ChevronDownIcon } from "@/shared/ui";
import { hotelDetailsMessages } from "../i18n/messages";
import { Section } from "./Section";

const Time = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt className="text-sm text-fg-muted">{label}</dt>
    <dd className="text-base font-semibold text-fg tabular-nums">{value}</dd>
  </div>
);

/** Horários e política de cancelamento, com as regras num `<details>` nativo (sem JS). */
export const HotelPolicies = ({ hotel, locale }: { hotel: Hotel; locale: Locale }) => {
  const t = hotelDetailsMessages.get(locale);
  const cancellation = cancellationDetails(hotel.cancellationPolicy, locale);
  return (
    <Section id="politicas" title={t.sections.policies}>
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">
        <dl className="grid grid-cols-2 gap-4 self-start">
          <Time label={t.policies.checkIn} value={t.policies.from({ time: hotel.checkInTime })} />
          <Time
            label={t.policies.checkOut}
            value={t.policies.until({ time: hotel.checkOutTime })}
          />
        </dl>
        <div className="flex flex-col items-start gap-2">
          <h3 className="text-lg font-semibold text-fg">{t.policies.cancellation}</h3>
          <Badge tone={cancellation.tone}>{cancellation.label}</Badge>
          <details className="group">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 font-medium text-primary [&::-webkit-details-marker]:hidden">
              {t.policies.rules}
              <ChevronDownIcon
                aria-hidden="true"
                className="size-4 transition-transform group-open:rotate-180"
              />
            </summary>
            <ul className="max-w-prose list-disc pl-5 text-fg-muted">
              {cancellation.details.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </details>
        </div>
      </div>
    </Section>
  );
};
