"use client";

import Link from "next/link";
import {
  Alert,
  buttonClassName,
  EmptyState,
  ErrorState,
  FocusOnMount,
  WifiOffIcon,
} from "@/shared/ui";
import { useFavoritesPage } from "../hooks/useFavoritesPage";
import { FAVORITES_MESSAGES } from "../model/messages";
import { FavoriteCard } from "./FavoriteCard";
import { FavoritesSkeleton } from "./FavoritesSkeleton";

type Page = ReturnType<typeof useFavoritesPage>;

const Body = ({ page }: { page: Page }) => {
  switch (page.view) {
    case "hydrating":
    case "loading":
      return <FavoritesSkeleton count={page.entries.size} slow={page.slow} />;
    case "offline":
      return (
        <Alert
          tone="warning"
          title={FAVORITES_MESSAGES.offline.title}
          icon={<WifiOffIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />}
        >
          {FAVORITES_MESSAGES.offline.description}
        </Alert>
      );
    case "error":
      return (
        <ErrorState
          title={FAVORITES_MESSAGES.error.title}
          description={FAVORITES_MESSAGES.error.description}
          onRetry={page.retry}
          retrying={page.retrying}
        />
      );
    case "empty":
      return (
        <EmptyState
          title={FAVORITES_MESSAGES.empty.title}
          description={FAVORITES_MESSAGES.empty.description}
          action={
            <Link href="/" className={buttonClassName({ variant: "primary" })}>
              {FAVORITES_MESSAGES.empty.action}
            </Link>
          }
        />
      );
    case "success":
      return (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {page.hotels.map((hotel, index) => (
            <FavoriteCard
              key={hotel.id}
              hotel={hotel}
              entry={page.entries.get(hotel.id)}
              index={index}
              price={page.priceOf(hotel.id)}
            />
          ))}
        </ul>
      );
    default: {
      const unreachable: never = page.view;
      return unreachable;
    }
  }
};

/** Página `/favorites`: lista com os 4 estados (+ offline). O estado de remoção é por card. */
export const FavoritesView = () => {
  const page = useFavoritesPage();
  return (
    <div className="flex flex-col gap-4">
      <FocusOnMount selector="#favorites-title" />
      <h1 id="favorites-title" tabIndex={-1} className="text-2xl font-bold text-fg lg:text-3xl">
        {FAVORITES_MESSAGES.title}
      </h1>
      <p aria-live="polite" className="min-h-5 text-sm text-fg-muted">
        {page.view === "success" ? FAVORITES_MESSAGES.count(page.liveCount) : null}
      </p>
      <Body page={page} />
    </div>
  );
};
