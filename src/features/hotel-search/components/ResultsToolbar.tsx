import type { ReactNode, RefObject } from "react";
import { Skeleton, Spinner, VisuallyHidden } from "@/shared/ui";
import type { ToolbarHeading, ToolbarStatus } from "../model/results-view";

type ResultsToolbarProps = {
  headingId: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  heading: ToolbarHeading;
  status: ToolbarStatus;
  /** Gatilho do sheet de filtros (só abaixo de `lg`). */
  filtersTrigger?: ReactNode;
  sort: ReactNode;
  listMode: ReactNode;
};

const Heading = ({ heading }: { heading: ToolbarHeading }) =>
  heading.kind === "skeleton" ? (
    <>
      <Skeleton className="h-7 w-48" />
      <VisuallyHidden>Resultados</VisuallyHidden>
    </>
  ) : (
    <>
      {heading.text}
      {heading.srSuffix ? <VisuallyHidden>{heading.srSuffix}</VisuallyHidden> : null}
    </>
  );

const Status = ({ status }: { status: ToolbarStatus }) => {
  switch (status.kind) {
    case "none":
      return null;
    case "text":
      return <>{status.text}</>;
    case "spinner":
      return (
        <span className="inline-flex items-center gap-2">
          <Spinner />
          {status.text}
        </span>
      );
    default: {
      const unreachable: never = status;
      return unreachable;
    }
  }
};

/**
 * Contagem (h2, alvo de foco) + linha de status + filtros/ordenação. Fica montada em todos os
 * estados (alturas reservadas: nada se move sob o dedo).
 */
export const ResultsToolbar = ({
  headingId,
  headingRef,
  heading,
  status,
  filtersTrigger,
  sort,
  listMode,
}: ResultsToolbarProps) => (
  <div className="flex flex-col gap-3">
    <div>
      <h2
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className="min-h-7 text-xl font-semibold text-fg lg:whitespace-nowrap"
      >
        <Heading heading={heading} />
      </h2>
      <p className="min-h-5 text-sm text-fg-muted">
        <Status status={status} />
      </p>
    </div>
    <div className="grid grid-cols-1 gap-3 min-[26rem]:grid-cols-2 sm:grid-cols-[auto_1fr_1fr] sm:items-end lg:flex lg:flex-wrap lg:items-center lg:gap-4">
      {filtersTrigger}
      {sort}
      {listMode}
    </div>
  </div>
);
