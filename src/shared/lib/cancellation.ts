import type { CancellationPolicy } from "../api/schemas";
import { commonMessages } from "../i18n/common/messages";
import { DEFAULT_LOCALE, type Locale } from "../i18n/config";

export type CancellationDetails = {
  label: string;
  tone: "success" | "neutral" | "warning";
  details: string[];
};

/**
 * Rótulo, tom do selo e regras da política. A API só informa a categoria: os detalhes são
 * **texto ilustrativo do produto** (prazos fixos por categoria), centralizados aqui para trocar
 * por dados reais quando existirem.
 */
export const cancellationDetails = (
  policy: CancellationPolicy,
  locale: Locale = DEFAULT_LOCALE,
): CancellationDetails => {
  const t = commonMessages.get(locale).cancellation;
  switch (policy) {
    case "free":
      return { label: t.free.label, tone: "success", details: t.free.details };
    case "moderate":
      return { label: t.moderate.label, tone: "neutral", details: t.moderate.details };
    case "strict":
      return { label: t.strict.label, tone: "warning", details: t.strict.details };
    default: {
      const unreachable: never = policy;
      return unreachable;
    }
  }
};
