import { Fragment } from "react";
import { formatCents } from "@/shared/lib/price-breakdown";
import { cardClassName } from "@/shared/ui";
import { splitNumberGroups } from "../model/booking-number";
import { CopyBookingNumber } from "./CopyBookingNumber";

const NUMBER_ID = "numero-reserva";

type BookingNumberProps = {
  number: string;
  stayLabel: string;
  totalCents: number;
};

/**
 * Cartão-resumo: o número da reserva (UUID completo, selecionável, quebra só depois de hífen),
 * o botão de copiar e a linha `Estadia · Total`. Tudo vem da reserva e aparece na hora, antes do
 * hotel e do quarto.
 */
export const BookingNumber = ({ number, stayLabel, totalCents }: BookingNumberProps) => {
  const groups = splitNumberGroups(number);
  return (
    <div
      className={cardClassName({
        className: "p-4 md:p-5 print:break-inside-avoid print:shadow-none",
      })}
    >
      <dl>
        <dt className="text-sm font-medium text-fg-muted">Número da reserva</dt>
        <dd
          id={NUMBER_ID}
          translate="no"
          className="mt-1 font-mono text-xl font-semibold wrap-anywhere text-fg select-all"
        >
          {groups.map((group, index) => (
            <Fragment key={group.key}>
              {group.text}
              {index < groups.length - 1 ? <wbr /> : null}
            </Fragment>
          ))}
        </dd>
      </dl>
      <CopyBookingNumber value={number} numberId={NUMBER_ID} />
      <dl className="mt-2 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-fg-muted">Estadia</dt>
          <dd className="text-base font-semibold text-fg tabular-nums">{stayLabel}</dd>
        </div>
        <div>
          <dt className="text-sm text-fg-muted">Total</dt>
          <dd className="text-2xl font-bold whitespace-nowrap text-fg tabular-nums">
            {formatCents(totalCents)}
          </dd>
        </div>
      </dl>
    </div>
  );
};
