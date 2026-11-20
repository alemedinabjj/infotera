import type { HotelSearchMessages } from "./pt-BR";

export const enUS: HotelSearchMessages = {
  map: {
    show: "Show map",
    hide: "Hide map",
    region: "Results map",
    skip: "Skip map",
    loading: "Loading map…",
    loadError: "We couldn't load the map.",
    retry: "Try again",
    offline: "The map needs an internet connection. The list is still available.",
    keyboardHint: "Arrow keys move the map; + and − change the zoom; Tab goes through the hotels.",
    soldOut: "Sold out",
    markerLabel: ({ name, price }) => `${name}, ${price} per night`,
    soldOutLabel: ({ name }) => `${name}, sold out`,
    popupPerNight: ({ price }) => `${price} per night`,
    viewHotel: "View hotel",
    showInList: "Show in list",
  },
};
