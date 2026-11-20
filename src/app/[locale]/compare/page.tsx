import type { Metadata } from "next";
import { Suspense } from "react";
import {
  ComparisonFallback,
  ComparisonView,
  comparisonMessages,
} from "@/features/hotel-comparison";
import { isLocale } from "@/shared/i18n/config";

export const generateMetadata = async ({
  params,
}: PageProps<"/[locale]/compare">): Promise<Metadata> => {
  const { locale } = await params;
  return {
    title: isLocale(locale) ? comparisonMessages.get(locale).metaTitle : undefined,
    robots: { index: false },
  };
};

/** Casca estática: a view lê `?hotel=` no cliente, dentro do Suspense. */
const ComparePage = () => (
  <Suspense fallback={<ComparisonFallback />}>
    <ComparisonView />
  </Suspense>
);

export default ComparePage;
