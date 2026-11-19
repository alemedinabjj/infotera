import type { Metadata } from "next";
import Link from "next/link";
import { buttonClassName } from "@/shared/ui/atoms/Button";
import { EmptyState } from "@/shared/ui/molecules/EmptyState";

export const metadata: Metadata = { title: "Página não encontrada | Infotera Hotéis" };

const NotFound = () => (
  <EmptyState
    headingLevel={1}
    title="Página não encontrada"
    description="O endereço pode estar errado ou a página não existe mais."
    action={
      <Link href="/" className={buttonClassName({ variant: "primary" })}>
        Voltar para a busca
      </Link>
    }
  />
);

export default NotFound;
