import type { Metadata } from "next";
import { Suspense } from "react";
import { ComparisonFallback, ComparisonView } from "@/features/hotel-comparison";

export const metadata: Metadata = {
  title: "Comparar hotéis | Infotera Hotéis",
  robots: { index: false },
};

/** Casca estática: a view lê `?hotel=` no cliente, dentro do Suspense. */
const ComparePage = () => (
  <Suspense fallback={<ComparisonFallback />}>
    <ComparisonView />
  </Suspense>
);

export default ComparePage;
