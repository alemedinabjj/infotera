"use client";

import Link from "next/link";
import { useLocale } from "@/shared/i18n/client";
import { localizePath } from "@/shared/i18n/paths";
import {
  Alert,
  buttonClassName,
  EmptyState,
  ErrorState,
  FocusOnMount,
  WifiOffIcon,
} from "@/shared/ui";
import { useFavoritesMessages } from "../hooks/useFavoritesMessages";
import { useFavoritesPage } from "../hooks/useFavoritesPage";
import { FavoriteCard } from "./FavoriteCard";
import { FavoritesSkeleton } from "./FavoritesSkeleton";

type Page = ReturnType<typeof useFavoritesPage>;

const Body = ({ page }: { page: Page }) => {
  const MESSAGES = useFavoritesMessages();
  const locale = useLocale();
  switch (page.view) {
    case "hydrating":
    case "loading":
      return <FavoritesSkeleton count={page.entries.size} slow={page.slow} />;
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
          onRetry={page.retry}
          retrying={page.retrying}
        />
      );
    case "empty":
      return (
        <EmptyState
          title={MESSAGES.empty.title}
          description={MESSAGES.empty.description}
          action={
            <Link
              href={localizePath(locale, "/")}
              className={buttonClassName({ variant: "primary" })}
            >
              {MESSAGES.empty.action}
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
  const MESSAGES = useFavoritesMessages();
  const page = useFavoritesPage();
  return (
    <div className="flex flex-col gap-4">
      <FocusOnMount selector="#favorites-title" />
      <h1 id="favorites-title" tabIndex={-1} className="text-2xl font-bold text-fg lg:text-3xl">
        {MESSAGES.title}
      </h1>
      <p aria-live="polite" className="min-h-5 text-sm text-fg-muted">
        {page.view === "success" ? MESSAGES.count(page.liveCount) : null}
      </p>
      <Body page={page} />
    </div>
  );
};
