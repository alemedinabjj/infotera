import type { Locale } from "@/shared/i18n/config";
import { Skeleton } from "@/shared/ui";
import { confirmationMessages } from "../i18n/messages";

// A geometria acompanha o conteúdo final (medida no navegador, com o hotel do seed): abaixo de
// 360px o nome ocupa 3 linhas e o endereço 4; de 360 a 479px, 2 e 3; depois só 1 e 1 (a foto
// manda na altura). Cada linha tem a altura da linha de texto (28px do h3, 20px do texto menor),
// com a margem vertical fazendo o papel do espaço entre as barras.
const NAME_LINES = [
  { id: "n1", hidden: "", width: "w-3/4" },
  { id: "n2", hidden: "min-[480px]:hidden", width: "w-full" },
  { id: "n3", hidden: "min-[360px]:hidden", width: "w-full" },
] as const;
const ADDRESS_LINES = [
  { id: "a1", hidden: "", width: "w-full" },
  { id: "a2", hidden: "min-[480px]:hidden", width: "w-2/3" },
  { id: "a3", hidden: "min-[480px]:hidden", width: "w-full" },
  { id: "a4", hidden: "min-[360px]:hidden", width: "w-2/3" },
] as const;
// Abaixo de `md` cada item do cancelamento quebra em 2 linhas (6 no total); de `md` em diante, 3.
const POLICY_LINES = [
  { id: "p1", hidden: "", width: "w-full" },
  { id: "p2", hidden: "", width: "w-2/3" },
  { id: "p3", hidden: "", width: "w-full" },
  { id: "p4", hidden: "md:hidden", width: "w-2/3" },
  { id: "p5", hidden: "md:hidden", width: "w-full" },
  { id: "p6", hidden: "md:hidden", width: "w-2/3" },
] as const;

const HotelSkeleton = () => (
  <div>
    <div className="flex items-start gap-4">
      <Skeleton shape="block" className="aspect-[4/3] w-24 shrink-0 sm:w-40" />
      <div className="flex min-w-0 flex-1 flex-col">
        {NAME_LINES.map(({ id, hidden, width }) => (
          <Skeleton key={id} className={`my-1 h-5 ${width} ${hidden}`} />
        ))}
        <div className="mt-1 flex flex-col">
          {ADDRESS_LINES.map(({ id, hidden, width }) => (
            <Skeleton key={id} className={`my-0.5 h-4 ${width} ${hidden}`} />
          ))}
        </div>
      </div>
    </div>
    <Skeleton shape="block" className="mt-1 h-11 w-44" />
  </div>
);

const RoomSkeleton = () => (
  <div className="flex flex-col border-t border-border pt-4">
    <Skeleton className="my-0.5 h-4 w-14" />
    <Skeleton className="my-0.5 h-5 w-2/3" />
    <Skeleton className="my-0.5 h-4 w-1/2" />
  </div>
);

const PolicySkeleton = () => (
  <div className="flex flex-col gap-2 border-t border-border pt-4">
    <Skeleton className="my-0.5 h-5 w-28" />
    <Skeleton shape="block" className="h-5 w-44 rounded-full" />
    <div className="flex flex-col">
      {POLICY_LINES.map(({ id, hidden, width }) => (
        <Skeleton key={id} className={`my-0.5 h-4 ${width} ${hidden}`} />
      ))}
    </div>
  </div>
);

/**
 * Skeleton da área hotel/quarto/cancelamento, com a geometria do conteúdo (nada se move quando o
 * conteúdo chega; o E2E de layout mede o h2 "Hóspedes"). Termina no `border-t` das datas, que já
 * estão na tela.
 */
type StayDetailsSkeletonProps = { locale: Locale; announce?: boolean };

export const StayDetailsSkeleton = ({ locale, announce = true }: StayDetailsSkeletonProps) => (
  <div aria-busy="true" className="flex flex-col gap-4">
    {announce ? (
      <p aria-live="polite" className="sr-only">
        {confirmationMessages.get(locale).loadingStay}
      </p>
    ) : null}
    <HotelSkeleton />
    <RoomSkeleton />
    <PolicySkeleton />
  </div>
);
