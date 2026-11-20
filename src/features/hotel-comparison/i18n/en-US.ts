import { formatUnit } from "@/shared/i18n/units";
import type { ComparisonMessages } from "./pt-BR";

export const enUS: ComparisonMessages = {
  metaTitle: "Compare hotels | Infotera Hotéis",
  title: "Compare hotels",
  legend: "Highlighted rows change between hotels.",
  onlyDifferences: "Show only differences",
  scrollHint: "Swipe sideways to see them all.",
  cornerLabel: "Feature",
  differs: ", differs between hotels",
  noDifferences: "The hotels have the same features.",
  announce: (visible, total) => `Showing ${visible} of ${total} rows.`,
  caption: (names) => {
    const head = names.slice(0, -1).join(", ");
    const last = names.at(-1) ?? "";
    return `Comparison between ${head ? `${head} and ${last}` : last}`;
  },
  remove: "Remove",
  removeLabel: (name) => `Remove ${name} from the comparison`,
  loading: "Loading the comparison…",
  slow: "Taking longer than usual…",
  badges: { cheapest: "Lowest price", bestRated: "Best rated" },
  needTwo: {
    title: "Choose at least 2 hotels to compare",
    description: "Add hotels from the search or from your favorites.",
    search: (destination) => `Search hotels in ${destination}`,
    searchAny: "Search hotels",
    favorites: "View favorites",
  },
  empty: {
    title: "No hotels to compare",
    description: 'Tick "Compare" on up to 3 hotels in the search or in your favorites.',
    search: "Search hotels",
    tray: (count) => `Compare the ${count} selected hotels`,
  },
  notFound: (count) =>
    count === 1
      ? "1 hotel wasn't found and was removed from the comparison."
      : `${count} hotels weren't found and were removed from the comparison.`,
  error: {
    title: "We couldn't load the comparison",
    description: "Check your connection and try again.",
  },
  offline: {
    title: "You're offline.",
    description: "The comparison shows up as soon as the connection is back.",
  },
  rows: {
    price: "Price per night",
    priceFrom: (price) => `from ${price}`,
    soldOutNote: "Sold out",
    rating: "Rating",
    reviews: "Reviews",
    type: "Type",
    destination: "Destination",
    cancellation: "Cancellation",
    checkIn: "Check-in",
    checkInValue: (time) => `From ${time}`,
    checkOut: "Check-out",
    checkOutValue: (time) => `Until ${time}`,
    availability: "Availability",
    soldOut: "Sold out",
    scarce: (count) => `Only ${formatUnit(count, "room", "en-US")} left!`,
    available: "Available",
    roomTypes: "Room types",
    roomTypesValue: (count) => `${count} ${count === 1 ? "type" : "types"}`,
    guests: "Guests per room",
    guestsValue: (max) => `Up to ${max}`,
    unknown: "—",
  },
};
