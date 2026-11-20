import { Alert, Button, Skeleton } from "@/shared/ui";
import { HISTORY_MESSAGES } from "../model/messages";

const MESSAGES = HISTORY_MESSAGES;

/**
 * Skeleton da linha: mesma estrutura e alturas do `HistoryItem` em cada breakpoint (selo 24,
 * título 28, datas em 2 linhas abaixo de `sm`, total 28, "Reservada em" 20 e os dois botões que
 * se empilham no celular), para o card não crescer quando a reserva chega.
 */
export const HistoryItemSkeleton = () => (
  <div aria-busy="true" className="flex flex-col sm:flex-row">
    <Skeleton shape="block" className="hidden min-h-32 w-40 shrink-0 rounded-none sm:block" />
    <div className="flex flex-1 flex-col gap-1 p-4">
      <div className="min-h-6">
        <Skeleton className="h-6 w-28" />
      </div>
      <Skeleton className="h-7 w-3/4" />
      <div className="flex flex-col">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-1/2 sm:hidden" />
      </div>
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-5 w-48" />
      <div className="mt-2 flex flex-wrap gap-3">
        <Skeleton shape="block" className="h-11 w-28" />
        <Skeleton shape="block" className="h-11 w-44" />
      </div>
    </div>
  </div>
);

type FailedProps = {
  unreadable: boolean;
  retrying: boolean;
  onRetry: () => void;
  removeButton: React.ReactNode;
};

/** Erro de uma linha: o id continua no storage; "Tentar de novo" refaz só esta reserva. */
export const HistoryItemFailed = ({ unreadable, retrying, onRetry, removeButton }: FailedProps) => (
  <div className="flex min-h-44 flex-col justify-center gap-3 p-4">
    <Alert tone="danger">{unreadable ? MESSAGES.unreadable : MESSAGES.failed}</Alert>
    <div className="flex flex-wrap gap-3">
      {unreadable ? null : (
        <Button
          variant="secondary"
          size="sm"
          loading={retrying}
          loadingText={MESSAGES.retrying}
          onClick={onRetry}
        >
          {MESSAGES.retry}
        </Button>
      )}
      {removeButton}
    </div>
  </div>
);
