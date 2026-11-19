import { formatBRL } from "../../lib/currency";
import { pluralize } from "../../lib/format";

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
      /** Preço exato (de um quarto): a 3ª linha é `R$ 1.200 por noite`, sem "a partir de". */
      exactNightly?: boolean;
    }
  | {
      /** Topo do detalhe: `a partir de` **R$ 800** `por noite` numa linha que quebra. */
      variant: "nightly-inline";
      nightly: number;
    }
  | {
      /** Quarto sem datas: **R$ 1.200** / `por noite` (preço exato). */
      variant: "room-nightly";
      nightly: number;
    }
  | {
      /** Quando o total não pode ser reservado: só a diária, discreta. */
      variant: "nightly-line";
      nightly: number;
      /** Preço exato (de um quarto): `R$ 1.200 por noite`, sem "a partir de". */
      exact?: boolean;
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
            {props.exactNightly ? null : "a partir de "}
            <span className="whitespace-nowrap tabular-nums">{money(props.nightly)}</span> por noite
          </span>
        </p>
      );
    case "nightly-inline":
      return (
        <p className="flex flex-wrap items-baseline gap-x-1">
          <span className="text-sm text-fg-subtle">a partir de</span>{" "}
          <span className="text-2xl font-bold whitespace-nowrap text-fg tabular-nums">
            {money(props.nightly)}
          </span>{" "}
          <span className="text-sm text-fg-muted">por noite</span>
        </p>
      );
    case "room-nightly":
      return (
        <p className="flex flex-col items-end">
          <span className="text-xl font-bold whitespace-nowrap text-fg tabular-nums">
            {money(props.nightly)}
          </span>
          <span className="text-sm text-fg-muted">por noite</span>
        </p>
      );
    case "nightly-line":
      return (
        <p className="text-sm text-fg-subtle">
          {props.exact ? null : "a partir de "}
          <span className="whitespace-nowrap tabular-nums">{money(props.nightly)}</span> por noite
        </p>
      );
    default: {
      const unreachable: never = props;
      return unreachable;
    }
  }
};
