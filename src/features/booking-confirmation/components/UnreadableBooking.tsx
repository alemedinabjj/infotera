import type { Locale } from "@/shared/i18n/config";
import { AlertCircleIcon, EmptyState, FocusOnMount } from "@/shared/ui";
import { confirmationMessages } from "../i18n/messages";
import { NewSearchLink } from "./NewSearchLink";

/** Reserva existe, mas o corpo está fora do contrato: tentar de novo não resolve. */
export const UnreadableBooking = ({ locale }: { locale: Locale }) => {
  const t = confirmationMessages.get(locale).unreadable;
  return (
    <div className="w-full max-w-3xl">
      <EmptyState
        headingLevel={1}
        icon={<AlertCircleIcon className="size-8" />}
        title={t.title}
        description={t.description}
        action={<NewSearchLink />}
      />
      <FocusOnMount selector="h1" />
    </div>
  );
};
