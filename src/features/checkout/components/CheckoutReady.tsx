"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import type { Hotel, Room } from "@/shared/api/schemas";
import type { RoomSelection } from "@/shared/stores/booking-draft";
import { useCheckoutFlow } from "../hooks/useCheckoutFlow";
import { BookingSummary } from "./BookingSummary";
import { CheckoutForm } from "./CheckoutForm";
import { CheckoutLayout } from "./CheckoutLayout";
import { CouponForm } from "./CouponForm";
import { PriceBreakdown } from "./PriceBreakdown";
import { RoomCountField } from "./RoomCountField";
import { StepIndicator } from "./StepIndicator";

type CheckoutReadyProps = {
  selection: RoomSelection;
  hotel: UseQueryResult<Hotel>;
  room: UseQueryResult<Room>;
  onLeaving: (selection: RoomSelection) => void;
};

/** Página pronta: resumo (quartos, cupom, preço) + formulário de 3 passos. Seção a seção, sem bloquear. */
export const CheckoutReady = ({ selection, hotel, room, onLeaving }: CheckoutReadyProps) => {
  const flow = useCheckoutFlow({ selection, hotel, room, onLeaving });
  const { roomCount, coupon, price, checkout, submit } = flow;
  const couponStatus = price.status === "ready" ? price.result.coupon : { state: "none" as const };

  return (
    <CheckoutLayout
      hotelId={selection.hotelId}
      criteria={flow.selection.criteria}
      steps={
        <StepIndicator current={checkout.step} locked={submit.isPending} onGoTo={checkout.goTo} />
      }
      summary={
        <BookingSummary
          hotel={hotel}
          room={room}
          hotelId={selection.hotelId}
          criteria={flow.selection.criteria}
          open={flow.summaryOpen}
          onToggle={() => flow.setSummaryOpen((open) => !open)}
        >
          <RoomCountField
            room={room.data}
            rooms={roomCount.rooms}
            bounds={roomCount.bounds}
            hint={roomCount.hint}
            locked={submit.isPending}
            onChange={roomCount.change}
          />
          <CouponForm
            view={coupon.view}
            status={couponStatus}
            locked={submit.isPending}
            onApply={coupon.apply}
            onCancel={coupon.cancel}
            onRemove={coupon.remove}
          />
          <PriceBreakdown price={price} couponValidating={coupon.view.kind === "validating"} />
        </BookingSummary>
      }
      form={<CheckoutForm flow={flow} />}
    />
  );
};
