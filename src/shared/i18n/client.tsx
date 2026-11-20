"use client";

import { createContext, type ReactNode, useContext } from "react";
import { DEFAULT_LOCALE, type Locale } from "./config";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

type I18nProviderProps = { locale: Locale; children: ReactNode };

/** Entrega o locale da rota (`[locale]`) aos componentes cliente; o servidor usa `getLocale()`. */
export const I18nProvider = ({ locale, children }: I18nProviderProps) => (
  <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
);

/** Locale atual nos componentes cliente (pt-BR quando não há provider, como nos testes antigos). */
export const useLocale = (): Locale => useContext(LocaleContext);
