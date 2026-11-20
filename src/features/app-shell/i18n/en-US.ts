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
    title: "You're offline",
    description:
      "This page hasn't been saved for offline use yet. The searches and hotels you've already opened are still available.",
    retry: "Try again",
    home: "Go to the start page",
    metaTitle: "Offline | Infotera Hotéis",
  },
  offlineBanner: {
    offline:
      "You're offline. We're showing what was already loaded; bookings are unavailable until you're back online.",
    restored: "Connection restored.",
  },
};
