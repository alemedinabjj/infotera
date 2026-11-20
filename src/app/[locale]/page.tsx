import type { Metadata } from "next";
import { Suspense } from "react";
import { InstallPromptCard } from "@/features/app-shell";
import { SearchForm } from "@/features/search-form";
import { commonMessages } from "@/shared/i18n/common/messages";
import { isLocale } from "@/shared/i18n/config";
import { alternatesFor } from "@/shared/i18n/paths";
import { HomeNotice } from "./HomeNotice";

export const generateMetadata = async ({ params }: PageProps<"/[locale]">): Promise<Metadata> => {
  const { locale } = await params;
  return {
    title: isLocale(locale) ? commonMessages.get(locale).routes.home.metaTitle : undefined,
    alternates: { languages: alternatesFor("/") },
  };
};

const HEADING_ID = "search-heading";

const HomePage = async ({ params }: PageProps<"/[locale]">) => {
  const { locale } = await params;
  const t = commonMessages.get(isLocale(locale) ? locale : "pt-BR").routes.home;
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 lg:gap-12">
      <Suspense fallback={null}>
        <HomeNotice />
      </Suspense>
      <header>
        <h1 id={HEADING_ID} className="text-2xl font-bold text-fg lg:text-3xl">
          {t.heading}
        </h1>
        <p className="mt-2 text-fg-muted">{t.subtitle}</p>
      </header>
      <SearchForm labelledBy={HEADING_ID} />
      <InstallPromptCard />
    </div>
  );
};

export default HomePage;
