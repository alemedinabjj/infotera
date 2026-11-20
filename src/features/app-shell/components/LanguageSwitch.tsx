"use client";

import { type MouseEvent, useCallback, useEffect, useState } from "react";
import { useLocale } from "@/shared/i18n/client";
import type { Locale } from "@/shared/i18n/config";
import { writeLocaleCookie } from "@/shared/i18n/cookie";
import { localizePath, switchLocalePath } from "@/shared/i18n/paths";
import { cn } from "@/shared/lib/cn";
import { assignLocation } from "@/shared/lib/navigation";
import { buttonClassName } from "@/shared/ui/atoms/button-styles";
import { GlobeIcon } from "@/shared/ui/icons";
import { useAppShellMessages } from "../hooks/useAppShellMessages";

const otherLocale = (locale: Locale): Locale => (locale === "pt-BR" ? "en-US" : "pt-BR");

const currentHref = (): string =>
  `${window.location.pathname}${window.location.search}${window.location.hash}`;

const isPlainClick = (event: MouseEvent): boolean =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

/**
 * Seletor de idioma do cabeçalho: um link para a **mesma página** no outro idioma, com carga de
 * documento (troca `<html lang>`, dicionários e o layout raiz de uma vez; respeita a CSP do
 * checkout). No servidor e na hidratação o `href` aponta para a home do outro idioma (o Next
 * avisa que `usePathname` com rewrite diverge); depois de montar ele passa a refletir
 * `window.location` e é recalculado ao entrar no link (hover, foco ou toque), então copiar o
 * endereço ou abrir em nova aba também leva à página certa.
 */
export const LanguageSwitch = () => {
  const locale = useLocale();
  const messages = useAppShellMessages().languageSwitch;
  const target = otherLocale(locale);
  const [href, setHref] = useState(() => localizePath(target, "/"));
  const refresh = useCallback(() => setHref(switchLocalePath(target, currentHref())), [target]);

  useEffect(refresh, [refresh]);

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    writeLocaleCookie(target);
    if (!isPlainClick(event)) return;
    event.preventDefault();
    assignLocation(switchLocalePath(target, currentHref()));
  };

  return (
    <a
      href={href}
      hrefLang={target}
      aria-label={messages.label}
      onClick={onClick}
      onPointerEnter={refresh}
      onFocus={refresh}
      className={cn(buttonClassName({ variant: "ghost", size: "sm" }), "shrink-0 px-2 sm:px-3")}
    >
      <GlobeIcon />
      <span lang={target} className="hidden min-[361px]:inline">
        {messages.targetName}
      </span>
      <span lang={target} aria-hidden="true" className="min-[361px]:hidden">
        {messages.targetShort}
      </span>
    </a>
  );
};
