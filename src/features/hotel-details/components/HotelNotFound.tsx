import Link from "next/link";
import { buttonClassName, EmptyState } from "@/shared/ui";

/** Hotel inexistente ou id inválido: ocupa a página (h1) e leva a uma nova busca. */
export const HotelNotFound = () => (
  <EmptyState
    headingLevel={1}
    title="Hotel não encontrado"
    description="O link pode estar errado ou o hotel não está mais disponível."
    action={
      <Link href="/" className={buttonClassName()}>
        Fazer nova busca
      </Link>
    }
  />
);
