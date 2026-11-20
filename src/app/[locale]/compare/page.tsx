import type { Metadata } from "next";
import { Suspense } from "react";
import {
  ComparisonFallback,
  ComparisonView,
  comparisonMessages,
} from "@/features/hotel-comparison";
import { localeOf } from "@/shared/i18n/params";

export const generateMetadata = async ({
  params,
}: PageProps<"/[locale]/compare">): Promise<Metadata> => {
  const locale = await localeOf(params);
  return {
    title: comparisonMessages.get(locale).metaTitle,
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
