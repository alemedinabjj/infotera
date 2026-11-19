import { Alert } from "@/shared/ui";

/** Hotel sem quartos: avisa e leva aos similares (âncora, sem JS). */
export const SoldOutAlert = ({ hasDates }: { hasDates: boolean }) => (
  <Alert
    tone="warning"
    title={
      hasDates
        ? "Este hotel está esgotado nestas datas"
        : "Este hotel está sem quartos disponíveis no momento"
    }
    action={
      <a href="#similares" className="w-fit font-medium text-primary hover:underline">
        Ver hotéis similares
      </a>
    }
  >
    Veja opções parecidas na mesma região.
  </Alert>
);
