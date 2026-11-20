import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchForm } from "@/features/search-form";
import { HomeNotice } from "./HomeNotice";

export const metadata: Metadata = {
  title: "Buscar hotéis | Infotera Hotéis",
};

const HEADING_ID = "search-heading";

const HomePage = () => {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 lg:gap-12">
      <Suspense fallback={null}>
        <HomeNotice />
      </Suspense>
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
