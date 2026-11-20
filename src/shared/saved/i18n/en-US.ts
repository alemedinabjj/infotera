import { formatUnit } from "../../i18n/units";
import { MAX_COMPARE } from "../model/comparison";
import type { SavedMessages } from "./pt-BR";

export const enUS: SavedMessages = {
  favorite: {
    label: (name) => `Save to favorites: ${name}`,
    added: (name) => `${name} saved to favorites.`,
    removed: (name) => `${name} removed from favorites.`,
    limit: "You already have 100 hotels in your favorites. Remove one to save another.",
    viewAction: "View favorites",
    undoAction: "Undo",
  },
  compare: {
    label: "Compare",
    ariaLabel: (name) => `Compare: ${name}`,
    limitHint: `Limit of ${MAX_COMPARE} hotels in the comparison.`,
    limitToast: `You're already comparing ${MAX_COMPARE} hotels. Remove one to add another.`,
    viewAction: "View comparison",
    entered: (name, count) => `${name} added to the comparison. ${count} of ${MAX_COMPARE}.`,
    left: (name) => `${name} removed from the comparison.`,
    needTwo: "Choose at least 2 hotels to compare.",
    cleared: "Comparison cleared.",
    undoAction: "Undo",
  },
  tray: {
    title: "Hotel comparison",
    counter: (count) =>
      count === 1
        ? `1 of ${MAX_COMPARE} hotels · pick 1 more`
        : `${count} of ${MAX_COMPARE} hotels`,
    action: "Compare",
    actionCount: (count) => `${count} hotels`,
    actionLabel: (count) => `Compare ${count} hotels`,
    clearLabel: "Clear comparison",
    clear: "Clear",
    removeChip: (name) => `Remove ${name} from the comparison`,
  },
  nav: {
    label: "Shortcuts",
    favorites: "Favorites",
    myBookings: "My bookings",
    favoritesLabel: (count) =>
      count === 0 ? "Favorites, no hotels" : `Favorites, ${formatUnit(count, "hotel", "en-US")}`,
  },
};
