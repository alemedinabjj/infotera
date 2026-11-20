import type { Page } from "@playwright/test";

const PT_ACCENTS = /[ãõçáéíóúâêôà]/i;
const PT_WORDS =
  /\b(de|do|da|para|com|sem|não|você|voc[êe]s|hotéis|quartos?|noites?|hóspedes?|buscar|favoritos|reservas?|datas?|preço|ver|nova|busca|tentar)\b/i;

/**
 * Textos de interface visíveis (e nomes acessíveis) **fora** de blocos `[lang="pt-BR"]`, com os nomes
 * próprios vindos da API (`ignore`: hotéis, destinos, marca) removidos. Em en-US não pode sobrar português.
 */
export const portugueseLeftovers = async (page: Page, ignore: string[]): Promise<string[]> => {
  const texts = await page.evaluate(() => {
    const found: string[] = [];
    const skip = (element: Element | null): boolean => Boolean(element?.closest('[lang="pt-BR"]'));
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      const style = parent ? getComputedStyle(parent) : null;
      if (!parent || skip(parent) || style?.display === "none") continue;
      if (["SCRIPT", "STYLE", "TITLE"].includes(parent.tagName)) continue;
      const text = node.textContent?.trim();
      if (text) found.push(text);
    }
    for (const element of document.body.querySelectorAll(
      "[aria-label], [alt], [title], [placeholder]",
    )) {
      if (skip(element)) continue;
      for (const name of ["aria-label", "alt", "title", "placeholder"]) {
        const value = element.getAttribute(name);
        if (value) found.push(value);
      }
    }
    return found;
  });
  const clean = (text: string) => ignore.reduce((acc, name) => acc.split(name).join(" "), text);
  return texts.map(clean).filter((text) => PT_ACCENTS.test(text) || PT_WORDS.test(text));
};
