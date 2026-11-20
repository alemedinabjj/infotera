import type { Page } from "@playwright/test";
import { criteriaQuery } from "./hotel-search";

/** `/hotel/{id}` com (padrão) ou sem os critérios da busca (Rio, 3 noites, 2 adultos, 1 quarto). */
export const hotelPath = (id: number | string, withCriteria = true, extra = ""): string => {
  const query = withCriteria ? criteriaQuery() : "";
  const all = [query, extra].filter(Boolean).join("&");
  return `/hotel/${id}${all ? `?${all}` : ""}`;
};

/** Altura do header fixo: o topo de qualquer alvo de foco/âncora deve ficar abaixo dela. */
export const headerHeight = (page: Page): Promise<number> =>
  page.evaluate(() => document.querySelector("header")?.getBoundingClientRect().height ?? 0);

/** O `article` do quarto pelo nome (h3). */
export const roomCard = (page: Page, name: string) =>
  page.getByRole("article").filter({ has: page.getByRole("heading", { level: 3, name }) });

/** Sem scroll horizontal no documento (a tabela e a barra de seções rolam dentro de si). */
export const noHorizontalScroll = (page: Page): Promise<boolean> =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

/**
 * A página só responde a cliques depois de hidratar. Os quartos são uma ilha cliente: quando o
 * primeiro botão de quarto aparece, a hidratação terminou.
 */
export const waitForHydration = async (page: Page): Promise<void> => {
  await page.getByRole("article").getByRole("button").first().waitFor();
};
