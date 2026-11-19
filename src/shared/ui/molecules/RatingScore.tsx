import { formatRating, pluralize, ratingLabel } from "../../lib/format";
import { Stars } from "../atoms/Stars";

type RatingScoreProps = {
  rating: number;
  reviewCount: number;
  /** Mostra o rótulo qualitativo ("Excelente"). Padrão `true`. */
  showLabel?: boolean;
};

/**
 * Nota em texto + estrelas decorativas + contagem: `4,8 ★★★★★ Excelente · 2.847 avaliações`.
 * Leitor de tela: "Nota 4,8 de 5, Excelente, 2.847 avaliações". Sem avaliações, só o aviso.
 */
export const RatingScore = ({ rating, reviewCount, showLabel = true }: RatingScoreProps) => {
  if (reviewCount === 0) return <p className="text-sm text-fg-subtle">Sem avaliações</p>;

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="sr-only">Nota </span>
      <span className="text-base font-semibold text-fg tabular-nums">{formatRating(rating)}</span>
      <span className="sr-only"> de 5,</span>
      <Stars value={rating} decorative />
      {showLabel ? (
        <span className="text-sm font-medium text-fg-muted">{ratingLabel(rating)}</span>
      ) : null}
      <span className="text-sm text-fg-subtle">
        <span aria-hidden="true">· </span>
        {pluralize(reviewCount, "avaliação", "avaliações")}
      </span>
    </p>
  );
};
