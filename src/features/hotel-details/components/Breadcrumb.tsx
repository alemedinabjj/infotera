import Link from "next/link";
import { ArrowLeftIcon, ChevronRightIcon } from "@/shared/ui";
import type { BreadcrumbItem } from "../model/breadcrumb";

type BreadcrumbProps = {
  /** Nome acessível do `nav` (já no idioma). */
  navLabel: string;
  items: readonly BreadcrumbItem[];
  /** Nível acima: no celular o breadcrumb vira só este link ("← Hotéis em São Paulo"). */
  backHref: string;
  backLabel: string;
};

const LINK = "text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2";

/** `nav` "Você está aqui". Abaixo de `sm`, só o link de voltar (não quebra em 320 px). */
export const Breadcrumb = ({ navLabel, items, backHref, backLabel }: BreadcrumbProps) => (
  <nav aria-label={navLabel}>
    <ol className="hidden flex-wrap items-center gap-x-1 gap-y-1 text-sm sm:flex">
      {items.map((item, index) => (
        <li key={item.label} className="flex items-center gap-1">
          {index > 0 ? (
            <ChevronRightIcon aria-hidden="true" className="size-4 shrink-0 text-fg-subtle" />
          ) : null}
          {item.href ? (
            <Link href={item.href} className={`${LINK} py-2`}>
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="font-medium text-fg">
              {item.label}
            </span>
          )}
        </li>
      ))}
    </ol>
    <Link
      href={backHref}
      className={`${LINK} inline-flex min-h-11 items-center gap-1 text-sm sm:hidden`}
    >
      <ArrowLeftIcon aria-hidden="true" className="size-4" />
      {backLabel}
    </Link>
  </nav>
);
