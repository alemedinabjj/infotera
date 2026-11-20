import { formatBRL } from "@/shared/lib/currency";
import { pluralize } from "@/shared/lib/format";

const money = (value: number): string => formatBRL(value, { cents: !Number.isInteger(value) });

type PriceTagProps =
  | {
      /** Sem datas: `a partir de` / **R$ 180** / `por noite`. */
      variant: "nightly";
      nightly: number;
    }
  | {
      /** Com datas: o total é o número grande; a diária vira linha secundária. */
      variant: "stay";
      total: number;
      nights: number;
      rooms: number;
      nightly: number;
    }
  | {
      /** Quando o total não pode ser reservado: só a diária, discreta. */
      variant: "nightly-line";
      nightly: number;
    };

/** Preço do card (design system §5.1). O valor nunca quebra: `whitespace-nowrap`. */
export const PriceTag = (props: PriceTagProps) => {
  switch (props.variant) {
    case "nightly":
      return (
        <p className="flex flex-col items-end">
          <span className="text-sm text-fg-subtle">a partir de</span>
          <span className="text-xl font-bold whitespace-nowrap text-fg tabular-nums">
            {money(props.nightly)}
          </span>
          <span className="text-sm text-fg-muted">por noite</span>
        </p>
      );
    case "stay":
      return (
        <p className="flex flex-col items-end">
          <span className="text-xl font-bold whitespace-nowrap text-fg tabular-nums">
            {formatBRL(props.total)}
          </span>
          <span className="text-sm text-fg-muted">
            total · {pluralize(props.nights, "noite", "noites")} ·{" "}
            {pluralize(props.rooms, "quarto", "quartos")}
          </span>
          <span className="text-sm text-fg-subtle">
            a partir de{" "}
            <span className="whitespace-nowrap tabular-nums">{money(props.nightly)}</span> por noite
          </span>
        </p>
      );
    case "nightly-line":
      return (
        <p className="text-sm text-fg-subtle">
          a partir de <span className="whitespace-nowrap tabular-nums">{money(props.nightly)}</span>{" "}
          por noite
        </p>
      );
    default: {
      const unreachable: never = props;
      return unreachable;
    }
  }
};
