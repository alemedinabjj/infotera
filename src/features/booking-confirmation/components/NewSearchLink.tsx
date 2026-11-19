"use client";

import Link from "next/link";
import { cn } from "@/shared/lib/cn";
import { useBookingDraftActions } from "@/shared/stores/booking-draft";
import { buttonClassName } from "@/shared/ui";

type NewSearchLinkProps = {
  variant?: "primary" | "ghost";
  /** Largura total abaixo de `sm` (ação final da página). */
  responsiveWidth?: boolean;
};

/**
 * "Fazer nova busca": um `<Link href="/">` (navegação com semântica de link, funciona sem JS)
 * que, com JS, limpa a seleção do `booking-draft` antes de sair: "nova busca" é recomeçar, mesmo
 * que a pessoa tenha chegado por outra aba ou pelo histórico com uma seleção antiga.
 */
export const NewSearchLink = ({
  variant = "primary",
  responsiveWidth = false,
}: NewSearchLinkProps) => {
  const { clearSelection } = useBookingDraftActions();
  return (
    <Link
      href="/"
      onClick={clearSelection}
      className={cn(
        buttonClassName({ variant }),
        responsiveWidth && "w-full sm:w-auto",
        "print:hidden",
      )}
    >
      Fazer nova busca
    </Link>
  );
};
