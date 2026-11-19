import { buttonClassName } from "@/shared/ui";
import { HOTEL_SECTIONS } from "../model/sections";

/**
 * Âncoras das seções (sem JS). Estática, não sticky: um segundo elemento fixo somaria com o header
 * e esconderia o foco. No celular rola na horizontal dentro de si.
 */
export const SectionNav = () => (
  <nav aria-label="Seções da página" className="border-y border-border">
    <ul className="flex gap-1 overflow-x-auto py-1">
      {HOTEL_SECTIONS.map((section) => (
        <li key={section.id} className="shrink-0">
          <a
            href={`#${section.id}`}
            className={`${buttonClassName({ variant: "ghost", size: "sm" })} whitespace-nowrap`}
          >
            {section.label}
          </a>
        </li>
      ))}
    </ul>
  </nav>
);
