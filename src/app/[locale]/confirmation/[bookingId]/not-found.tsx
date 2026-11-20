import { confirmationMessages, NewSearchLink } from "@/features/booking-confirmation";
import { getLocale } from "@/shared/i18n/server";
import { EmptyState, FocusOnMount } from "@/shared/ui";

/** Reserva inexistente ou id fora do formato: nenhuma chamada à API foi feita nesse caso. */
const ConfirmationNotFound = async () => {
  const t = confirmationMessages.get(await getLocale());
  return (
    <div className="w-full max-w-3xl">
      <title>{`${t.titles.notFound} | ${t.site}`}</title>
      <meta name="robots" content="noindex, nofollow" />
      <EmptyState
        headingLevel={1}
        title={t.notFound.title}
        description={t.notFound.description}
        action={<NewSearchLink />}
      />
      <FocusOnMount selector="h1" />
    </div>
  );
};

export default ConfirmationNotFound;
