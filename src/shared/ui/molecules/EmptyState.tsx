import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { SearchIcon } from "../icons";

type EmptyStateProps = {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  /** Ações (até duas): a primária primeiro. */
  action?: ReactNode;
  className?: string;
};

/** Estado vazio: diz o que aconteceu e o que fazer agora. Anunciado com `role="status"`. */
export const EmptyState = ({ title, description, icon, action, className }: EmptyStateProps) => (
  <div
    role="status"
    className={cn("flex flex-col items-center gap-3 py-12 text-center", className)}
  >
    <span className="flex size-16 items-center justify-center rounded-full bg-surface-sunken text-fg-subtle">
      {icon ?? <SearchIcon className="size-8" />}
    </span>
    <h2 className="text-lg font-semibold text-fg">{title}</h2>
    {description ? <p className="max-w-prose text-fg-muted">{description}</p> : null}
    {action ? <div className="mt-2 flex flex-wrap justify-center gap-3">{action}</div> : null}
  </div>
);
