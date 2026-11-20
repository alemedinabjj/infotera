import type { AppShellMessages } from "./pt-BR";

export const enUS: AppShellMessages = {
  manifest: {
    description: "Search, compare and book hotels with clear pricing from start to finish.",
  },
  languageSwitch: {
    targetName: "Português",
    targetShort: "PT",
  },
  install: {
    title: "Install Infotera Hotéis",
    description: "Open your searches faster, even offline.",
    install: "Install app",
    dismiss: "Not now",
    dismissed: "No problem. You can install it later from the browser menu.",
    installed: "App installed.",
  },
  update: {
    available: "New version available.",
    reload: "Update now",
  },
  offlinePage: {
    public: {
      title: "This page isn't available offline",
      description:
        "It hasn't been saved on this device yet. Searches and hotels you've already opened are still available.",
      metaTitle: "Offline | Infotera Hotéis",
    },
    checkout: {
      title: "Booking needs an internet connection",
      description:
        "Nothing was charged and your selection is still saved on this device. Once you're back online, select “Try again”.",
      metaTitle: "Offline | Infotera Hotéis",
    },
    bookings: {
      title: "Your bookings need an internet connection",
      description:
        "For your security, booking details aren't saved on this device. Your bookings haven't been affected.",
      metaTitle: "Offline | Infotera Hotéis",
    },
    retry: "Try again",
    retrying: "Trying…",
    home: "Go to homepage",
  },
  offlineBanner: {
    offline:
      "You're offline. We're showing what was already loaded; bookings are unavailable until you're back online.",
    restored: "Connection restored.",
  },
};
