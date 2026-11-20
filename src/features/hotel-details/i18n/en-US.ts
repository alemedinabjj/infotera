import type { HotelDetailsMessages } from "./pt-BR";

export const enUS: HotelDetailsMessages = {
  location: {
    mapRegion: ({ address }) => `Map: ${address}`,
  },
};
