import type { Locale } from "@/shared/i18n/config";
import { Alert } from "@/shared/ui";
import { hotelDetailsMessages } from "../i18n/messages";

/** Hotel sem quartos: avisa e leva aos similares (âncora, sem JS). */
export const SoldOutAlert = ({ hasDates, locale }: { hasDates: boolean; locale: Locale }) => {
  const t = hotelDetailsMessages.get(locale).soldOut;
  return (
    <Alert
      tone="warning"
      title={hasDates ? t.titleDates : t.titleNow}
      action={
        <a href="#similares" className="w-fit font-medium text-primary hover:underline">
          {t.seeSimilar}
        </a>
      }
    >
      {t.body}
    </Alert>
  );
};
