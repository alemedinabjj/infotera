import type { HistoryMessages } from "./pt-BR";

export const enUS: HistoryMessages = {
  metaTitle: "My bookings | Infotera Hotéis",
  title: "My bookings",
  intro: "Bookings confirmed or opened in this browser.",
  sharedComputer: "On a shared computer, clear the history when you're done.",
  loading: "Loading your bookings…",
  slow: "Taking longer than usual…",
  hotelUnavailable: "Hotel unavailable",
  thisBooking: "this booking",
  bookedOn: (date) => `Booked on ${date}`,
  total: "total",
  viewBooking: "View booking",
  viewBookingLabel: (hotel) => `View booking at ${hotel}`,
  remove: "Remove from history",
  removeLabel: (hotel, dates) => `Remove from history: ${hotel}, ${dates}`,
  removed: "Booking removed from the history.",
  undo: "Undo",
  undoLabel: (hotel) => `Undo: ${hotel}`,
  failed: "We couldn't load this booking.",
  unreadable: "We couldn't display this booking.",
  retry: "Try again",
  retrying: "Trying…",
  vanished: (count) =>
    count === 1
      ? "1 booking no longer exists and was removed from the list. Demo bookings are deleted periodically."
      : `${count} bookings no longer exist and were removed from the list. Demo bookings are deleted periodically.`,
  offline: {
    title: "You're offline.",
    description: "Your bookings show up as soon as the connection is back.",
  },
  empty: {
    title: "No bookings in this browser",
    description: "Bookings you confirm show up here. They are saved only in this browser.",
    action: "Search hotels",
  },
  clear: {
    open: "Clear history",
    title: "Clear the history?",
    description: "Your bookings stay valid. They just stop showing up in this browser.",
    cancel: "Cancel",
    confirm: "Clear history",
    done: "History cleared.",
  },
  stay: {
    upcoming: "Upcoming stay",
    ongoing: "In progress",
    completed: "Completed",
  },
};
