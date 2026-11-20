import type { ConfirmationMessages } from "./pt-BR";

export const enUS: ConfirmationMessages = {
  site: "Infotera Hotéis",
  titles: {
    found: "Booking confirmed",
    notFound: "Booking not found",
    unreadable: "Booking unavailable",
  },
  loading: "Loading your booking…",
  slow: "Taking longer than usual…",
  loadingStay: "Loading hotel details…",
  retry: "Try again",
  retrying: "Trying…",
  header: {
    title: "Booking confirmed",
    sentTo: "We sent the details to",
    bookedAt: (date) => `Booked on ${date} (Brasília time)`,
  },
  number: {
    code: "Code",
    number: "Booking number",
    stay: "Stay",
    total: "Total",
  },
  copy: {
    label: "Copy booking number",
    copied: "Copied",
    copiedAnnounce: "Booking number copied.",
    failure: "Couldn't copy. Select the number and copy it.",
  },
  stay: {
    title: "Your stay",
    checkIn: "Check-in",
    checkOut: "Check-out",
    room: "Room",
    viewHotel: "View hotel page",
    cancellation: "Cancellation",
    hotelFallback: (id) => `Hotel #${id}`,
    roomFallback: (id) => `Room #${id}`,
    hotelMissing: "This hotel's details are no longer available.",
    roomMissing: "This room's details are no longer available.",
    errorBoth: "We couldn't load the hotel and room details.",
    errorHotel: "We couldn't load the hotel details.",
    errorRoom: "We couldn't load the room details.",
    errorDescription: "Your booking is confirmed. Check your connection and try again.",
    checkInFrom: (time) => `From ${time}`,
    checkOutUntil: (time) => `Until ${time}`,
    askHotel: "Check with the hotel",
    unavailable: "Unavailable right now",
  },
  guests: {
    title: "Guests",
    holder: "primary guest",
    adult: "adult",
    child: "child",
  },
  payment: {
    title: "Payment",
    card: (last4) => `Card ending in ${last4}`,
    simulated: "Simulated payment: nothing was charged.",
  },
  nextSteps: {
    title: "Next steps",
    steps: [
      "Keep your booking number. It's also in this page's address.",
      "At check-in, show a photo ID for each guest.",
      "Don't share this page's link: anyone with the link can see the booking details.",
      "Cancelling or changing the booking isn't available in this demo.",
    ],
  },
  unreadable: {
    title: "We couldn't display this booking",
    description: "This booking's data is incomplete. Trying again won't help: start a new search.",
  },
  notFound: {
    title: "Booking not found",
    description:
      "Check the booking number in the link. Test bookings are deleted when the system restarts.",
  },
};
