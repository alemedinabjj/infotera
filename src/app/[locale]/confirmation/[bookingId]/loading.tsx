import { ConfirmationSkeleton } from "@/features/booking-confirmation";
import { getLocale } from "@/shared/i18n/server";

/** Skeleton imediato enquanto a reserva carrega (cobre o cold start da API). */
const ConfirmationLoading = async () => <ConfirmationSkeleton locale={await getLocale()} />;

export default ConfirmationLoading;
