"use client";

import Link from "next/link";
import { cn } from "../../lib/cn";
import { Button } from "../../ui/atoms/Button";
import { buttonClassName } from "../../ui/atoms/button-styles";
import { useSavedMessages } from "../hooks/useSavedMessages";
import { announceCompare } from "../stores/announcer";

type CompareTrayActionProps = { count: number; href: string };

/**
 * "Comparar" da bandeja: `Link` com 2 ou mais hotéis; com 1 vira botão `aria-disabled` que, ao
 * clicar, anuncia o motivo (continua focável).
 */
export const CompareTrayAction = ({ count, href }: CompareTrayActionProps) => {
  const MESSAGES = useSavedMessages().tray;
  const compareMessages = useSavedMessages().compare;
  if (count < 2) {
    return (
      <Button
        aria-disabled
        className="shrink-0"
        onClick={() => announceCompare(compareMessages.needTwo)}
      >
        {MESSAGES.action}
      </Button>
    );
  }
  return (
    <Link
      href={href}
      aria-label={MESSAGES.actionLabel(count)}
      className={cn(
        buttonClassName({ variant: "primary", size: "md" }),
        "shrink-0 whitespace-nowrap",
      )}
    >
      {/* Um único item flex: o espaço entre "Comparar" e "3 hotéis" é um só (sem `gap` extra). */}
      <span>
        {MESSAGES.action}
        <span aria-hidden="true" className="hidden sm:inline">
          {" "}
          {MESSAGES.actionCount(count)}
        </span>
      </span>
    </Link>
  );
};
