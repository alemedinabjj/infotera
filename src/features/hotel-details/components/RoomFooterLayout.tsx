import type { ReactNode } from "react";

type RoomFooterLayoutProps = {
  /** Selo de escassez/esgotado (do quarto: vem da casca). */
  badge: ReactNode;
  /** Total da estadia + detalhe (buraco). */
  total: ReactNode;
  /** `R$ 800 por noite, sem taxas`: sempre na casca. */
  nightly: ReactNode;
  /** Motivo do bloqueio (buraco, só quando existe). */
  reason: ReactNode;
  /** Botão (buraco). */
  action: ReactNode;
  /** Este quarto está em "Selecionando…" (destaca o card por CSS, sem estado no card). */
  selecting?: boolean;
};

/**
 * Rodapé do card do quarto: selo + preço (colados: é onde se decide), motivo **acima** do botão e o
 * botão. Serve ao conteúdo e ao fallback do `RoomStayAction`: a geometria é uma só, então nada se
 * move quando os critérios chegam.
 */
export const RoomFooterLayout = ({
  badge,
  total,
  nightly,
  reason,
  action,
  selecting,
}: RoomFooterLayoutProps) => (
  <div
    data-selecting={selecting ? "" : undefined}
    className="mt-auto flex flex-col gap-3 border-t border-border pt-3"
  >
    <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
      {badge}
      <div className="ml-auto flex flex-col items-end text-right">
        {total}
        {nightly}
      </div>
    </div>
    {reason}
    {action}
  </div>
);
