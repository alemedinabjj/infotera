export const ptBR = {
  manifest: {
    /** O manifest é um só (o Next aceita `manifest` apenas na raiz de `app/`): descrição em pt-BR. */
    description: "Busque, compare e reserve hotéis com preço claro do início ao fim.",
  },
  languageSwitch: {
    /** Nome do idioma de destino, no próprio idioma (aparece no link). */
    targetName: "English",
    /** Sigla visível em telas muito estreitas. */
    targetShort: "EN",
  },
  install: {
    title: "Instale o Infotera Hotéis",
    description: "Abra suas buscas mais rápido, até sem internet.",
    install: "Instalar app",
    dismiss: "Agora não",
    dismissed: "Tudo bem. Você pode instalar depois pelo menu do navegador.",
    installed: "App instalado.",
  },
  update: {
    available: "Nova versão disponível.",
    reload: "Atualizar agora",
  },
  offlinePage: {
    public: {
      title: "Esta página não está disponível offline",
      description:
        "Ela ainda não foi salva neste aparelho. As buscas e os hotéis que você já abriu continuam disponíveis.",
      metaTitle: "Sem internet | Infotera Hotéis",
    },
    checkout: {
      title: "A reserva precisa de internet",
      description:
        "Nada foi cobrado e sua seleção continua salva neste aparelho. Assim que a conexão voltar, toque em “Tentar de novo”.",
      metaTitle: "Sem internet | Infotera Hotéis",
    },
    bookings: {
      title: "Suas reservas precisam de internet",
      description:
        "Por segurança, os dados das reservas não ficam salvos neste aparelho. Suas reservas não foram afetadas.",
      metaTitle: "Sem internet | Infotera Hotéis",
    },
    retry: "Tentar de novo",
    retrying: "Tentando…",
    home: "Ir para o início",
  },
  offlineBanner: {
    offline:
      "Você está sem internet. Mostramos o que já foi carregado; reservas ficam indisponíveis até a conexão voltar.",
    restored: "Conexão restabelecida.",
  },
};

export type AppShellMessages = typeof ptBR;
