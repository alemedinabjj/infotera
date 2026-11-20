import Link from "next/link";
import { Button, buttonClassName, EmptyState } from "@/shared/ui";

type ResultsEmptyProps =
  | { kind: "destination"; destination: string }
  | { kind: "filters"; onClear: () => void };

/** Vazio útil: diz o que fazer agora (nova busca ou limpar filtros). */
export const ResultsEmpty = (props: ResultsEmptyProps) =>
  props.kind === "destination" ? (
    <EmptyState
      title={`Nenhum hotel em ${props.destination}`}
      description="Ainda não temos hospedagens neste destino. Tente uma cidade próxima."
      action={
        <Link href="/" className={buttonClassName({ variant: "primary" })}>
          Fazer nova busca
        </Link>
      }
    />
  ) : (
    <EmptyState
      title="Nenhum hotel com esses filtros"
      description="Tente aumentar a faixa de preço ou remover alguma comodidade."
      action={<Button onClick={props.onClear}>Limpar filtros</Button>}
    />
  );
