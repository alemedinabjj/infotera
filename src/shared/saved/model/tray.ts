import { COMPARE_PATH } from "./routes";

const HIDDEN_PREFIXES = ["/checkout", "/confirmation", COMPARE_PATH] as const;

/** A bandeja some no checkout, na confirmação e na própria página de comparação. */
export const isTrayHiddenOn = (pathname: string): boolean =>
  HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

/** O elemento focado termina sob a bandeja (WCAG 2.4.11)? */
export const isObscuredByBar = (elementBottom: number, barTop: number): boolean =>
  elementBottom > barTop;
