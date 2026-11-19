"use client";

import { type ComponentProps, Fragment, useEffect, useRef } from "react";
import type { Suggestion } from "@/shared/api/schemas";
import { cn } from "@/shared/lib/cn";
import { BuildingIcon, PalmTreeIcon, TreesIcon, UmbrellaIcon, VisuallyHidden } from "@/shared/ui";
import { highlightMatch } from "../model/suggestion-text";

type SuggestionType = Suggestion["type"];

const TYPE_LABELS: Record<SuggestionType, string> = {
  city: "Cidade",
  beach: "Praia",
  island: "Ilha",
  nature: "Natureza",
};

const TypeIcon = ({ type }: { type: SuggestionType }) => {
  switch (type) {
    case "city":
      return <BuildingIcon className="size-5 shrink-0" />;
    case "beach":
      return <UmbrellaIcon className="size-5 shrink-0" />;
    case "island":
      return <PalmTreeIcon className="size-5 shrink-0" />;
    case "nature":
      return <TreesIcon className="size-5 shrink-0" />;
    default: {
      const unreachable: never = type;
      return unreachable;
    }
  }
};

type SuggestionOptionProps = Omit<ComponentProps<"li">, "children"> & {
  suggestion: Suggestion;
  query: string;
  active: boolean;
};

/** Opção do listbox: ícone do tipo, nome com o trecho digitado realçado e tipo à direita. */
export const SuggestionOption = ({
  suggestion,
  query,
  active,
  className,
  ...rest
}: SuggestionOptionProps) => {
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (active) ref.current?.scrollIntoView?.({ block: "nearest" });
  }, [active]);

  return (
    <li
      ref={ref}
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-3 py-1",
        active ? "bg-primary-soft" : "hover:bg-surface-sunken",
        className,
      )}
      {...rest}
    >
      <span className={active ? "text-primary" : "text-fg-muted"}>
        <TypeIcon type={suggestion.type} />
      </span>
      <span className="min-w-0 flex-1 text-base text-fg">
        {highlightMatch(suggestion.name, query).map((segment) =>
          segment.match ? (
            <mark key={`m-${segment.offset}`} className="bg-transparent font-semibold text-inherit">
              {segment.text}
            </mark>
          ) : (
            <Fragment key={`t-${segment.offset}`}>{segment.text}</Fragment>
          ),
        )}
      </span>
      <span className="text-sm text-fg-subtle">
        <VisuallyHidden>, </VisuallyHidden>
        {TYPE_LABELS[suggestion.type]}
      </span>
    </li>
  );
};
