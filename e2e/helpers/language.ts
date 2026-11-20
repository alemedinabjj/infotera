import type { Page } from "@playwright/test";

const PT_ACCENTS = /[ãõçáéíóúâêôà]/i;
/**
 * Palavras funcionais e de UI em português. Delimitadas por espaço (nunca por ponto ou hífen) e sem
 * homógrafos do inglês: "data", "do" e o `.com` de e-mails não entram.
 */
const PT_WORDS =
  /(?:^|\s)(?:de|da|para|com|sem|não|você|voc[êe]s|hotéis|quartos?|noites?|hóspedes?|buscar|favoritos|reservas?|esgotado|preço|nova|busca|tentar)(?:\s|$)/i;
const BRAND_SUFFIX = "Hotéis";
const NAME_ATTRIBUTES = ["aria-label", "alt", "title", "placeholder"];

/** Textos visíveis fora de `[lang="pt-BR"]` (nós de texto, sem script/style/title). */
const visibleTexts = (page: Page): Promise<string[]> =>
  page.evaluate(() => {
    const found: string[] = [];
    const ignoredTags = ["SCRIPT", "STYLE", "TITLE"];
    const isHidden = (element: Element): boolean =>
      Boolean(element.closest('[lang="pt-BR"]')) ||
      getComputedStyle(element).display === "none" ||
      ignoredTags.includes(element.tagName);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      const text = node.textContent?.trim();
      if (parent && text && !isHidden(parent)) found.push(text);
    }
    return found;
  });

/** Nomes acessíveis e placeholders fora de `[lang="pt-BR"]`. */
const nameTexts = (page: Page): Promise<string[]> =>
  page.evaluate((attributes) => {
    const selector = attributes.map((name) => `[${name}]`).join(", ");
    return [...document.body.querySelectorAll(selector)]
      .filter((element) => !element.closest('[lang="pt-BR"]'))
      .flatMap((element) => attributes.map((name) => element.getAttribute(name)))
      .filter((value): value is string => Boolean(value));
  }, NAME_ATTRIBUTES);

const looksPortuguese = (text: string): boolean => PT_ACCENTS.test(text) || PT_WORDS.test(text);

/**
 * Textos de interface visíveis (e nomes acessíveis) **fora** de blocos `[lang="pt-BR"]`, com os nomes
 * próprios vindos da API (`ignore`: hotéis, destinos, marca) removidos. Em en-US não pode sobrar português.
 */
export const portugueseLeftovers = async (page: Page, ignore: string[]): Promise<string[]> => {
  const texts = [...(await visibleTexts(page)), ...(await nameTexts(page))];
  // O logo parte a marca em "Infotera" + "Hotéis" (o complemento some em telas estreitas).
  const names = [...ignore, BRAND_SUFFIX];
  const clean = (text: string) => names.reduce((acc, name) => acc.split(name).join(" "), text);
  return texts.map(clean).filter(looksPortuguese);
};
