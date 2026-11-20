export const ptBR = {
  languageSwitch: {
    /** Nome do idioma de destino, no próprio idioma (aparece no link). */
    targetName: "English",
    /** Sigla visível em telas muito estreitas. */
    targetShort: "EN",
    label: "Mudar idioma para English",
  },
  offlinePage: {
    title: "Você está sem internet",
    description:
      "Esta página ainda não foi salva para uso offline. As buscas e hotéis que você já abriu continuam disponíveis.",
    retry: "Tentar de novo",
    home: "Ir para o início",
    metaTitle: "Sem internet | Infotera Hotéis",
  },
  offlineBanner: {
    offline:
      "Você está sem internet. Mostramos o que já foi carregado; reservas ficam indisponíveis até a conexão voltar.",
    restored: "Conexão restabelecida.",
  },
};

export type AppShellMessages = typeof ptBR;
