import { commonMessages } from "../../i18n/common/messages";
import type { Locale } from "../../i18n/config";
import { cn } from "../../lib/cn";
import { formatRating } from "../../lib/format";
import { StarIcon } from "../icons";

const STAR_INDEXES = [0, 1, 2, 3, 4] as const;

type StarsProps = {
  locale: Locale;
  /** Nota de 0 a 5 (aceita decimais; meia estrela por recorte). */
  value: number;
  /** Nome acessível; padrão "Avaliação 4,5 de 5" (ou "Rating 4.5 out of 5"). */
  label?: string;
  /** Só decorativa (a nota já aparece em texto): esconde das tecnologias assistivas. */
  decorative?: boolean;
  className?: string;
};

const fillPercent = (value: number, index: number): number =>
  Math.round(Math.min(Math.max(value - index, 0), 1) * 100);

/** Estrelas decorativas com nome acessível único. Mostre sempre a nota em texto ao lado. */
export const Stars = ({ locale, value, label, decorative = false, className }: StarsProps) => {
  const t = commonMessages.get(locale).rating;
  return (
    <span
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": label ?? t.stars({ rating: formatRating(value, locale) }) })}
      className={cn("inline-flex gap-0.5", className)}
    >
      {STAR_INDEXES.map((index) => (
        <span key={index} aria-hidden="true" className="relative inline-block size-4">
          <StarIcon
            className="absolute inset-0 size-4 text-star-empty"
            fill="currentColor"
            strokeWidth={0}
          />
          <span
            className="absolute inset-y-0 left-0 overflow-hidden"
            style={{ width: `${fillPercent(value, index)}%` }}
          >
            <StarIcon className="size-4 max-w-none text-star" fill="currentColor" strokeWidth={0} />
          </span>
        </span>
      ))}
    </span>
  );
};
