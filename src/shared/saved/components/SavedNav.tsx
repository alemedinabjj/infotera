"use client";

import { m, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { motionPreset } from "../../lib/motion";
import { buttonClassName } from "../../ui/atoms/button-styles";
import { HeartIcon, SuitcaseIcon } from "../../ui/icons";
import { SAVED_MESSAGES } from "../messages";
import { FAVORITES_PATH, MY_BOOKINGS_PATH } from "../model/routes";
import { useFavoriteCount, useFavoritesHydrated } from "../stores/favorites";

const MESSAGES = SAVED_MESSAGES.nav;

const LINK = "relative px-0 sm:px-3 size-11 sm:size-auto";

type NavLinkProps = {
  href: string;
  current: boolean;
  label: string;
  text: string;
  icon: ReactNode;
  badge?: ReactNode;
};

const NavLink = ({ href, current, label, text, icon, badge }: NavLinkProps) => (
  <Link
    href={href}
    aria-label={label}
    aria-current={current ? "page" : undefined}
    className={cn(
      buttonClassName({ variant: "ghost", size: "sm" }),
      LINK,
      current && "text-primary underline underline-offset-4",
    )}
  >
    {icon}
    <span className="hidden sm:inline">{text}</span>
    {badge}
  </Link>
);

/** Contador com espaço reservado (`min-w-5`, `invisible` com 0): nada se move ao hidratar. */
const Counter = ({ count }: { count: number }) => {
  const hydrated = useFavoritesHydrated();
  const reduced = useReducedMotion() ?? false;
  const previous = useRef<number | null>(null);
  const [pulses, setPulses] = useState(0);
  const preset = motionPreset("badge-pulse", reduced);

  useEffect(() => {
    if (!hydrated) return;
    if (previous.current !== null && count > previous.current) setPulses((value) => value + 1);
    previous.current = count;
  }, [count, hydrated]);

  return (
    <m.span
      key={pulses}
      aria-hidden="true"
      // `false` até o 1º pulso: o servidor e a hidratação não podem depender de `reduced motion`.
      initial={pulses > 0 ? preset.initial : false}
      animate={pulses > 0 ? preset.animate : undefined}
      transition={preset.transition}
      className={cn(
        "absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-fg-on-primary tabular-nums sm:static",
        count === 0 && "invisible",
      )}
    >
      {count}
    </m.span>
  );
};

/** Links "Favoritos" (com contador) e "Minhas reservas" do cabeçalho. Só ícone abaixo de `sm`. */
export const SavedNav = () => {
  const pathname = usePathname();
  const count = useFavoriteCount();
  return (
    <nav aria-label={MESSAGES.label} className="flex items-center gap-1">
      <NavLink
        href={FAVORITES_PATH}
        current={pathname === FAVORITES_PATH}
        label={MESSAGES.favoritesLabel(count)}
        text={MESSAGES.favorites}
        icon={<HeartIcon className="size-5" />}
        badge={<Counter count={count} />}
      />
      <NavLink
        href={MY_BOOKINGS_PATH}
        current={pathname === MY_BOOKINGS_PATH}
        label={MESSAGES.myBookings}
        text={MESSAGES.myBookings}
        icon={<SuitcaseIcon className="size-5" />}
      />
    </nav>
  );
};
