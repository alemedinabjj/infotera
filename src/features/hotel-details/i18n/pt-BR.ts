export const ptBR = {
  location: {
    /** Nome da região do mapa interativo (o endereço é conteúdo da API, em português). */
    mapRegion: ({ address }: { address: string }) => `Mapa: ${address}`,
  },
};

export type HotelDetailsMessages = typeof ptBR;
