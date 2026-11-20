import { commonMessages } from "../i18n/common/messages";
import type { Locale } from "../i18n/config";
import { isApiError } from "./http";

/** Mensagem no idioma da página para o usuário. Nunca repassa o texto bruto nem o status da API. */
export const toUserMessage = (error: unknown, locale: Locale): string => {
  const MESSAGES = commonMessages.get(locale).errors;
  if (!isApiError(error)) return MESSAGES.unknown;
  const { kind } = error;
  switch (kind) {
    case "network":
      return MESSAGES.network;
    case "timeout":
      return MESSAGES.timeout;
    case "parse":
      return MESSAGES.parse;
    case "http":
      if (error.status === 404) return MESSAGES.notFound;
      return error.status !== null && error.status < 500 ? MESSAGES.client : MESSAGES.server;
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
};
