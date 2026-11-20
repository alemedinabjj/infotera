import { plural } from "@/shared/i18n/messages";
import { enUSForm } from "./en-US.form";
import type { CheckoutMessages } from "./pt-BR";

const roomsAvailable = (count: number): string =>
  `${count} ${plural(count, { one: "room available", other: "rooms available" })}`;

/** Checkout microcopy in English (same shape as pt-BR). */
export const enUS: CheckoutMessages = {
  pageTitle: "Complete your booking",
  demoNotice: "Demo environment — never enter real information.",
  loading: "Loading your booking…",
  retry: "Try again",
  trying: "Trying…",
  back: "Back",
  edit: "Edit",
  viewRooms: "View rooms",
  newSearch: "Start a new search",
  layout: { backToHotel: "Back to hotel", heading: "Complete your booking" },
  steps: {
    listLabel: "Booking steps",
    labels: { personal: "Guests", payment: "Payment", review: "Review" },
    titles: { personal: "Guest details", payment: "Payment", review: "Review and confirm" },
    counter: (step, total) => `Step ${step} of ${total}`,
    done: (label) => `${label}, completed`,
    primary: {
      personal: "Continue to payment",
      payment: "Review booking",
      review: "Confirm booking",
    },
    confirming: "Confirming booking…",
    calculating: "Calculating total…",
  },
  price: {
    totalPrefix: "Total ·",
    notLoaded: "Total not loaded — try again",
    calculating: "Calculating the total…",
    slow: "This is taking longer than usual…",
  },
  summary: {
    title: "Your booking",
    loadErrorTitle: "We could not load your booking details.",
    loadErrorDescription: "Check your connection and try again.",
    checkIn: "Check-in",
    checkOut: "Check-out",
    from: (time) => `From ${time}`,
    until: (time) => `Until ${time}`,
    changeDates: "Change dates and guests",
    viewDetails: "View booking details",
    and: "and",
    capacityOne: "Fits 1 guest per room",
    capacity: (max) => `Up to ${max} per room`,
    rooms: "Rooms",
    decreaseRoom: "Remove room",
    increaseRoom: "Add room",
  },
  blocked: {
    roomFallback: "The room",
    chooseDates: "Choose new dates",
    soldOut: {
      title: "This room is sold out",
      description: (room, range) =>
        `There are no more units of ${room} for ${range}. Choose another room at the same hotel.`,
    },
    insufficient: {
      title: (left) => `Only ${roomsAvailable(left)}`,
      description: (rooms, room) =>
        `Your booking asks for ${rooms} rooms of ${room}. Go back to the hotel to choose another room or reduce the number of rooms.`,
    },
    tooSmall: {
      title: "This room does not fit your search",
      description: (room, max, guests) =>
        `${room} fits up to ${max} guests per room and your search has ${guests}. Choose another room or change the guests.`,
    },
    staleDates: {
      title: "The dates of this booking have passed",
      description: (date) =>
        `Check-in was on ${date}. Choose new dates to see price and availability.`,
    },
  },
  roomCount: {
    available: (count) => `Only ${roomsAvailable(count)}.`,
    needsAdult: "Each room needs at least 1 adult.",
    maxRooms: (max) => `Maximum of ${max} rooms per booking.`,
    minRooms: (maxGuests, guests, rooms) =>
      `This room fits up to ${maxGuests}: ${guests} need at least ${rooms}.`,
    confirmFailed: "We could not confirm availability. Try again.",
    confirming: "Confirming availability…",
  },
  coupon: {
    toggle: "I have a discount coupon",
    label: "Discount coupon",
    hint: "Letters and numbers, no spaces.",
    apply: "Apply",
    applySr: " coupon",
    applying: "Applying…",
    remove: "Remove",
    removeSr: " coupon",
    notValidHere: (code) => `${code} is not valid for this booking`,
    percentOff: (percent) => `${percent}% off`,
    amountOff: (amount) => `${amount} off`,
    format: "Use 4 to 12 letters or numbers, no spaces.",
    notFound: "Coupon not found. Check the code.",
    expired: "This coupon has expired.",
    minNights: (nights) => `Valid for stays of ${nights} nights or more.`,
    minSubtotal: (amount) => `Valid for bookings of ${amount} or more.`,
    lookupFailed: "We could not validate the coupon. Try again.",
    restoredInvalid: (code) => `Your coupon ${code} is no longer valid for this booking.`,
    applied: (code) => `Coupon ${code} applied.`,
    appliedAgain: (code) => `Coupon ${code} applied again.`,
    stoppedWorking: (code, reason) =>
      `Coupon ${code} is no longer valid: ${reason} The total was updated.`,
    removed: "Coupon removed.",
  },
  notices: {
    paymentWiped: "For your security, card details are not saved. Fill in the payment again.",
    restored: "We recovered the details you filled in during this session.",
    restoredChildren:
      "We recovered the details you filled in during this session. Check the children's ages.",
  },
  errorSummary: {
    holder: "Holder",
    guest: (guest) => `Guest ${guest}`,
    age: "Age",
    cardName: "Name on card",
    terms: "Terms",
    cpf: "CPF",
    passport: "Passport",
  },
  submit: {
    transportToast: "We could not confirm the booking.",
    nothingCharged: "Nothing was charged.",
    priceUnavailableTitle: "We could not calculate the total",
    priceUnavailableBody: "Reload the room price to confirm the booking.",
    soldOutTitle: "This room sold out while you were booking",
    soldOutBody: "Choose another room at the same hotel.",
    fewLeftTitle: (count) => `Only ${roomsAvailable(count)} now`,
    fewLeftBody: "Reduce the number of rooms in the booking summary or choose another room.",
    failedTitle: "We could not confirm your booking",
    failedBody: "You were not charged. Your details were kept; try again in a moment.",
    offlineTitle: "You are offline.",
    offlineBody: "Nothing was charged. Try again when the connection is back.",
    priceChangedTitle: "The booking total changed",
    priceChangedBody: (previous, next) =>
      `It went from ${previous} to ${next}. Check the new amount and confirm again.`,
    couponTitle: (code) => `Coupon ${code ?? "you entered"} is no longer valid`,
    couponBody: (total) =>
      `We removed the discount and the total is now ${total}. Check it and confirm again.`,
    invalidTitle: "Check your booking details",
    invalidField: "Check this field and try again.",
  },
  ...enUSForm,
};
