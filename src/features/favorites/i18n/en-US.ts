import { plural } from "@/shared/i18n/messages";
import type { FavoritesMessages } from "./pt-BR";

export const enUS: FavoritesMessages = {
  metaTitle: "Favorites | Infotera Hotéis",
  title: "Favorites",
  count: (count) => `${count} ${plural(count, { one: "saved hotel", other: "saved hotels" })}`,
  loading: "Loading your favorites…",
  slow: "Taking longer than usual…",
  empty: {
    title: "No saved hotels yet",
    description:
      "Tap a hotel's heart to keep it here. Your favorites are saved only in this browser.",
    action: "Search hotels",
  },
  error: {
    title: "We couldn't load your favorites",
    description: "Check your connection and try again.",
  },
  offline: {
    title: "You're offline.",
    description: "Your favorites show up as soon as the connection is back.",
  },
  priceUnavailable: "Price unavailable right now",
  removed: "Removed from favorites.",
  undo: "Undo",
  undoLabel: (name) => `Undo: ${name}`,
};
