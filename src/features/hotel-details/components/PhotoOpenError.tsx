import { useLocale } from "@/shared/i18n/client";
import { ErrorState } from "@/shared/ui";
import { useHotelDetailsMessages } from "../hooks/useHotelDetailsMessages";

type PhotoOpenErrorProps = { online: boolean; onRetry: () => void };

/**
 * Corpo do erro ao abrir a foto (rota falhou ou sem internet): cartão **claro** sobre a moldura escura
 * (`fg-muted` sobre `bg-fg` não passa AA). O Dialog `full` pinta o anel de foco de branco; dentro do
 * cartão os botões voltam ao anel `focus` padrão (seletor mais específico que o do Dialog).
 */
export const PhotoOpenError = ({ online, onRetry }: PhotoOpenErrorProps) => {
  const t = useHotelDetailsMessages().gallery;
  const locale = useLocale();
  return (
    <div className="flex size-full items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-card bg-surface p-6 text-fg [&_button:focus-visible]:outline-focus">
        <ErrorState
          locale={locale}
          variant="inline"
          headingLevel={3}
          title={online ? t.openError : t.offlineTitle}
          description={online ? t.openErrorBody : t.offlineBody}
          onRetry={onRetry}
        />
      </div>
    </div>
  );
};

/** Seletor do "Tentar de novo": o foco inicial do erro. */
export const PHOTO_RETRY_SELECTOR = "[role='alert'] button";
