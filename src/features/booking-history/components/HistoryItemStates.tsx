import { Alert, Button, Skeleton } from "@/shared/ui";
import { HISTORY_MESSAGES } from "../model/messages";

const MESSAGES = HISTORY_MESSAGES;

/** Skeleton da linha: mesma altura mínima do estado de erro. */
export const HistoryItemSkeleton = () => (
  <div aria-busy="true" className="flex min-h-44 flex-col gap-2 p-4">
    <Skeleton className="h-6 w-32" />
    <Skeleton className="h-7 w-3/4" />
    <Skeleton className="h-5 w-2/3" />
    <Skeleton className="h-7 w-28" />
    <Skeleton className="h-11 w-48" />
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
          loadingText="Tentando…"
          onClick={onRetry}
        >
          {MESSAGES.retry}
        </Button>
      )}
      {removeButton}
    </div>
  </div>
);
