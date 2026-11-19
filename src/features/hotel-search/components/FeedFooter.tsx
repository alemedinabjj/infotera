import type { RefObject } from "react";
import { Alert, Button } from "@/shared/ui";
import type { FeedFooter as FeedFooterState } from "../model/feed";
import { describeLoadedCount } from "../model/results-view";

type FeedFooterProps = {
  footer: FeedFooterState;
  loaded: number;
  total: number;
  /** Fetch em andamento (no estado de erro, o "Tentar de novo" vira "Tentando…"). */
  fetching: boolean;
  onLoadMore: () => void;
  onBackToTop: () => void;
  /** Observado pelo carregamento automático. */
  sentinelRef: RefObject<HTMLDivElement | null>;
  /** O botão de carregar (o mesmo elemento em `more`, `loading-more` e `error-more`). */
  buttonRef: RefObject<HTMLButtonElement | null>;
  /** Parágrafo final (alvo de `Ctrl+End`). */
  endRef: RefObject<HTMLParagraphElement | null>;
};

const endText = (total: number): string =>
  total === 1 ? "Você viu o único hotel." : `Você viu todos os ${total} hotéis.`;

/** Rodapé do feed: um estado por vez (`switch` exaustivo). O botão nunca troca de elemento. */
export const FeedFooter = ({
  footer,
  loaded,
  total,
  fetching,
  onLoadMore,
  onBackToTop,
  sentinelRef,
  buttonRef,
  endRef,
}: FeedFooterProps) => (
  <div ref={sentinelRef} className="mt-6 flex min-h-11 flex-col items-center gap-2">
    {footer.kind === "end" ? (
      <>
        <p ref={endRef} tabIndex={-1} className="text-sm text-fg-muted">
          {endText(footer.total)}
        </p>
        <Button variant="ghost" size="sm" onClick={onBackToTop}>
          Voltar ao topo
        </Button>
      </>
    ) : (
      <>
        <Button
          ref={buttonRef}
          variant="secondary"
          className="w-full sm:w-auto"
          loading={fetching}
          loadingText={footer.kind === "error-more" ? "Tentando…" : "Carregando mais hotéis…"}
          onClick={onLoadMore}
        >
          {footer.kind === "error-more" ? "Tentar de novo" : "Carregar mais hotéis"}
        </Button>
        <MoreStatus footer={footer} loaded={loaded} total={total} />
      </>
    )}
  </div>
);

const MoreStatus = ({
  footer,
  loaded,
  total,
}: {
  footer: Exclude<FeedFooterState, { kind: "end" }>;
  loaded: number;
  total: number;
}) => {
  switch (footer.kind) {
    case "more":
    case "loading-more":
      return <p className="text-sm text-fg-muted">{describeLoadedCount(loaded, total)}</p>;
    case "error-more":
      return (
        <Alert tone="danger" title="Não foi possível carregar mais hotéis." className="w-full">
          Os hotéis já carregados continuam aqui.
        </Alert>
      );
    default: {
      const unreachable: never = footer;
      return unreachable;
    }
  }
};
