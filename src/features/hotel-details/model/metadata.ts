import type { Locale } from "@/shared/i18n/config";
import { hotelDetailsMessages } from "../i18n/messages";

const SITE = "Infotera Hotéis";

/** `<title>` da página: com o nome do hotel, "não encontrado" (404) ou o genérico (erro). */
export const hotelPageTitle = (
  state: { kind: "found"; name: string } | { kind: "not-found" } | { kind: "error" },
  locale: Locale,
): string => {
  const t = hotelDetailsMessages.get(locale).meta;
  switch (state.kind) {
    case "found":
      return `${state.name} | ${SITE}`;
    case "not-found":
      return `${t.notFound} | ${SITE}`;
    case "error":
      return `${t.generic} | ${SITE}`;
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
};
