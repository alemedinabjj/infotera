"use client";

import { useRouter } from "next/navigation";
import { useOnline } from "@/shared/hooks/useOnline";
import { useLocale } from "@/shared/i18n/client";
import { Button, ErrorState } from "@/shared/ui";
import { useHotelDetailsMessages } from "../hooks/useHotelDetailsMessages";

type PhotoModalErrorProps = { retry: () => void };

/**
 * Erro ao abrir a foto no modal (RSC 500, rede). Mesma moldura escura do modal; o corpo é um cartão
 * **claro** (texto `fg-muted` sobre `bg-fg` não passa AA) e os botões usam o anel `focus` padrão, não o
 * branco do Dialog `full`. "Fechar" faz o mesmo que Esc: volta uma entrada, para o hotel.
 */
export const PhotoModalError = ({ retry }: PhotoModalErrorProps) => {
  const t = useHotelDetailsMessages().gallery;
  const locale = useLocale();
  const router = useRouter();
  const online = useOnline();
  return (
    <div className="fixed inset-0 z-50 flex h-dvh items-center justify-center bg-fg">
      <div className="w-[calc(100%-2rem)] max-w-sm rounded-card bg-surface p-6">
        <ErrorState
          locale={locale}
          variant="inline"
          title={online ? t.openError : t.offlineTitle}
          description={online ? t.openErrorBody : t.offlineBody}
          onRetry={() => {
            retry();
            router.refresh();
          }}
          action={
            <Button variant="ghost" onClick={() => router.back()}>
              {t.close}
            </Button>
          }
        />
      </div>
    </div>
  );
};
