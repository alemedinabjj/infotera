import type { Metadata } from "next";
import { SearchForm } from "@/features/search-form";
import { alternatesFor } from "@/shared/i18n/paths";
import { CHOOSE_ROOM_NOTICE, HOME_NOTICE_PARAM } from "@/shared/lib/links";
import { Alert } from "@/shared/ui";

export const metadata: Metadata = {
  title: "Buscar hotéis | Infotera Hotéis",
  alternates: { languages: alternatesFor("/") },
};

const HEADING_ID = "search-heading";

const HomePage = async ({ searchParams }: PageProps<"/[locale]">) => {
  const notice = (await searchParams)[HOME_NOTICE_PARAM];
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 lg:gap-12">
      {notice === CHOOSE_ROOM_NOTICE ? (
        <Alert tone="info">Escolha um quarto para continuar.</Alert>
      ) : null}
      <header>
        <h1 id={HEADING_ID} className="text-2xl font-bold text-fg lg:text-3xl">
          Encontre seu hotel
        </h1>
        <p className="mt-2 text-fg-muted">
          Compare preços e veja o total da estadia antes de reservar.
        </p>
      </header>
      <SearchForm labelledBy={HEADING_ID} />
    </div>
  );
};

export default HomePage;
