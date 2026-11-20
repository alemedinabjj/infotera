"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCommonMessages } from "../../i18n/common/useCommonMessages";
import { cn } from "../../lib/cn";
import { getPaginationRange } from "../../lib/pagination";
import { ChevronLeftIcon, ChevronRightIcon } from "../icons";

type PaginationMode =
  | { getHref: (page: number) => string; onPageChange?: never }
  | { onPageChange: (page: number) => void; getHref?: never };

type PaginationProps = PaginationMode & {
  page: number;
  totalPages: number;
  /** Nome da landmark `<nav>`. */
  label?: string;
  previousLabel?: string;
  nextLabel?: string;
  /** Texto "Página 5 de 12" exibido no mobile. */
  summaryLabel?: (page: number, totalPages: number) => string;
  className?: string;
};

type ItemProps = {
  target: number;
  current?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  children: ReactNode;
} & PaginationMode;

const ITEM_BASE =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-control px-3 text-base font-medium tabular-nums transition-colors duration-150 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const PageItem = ({
  target,
  current,
  disabled,
  ariaLabel,
  className,
  children,
  getHref,
  onPageChange,
}: ItemProps) => {
  const classes = cn(
    ITEM_BASE,
    current ? "bg-primary text-fg-on-primary" : "text-primary hover:bg-primary-soft",
    disabled && "cursor-not-allowed text-fg-subtle hover:bg-transparent",
    className,
  );
  const ariaCurrent = current ? "page" : undefined;

  if (getHref) {
    return disabled ? (
      <span aria-disabled="true" className={classes}>
        {children}
      </span>
    ) : (
      <Link
        href={getHref(target)}
        aria-label={ariaLabel}
        aria-current={ariaCurrent}
        className={classes}
      >
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
      className={classes}
      onClick={() => onPageChange?.(target)}
    >
      {children}
    </button>
  );
};

/** Paginação em modo link (`getHref`, URL como estado) ou botão (`onPageChange`). */
export const Pagination = ({
  page,
  totalPages,
  label,
  previousLabel,
  nextLabel,
  summaryLabel,
  className,
  ...mode
}: PaginationProps) => {
  const t = useCommonMessages().pagination;
  if (totalPages <= 1) return null;
  const summary = summaryLabel ?? ((current, total) => t.summary({ page: current, total }));

  return (
    <nav
      aria-label={label ?? t.label}
      className={cn("flex items-center justify-center gap-1", className)}
    >
      <PageItem {...mode} target={page - 1} disabled={page <= 1}>
        <ChevronLeftIcon className="size-4" />
        {previousLabel ?? t.previous}
      </PageItem>
      <p className="px-2 text-base text-fg-muted tabular-nums sm:hidden">
        {summary(page, totalPages)}
      </p>
      <ul className="hidden items-center gap-1 sm:flex">
        {getPaginationRange({ page, totalPages }).map((item) => (
          <li key={item}>
            {typeof item === "string" ? (
              <span aria-hidden="true" className="px-2 text-fg-subtle">
                …
              </span>
            ) : (
              <PageItem
                {...mode}
                target={item}
                current={item === page}
                ariaLabel={t.page({ page: item })}
              >
                {item}
              </PageItem>
            )}
          </li>
        ))}
      </ul>
      <PageItem {...mode} target={page + 1} disabled={page >= totalPages}>
        {nextLabel ?? t.next}
        <ChevronRightIcon className="size-4" />
      </PageItem>
    </nav>
  );
};
