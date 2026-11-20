const SITE = "Infotera Hotéis";

/** `<title>` da página: com o nome do hotel, "não encontrado" (404) ou o genérico (erro). */
export const hotelPageTitle = (
  state: { kind: "found"; name: string } | { kind: "not-found" } | { kind: "error" },
): string => {
  switch (state.kind) {
    case "found":
      return `${state.name} | ${SITE}`;
    case "not-found":
      return `Hotel não encontrado | ${SITE}`;
    case "error":
      return `Hotel | ${SITE}`;
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
};
