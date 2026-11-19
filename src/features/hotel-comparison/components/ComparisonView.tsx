"use client";

import Link from "next/link";
import { compareHref, useComparison } from "@/shared/saved";
import {
  Alert,
  buttonClassName,
  ComparisonTable,
  EmptyState,
  ErrorState,
  FocusOnMount,
  WifiOffIcon,
} from "@/shared/ui";
import { COMPARE_TITLE_ID, removeColumn } from "../hooks/compare-url";
import { type ComparisonState, useComparisonPage } from "../hooks/useComparisonPage";
import { COMPARISON_MESSAGES } from "../model/messages";
import { CompareNotice } from "./CompareNotice";
import { ComparisonSkeleton } from "./ComparisonSkeleton";
import { HotelColumnHeader } from "./HotelColumnHeader";

const MESSAGES = COMPARISON_MESSAGES;

const EmptyCompare = () => {
  const tray = useComparison();
  return (
    <EmptyState
      title={MESSAGES.empty.title}
      description={MESSAGES.empty.description}
      action={
        <>
          <Link href="/" className={buttonClassName({ variant: "primary" })}>
            {MESSAGES.empty.search}
          </Link>
          {tray.length >= 2 ? (
            <Link
              href={compareHref(tray.map((entry) => entry.id))}
              className={buttonClassName({ variant: "secondary" })}
            >
              {MESSAGES.empty.tray(tray.length)}
            </Link>
          ) : null}
        </>
      }
    />
  );
};

type BodyProps = { state: ComparisonState; ids: readonly number[] };

const Body = ({ state, ids }: BodyProps) => {
  switch (state.kind) {
    case "empty":
      return <EmptyCompare />;
    case "loading":
      return <ComparisonSkeleton slow={state.slow} />;
    case "offline":
      return (
        <Alert
          tone="warning"
          title={MESSAGES.offline.title}
          icon={<WifiOffIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />}
        >
          {MESSAGES.offline.description}
        </Alert>
      );
    case "error":
      return (
        <ErrorState
          title={MESSAGES.error.title}
          description={MESSAGES.error.description}
          onRetry={state.retry}
          retrying={state.retrying}
        />
      );
    case "success": {
      const needMore = state.hotels.length < 2;
      return (
        <>
          <CompareNotice
            notFound={state.notFound}
            needMore={needMore}
            destination={state.hotels[0]?.destination ?? null}
          />
          {needMore ? null : (
            <ComparisonTable
              columns={state.hotels.map((hotel) => ({
                id: hotel.id,
                header: (
                  <HotelColumnHeader hotel={hotel} onRemove={(id) => removeColumn(ids, id)} />
                ),
              }))}
              rows={state.comparison.rows}
              messages={{
                caption: MESSAGES.caption(state.hotels.map((hotel) => hotel.name)),
                cornerLabel: MESSAGES.cornerLabel,
                onlyDifferences: MESSAGES.onlyDifferences,
                legend: MESSAGES.legend,
                scrollHint: MESSAGES.scrollHint,
                differs: MESSAGES.differs,
                empty: MESSAGES.noDifferences,
                announce: MESSAGES.announce,
              }}
            />
          )}
        </>
      );
    }
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
};

type ComparisonViewProps = {
  /** 1 na página; 2 quando a view entra num modal (F7c). A view não renderiza `<main>`. */
  headingLevel?: 1 | 2;
};

/**
 * Comparação lado a lado de até 3 hotéis, lida **só** da URL (`?hotel=1&hotel=4`): o link é
 * compartilhável e funciona sem storage. Os 4 estados + offline, avisos e remoção de coluna.
 */
export const ComparisonView = ({ headingLevel = 1 }: ComparisonViewProps) => {
  const { ids, state } = useComparisonPage();
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <div className="flex flex-col gap-4">
      <FocusOnMount selector={`#${COMPARE_TITLE_ID}`} />
      <Heading
        id={COMPARE_TITLE_ID}
        tabIndex={-1}
        className="text-2xl font-bold text-fg lg:text-3xl"
      >
        {MESSAGES.title}
      </Heading>
      <Body state={state} ids={ids} />
    </div>
  );
};

/** Fallback do `Suspense` da página: mesmo título e skeleton da tabela (sem salto de layout). */
export const ComparisonFallback = () => (
  <div className="flex flex-col gap-4">
    <h1 className="text-2xl font-bold text-fg lg:text-3xl">{MESSAGES.title}</h1>
    <ComparisonSkeleton slow={false} />
  </div>
);
