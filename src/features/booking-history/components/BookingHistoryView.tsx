"use client";

import Link from "next/link";
import { useRef } from "react";
import { useOnline } from "@/shared/hooks/useOnline";
import { useSlowLoading } from "@/shared/hooks/useSlowLoading";
import { focusWhenReady } from "@/shared/lib/focus";
import { revealBelowHeader } from "@/shared/lib/scroll";
import {
  Alert,
  buttonClassName,
  EmptyState,
  FocusOnMount,
  Skeleton,
  WifiOffIcon,
} from "@/shared/ui";
import { useBookingHistory } from "../hooks/useBookingHistory";
import { useHistoryRows } from "../hooks/useHistoryRows";
import { HISTORY_MESSAGES } from "../model/messages";
import { ClearHistoryButton } from "./ClearHistoryButton";
import { HistoryRowItem } from "./HistoryRowItem";

const MESSAGES = HISTORY_MESSAGES;

const LoadingList = ({ slow }: { slow: boolean }) => (
  <div aria-busy="true" className="flex flex-col gap-4">
    <p aria-live="polite" className="text-sm text-fg-muted">
      {slow ? MESSAGES.slow : MESSAGES.loading}
    </p>
    <Skeleton shape="block" className="h-44" />
  </div>
);

/** Página `/my-bookings`: reservas guardadas neste navegador, com estado por linha. */
export const BookingHistoryView = () => {
  const page = useHistoryRows();
  const live = useBookingHistory();
  const online = useOnline();
  const slow = useSlowLoading(!page.hydrated || page.pending);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const hasRows = page.rows.length > 0;
  // O botão e o dialog desmontam junto com a lista (o navegador devolve o foco ao `body`): foca no
  // quadro seguinte, até conseguir.
  const focusTitle = () => {
    focusWhenReady(
      () => titleRef.current,
      () => revealBelowHeader(titleRef.current),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <FocusOnMount selector="#history-title" />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1
            id="history-title"
            ref={titleRef}
            tabIndex={-1}
            className="text-2xl font-bold text-fg lg:text-3xl"
          >
            {MESSAGES.title}
          </h1>
          <p className="text-fg-muted">
            {MESSAGES.intro} {MESSAGES.sharedComputer}
          </p>
        </div>
        {hasRows && live.length > 0 ? (
          <ClearHistoryButton
            entries={live}
            onCleared={() => {
              page.resetSnapshot();
              focusTitle();
            }}
            onRestored={page.resetSnapshot}
          />
        ) : null}
      </div>
      {online ? null : (
        <Alert
          tone="warning"
          title={MESSAGES.offline.title}
          icon={<WifiOffIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />}
        >
          {MESSAGES.offline.description}
        </Alert>
      )}
      {page.vanished > 0 ? <Alert tone="info">{MESSAGES.vanished(page.vanished)}</Alert> : null}
      {!page.hydrated ? <LoadingList slow={slow} /> : null}
      {page.hydrated && page.pending ? (
        <p aria-live="polite" className="min-h-5 text-sm text-fg-muted">
          {slow ? MESSAGES.slow : null}
        </p>
      ) : null}
      {page.hydrated && !hasRows ? (
        <EmptyState
          title={MESSAGES.empty.title}
          description={MESSAGES.empty.description}
          action={
            <Link href="/" className={buttonClassName({ variant: "primary" })}>
              {MESSAGES.empty.action}
            </Link>
          }
        />
      ) : null}
      {page.hydrated && hasRows ? (
        <ul
          // biome-ignore lint/a11y/noRedundantRoles: sem `list-style` o Safari deixa de anunciar a lista
          role="list"
          className="flex flex-col gap-4"
        >
          {page.rows.map((row, index) => (
            <HistoryRowItem
              key={row.entry.id}
              row={row}
              index={index}
              kept={page.liveIds.has(row.entry.id)}
              hotels={page.hotels}
              retrying={page.retrying(row.entry.id)}
              offline={!online}
              onRetry={() => page.retry(row.entry.id)}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
};
