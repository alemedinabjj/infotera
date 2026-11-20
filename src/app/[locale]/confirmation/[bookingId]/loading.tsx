import { ConfirmationSkeleton } from "@/features/booking-confirmation";

/** Skeleton imediato enquanto a reserva carrega (cobre o cold start da API). */
const ConfirmationLoading = () => <ConfirmationSkeleton />;

export default ConfirmationLoading;
