import { formatRating, pluralize, ratingLabel } from "../../lib/format";
import { Stars } from "../atoms/Stars";

type RatingScoreProps = {
  rating: number;
  /** Omitido: nota solta (de um comentário), sem contagem nem rótulo qualitativo. */
  reviewCount?: number;
  /** Mostra o rótulo qualitativo ("Excelente"). Padrão `true`; ignorado sem `reviewCount`. */
  showLabel?: boolean;
  /** `sm` (nota `text-sm`) para comentários e cards compactos. */
  size?: "sm" | "md";
};

const NOTE_SIZE = { sm: "text-sm", md: "text-base" } as const;

/**
 * Nota em texto + estrelas decorativas + contagem: `4,8 ★★★★★ Excelente · 2.847 avaliações`.
 * Leitor de tela: "Nota 4,8 de 5, Excelente, 2.847 avaliações". Sem avaliações, só o aviso.
 * Sem `reviewCount`: `5 ★★★★★` ("Nota 5 de 5", inteiros sem casa decimal).
 */
export const RatingScore = ({
  rating,
  reviewCount,
  showLabel = true,
  size = "md",
}: RatingScoreProps) => {
  if (reviewCount === 0) return <p className="text-sm text-fg-subtle">Sem avaliações</p>;
  const standalone = reviewCount === undefined;

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="sr-only">Nota </span>
      <span className={`${NOTE_SIZE[size]} font-semibold text-fg tabular-nums`}>
        {standalone && Number.isInteger(rating) ? rating : formatRating(rating)}
      </span>
      <span className="sr-only"> de 5{standalone ? "" : ","}</span>
      <Stars value={rating} decorative />
      {standalone ? null : (
        <>
          {/* Rótulo, separador e contagem formam um bloco só: se não couber, o bloco inteiro desce
              (nenhum "·" fica solto no fim ou no começo de uma linha). */}
          <span className="inline-flex items-center gap-x-2 whitespace-nowrap">
            {showLabel ? (
              <>
                <span className="text-sm font-medium text-fg-muted">{ratingLabel(rating)}</span>
                <span aria-hidden="true" className="text-sm text-fg-subtle">
                  ·
                </span>
              </>
            ) : null}
            <span className="text-sm text-fg-subtle">
              {pluralize(reviewCount, "avaliação", "avaliações")}
            </span>
          </span>
        </>
      )}
    </p>
  );
};
