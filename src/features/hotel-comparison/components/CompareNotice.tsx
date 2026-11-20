import Link from "next/link";
import { searchHref } from "@/shared/lib/links";
import { FAVORITES_PATH } from "@/shared/saved";
import { Alert, buttonClassName } from "@/shared/ui";
import { COMPARISON_MESSAGES } from "../model/messages";

const MESSAGES = COMPARISON_MESSAGES;

type CompareNoticeProps = {
  /** Hotéis que a API não devolveu. */
  notFound: number;
  /** Menos de 2 colunas: a comparação não faz sentido. */
  needMore: boolean;
  destination: string | null;
};

/** Avisos acima da tabela: "< 2 hotéis" e "hotel não encontrado". */
export const CompareNotice = ({ notFound, needMore, destination }: CompareNoticeProps) => (
  <>
    {notFound > 0 ? <Alert tone="info">{MESSAGES.notFound(notFound)}</Alert> : null}
    {needMore ? (
      <Alert
        tone="info"
        title={MESSAGES.needTwo.title}
        action={
          <div className="flex flex-wrap gap-3">
            <Link
              href={destination ? searchHref(destination, null) : "/"}
              className={buttonClassName({ variant: "secondary", size: "sm" })}
            >
              {destination ? MESSAGES.needTwo.search(destination) : MESSAGES.needTwo.searchAny}
            </Link>
            <Link
              href={FAVORITES_PATH}
              className={buttonClassName({ variant: "ghost", size: "sm" })}
            >
              {MESSAGES.needTwo.favorites}
            </Link>
          </div>
        }
      >
        {MESSAGES.needTwo.description}
      </Alert>
    ) : null}
  </>
);
