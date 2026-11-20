import type { ReactNode } from "react";
import { type HotelSectionId, sectionHeadingId } from "../model/sections";

type SectionProps = {
  id: HotelSectionId;
  title: string;
  children: ReactNode;
};

/**
 * Seção da página: `<section id aria-labelledby>` com o h2 **fora** de qualquer Suspense/boundary
 * (a âncora e o foco programático existem desde o primeiro HTML). O h2 aceita foco (`tabIndex=-1`).
 */
export const Section = ({ id, title, children }: SectionProps) => (
  <section id={id} aria-labelledby={sectionHeadingId(id)} className="flex flex-col gap-4">
    <h2 id={sectionHeadingId(id)} tabIndex={-1} className="text-xl font-semibold text-fg">
      {title}
    </h2>
    {children}
  </section>
);
