import type { ReactNode } from "react";
import { Skeleton } from "@/shared/ui";
import { RoomFooterLayout } from "./RoomFooterLayout";

type RoomStayActionSkeletonProps = { badge: ReactNode; nightly: ReactNode };

/**
 * Fallback da casca: as alturas do total (`h-7` + `h-5`, sem folga entre as duas linhas, como o `PriceTag`) e do botão (`h-11`). Sem pulso
 * (`animate-none`): ele se resolve na mesma resposta e, sem JS, um pulso infinito diria
 * "carregando" para sempre. `aria-hidden` e sem texto (nenhum anúncio quando o conteúdo chega).
 */
export const RoomStayActionSkeleton = ({ badge, nightly }: RoomStayActionSkeletonProps) => (
  <RoomFooterLayout
    badge={badge}
    nightly={nightly}
    total={
      <div className="flex flex-col items-end">
        <Skeleton className="h-7 w-28 animate-none" />
        <Skeleton className="h-5 w-40 animate-none" />
      </div>
    }
    reason={null}
    action={<Skeleton shape="block" className="h-11 animate-none sm:ml-auto sm:w-56" />}
  />
);
