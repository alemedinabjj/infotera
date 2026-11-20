/** Textos comuns a várias features (a catraca de i18n manda tudo para cá ou para a feature dona). */
export const ptBR = {
  map: {
    /** Atribuição obrigatória do OpenStreetMap (sempre visível no mapa). */
    attribution: "© colaboradores do OpenStreetMap",
    zoomIn: "Ampliar o mapa",
    zoomOut: "Reduzir o mapa",
    closePopup: "Fechar",
    /** Dica curta, sempre visível, de como usar o mapa pelo teclado. */
    keyboardHint: "Setas movem o mapa; + e − mudam o zoom.",
  },
};

export type CommonMessages = typeof ptBR;
