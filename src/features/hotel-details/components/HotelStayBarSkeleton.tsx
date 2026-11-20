import { cardClassName, Skeleton } from "@/shared/ui";

/**
 * Fallback do `HotelStayBar` na casca: a geometria do caso com datas (o fluxo vindo da busca):
 * card `p-4` com rótulo, resumo e botão pequeno. Sem pulso e `aria-hidden`.
 */
export const HotelStayBarSkeleton = () => (
  <div aria-hidden="true" className="flex flex-col gap-4">
    <div
      className={cardClassName({
        className: "gap-3 p-4 sm:flex-row sm:items-center sm:justify-between",
      })}
    >
      <div className="flex flex-col gap-1">
        <Skeleton className="h-5 w-20 animate-none" />
        <Skeleton className="h-6 w-64 max-w-full animate-none" />
      </div>
      <Skeleton shape="block" className="h-11 w-60 max-w-full animate-none" />
    </div>
  </div>
);
