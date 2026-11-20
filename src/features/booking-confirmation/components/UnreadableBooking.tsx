import { AlertCircleIcon, EmptyState, FocusOnMount } from "@/shared/ui";
import { NewSearchLink } from "./NewSearchLink";

/** Reserva existe, mas o corpo está fora do contrato: tentar de novo não resolve. */
export const UnreadableBooking = () => (
  <div className="w-full max-w-3xl">
    <EmptyState
      headingLevel={1}
      icon={<AlertCircleIcon className="size-8" />}
      title="Não foi possível exibir esta reserva"
      description="Os dados desta reserva estão incompletos. Tentar de novo não resolve: faça uma nova busca."
      action={<NewSearchLink />}
    />
    <FocusOnMount selector="h1" />
  </div>
);
