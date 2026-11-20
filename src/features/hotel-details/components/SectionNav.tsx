import type { Locale } from "@/shared/i18n/config";
import { buttonClassName } from "@/shared/ui";
import { hotelDetailsMessages } from "../i18n/messages";
import { HOTEL_SECTIONS, sectionLabel } from "../model/sections";

/**
 * Âncoras das seções (sem JS). Estática, não sticky: um segundo elemento fixo somaria com o header
 * e esconderia o foco. No celular rola na horizontal dentro de si.
 */
export const SectionNav = ({ locale }: { locale: Locale }) => (
  <nav
    aria-label={hotelDetailsMessages.get(locale).sections.navLabel}
    className="border-y border-border"
  >
    <ul
      className={
        // Celular: a borda direita esmaece para indicar que dá para rolar; o `pr-8` deixa o último
        // item atravessar o gradiente ao fim da rolagem.
        "flex gap-1 overflow-x-auto py-1 max-sm:pr-8 max-sm:[mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)]"
      }
    >
      {HOTEL_SECTIONS.map((section) => (
        <li key={section.id} className="shrink-0">
          <a
            href={`#${section.id}`}
            className={`${buttonClassName({ variant: "ghost", size: "sm" })} whitespace-nowrap`}
          >
            {sectionLabel(section.key, locale)}
          </a>
        </li>
      ))}
    </ul>
  </nav>
);
