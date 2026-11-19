import { isApiError } from "./http";

const MESSAGES = {
  network: "Não foi possível conectar. Verifique sua conexão e tente de novo.",
  timeout: "O servidor está demorando mais que o normal. Tente de novo em instantes.",
  parse: "Recebemos uma resposta inesperada. Tente de novo em instantes.",
  notFound: "Não encontramos o que você procura. O link pode estar errado.",
  client: "Não foi possível concluir a solicitação. Confira os dados e tente de novo.",
  server: "Tivemos um problema do nosso lado. Tente de novo em instantes.",
  unknown: "Algo deu errado. Tente de novo.",
} as const;

/** Mensagem pt-BR para o usuário. Nunca repassa o texto bruto nem o status da API. */
export const toUserMessage = (error: unknown): string => {
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
