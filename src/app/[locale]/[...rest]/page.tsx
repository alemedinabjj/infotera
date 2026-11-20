import type { Metadata } from "next";
import { commonMessages } from "@/shared/i18n/common/messages";
import { getLocale } from "@/shared/i18n/server";
import { RouteNotFound } from "../RouteNotFound";

export const generateMetadata = async (): Promise<Metadata> => ({
  title: commonMessages.get(await getLocale()).routes.notFound.metaTitle,
  robots: { index: false },
});

/**
 * Qualquer caminho desconhecido dentro do locale (`/en/xyz`): o "não encontrado" do idioma, com layout,
 * cabeçalho e `<html lang>` certos. Renderizado **inline** (`200` + `noindex`) em vez de `notFound()`: com
 * `cacheComponents` o Next responde todo `notFound()` com HTML vazio (`__next_error__`), e a página
 * ficaria em branco sem JavaScript. O locale vem de `next/root-params`: o segmento `[...rest]` nunca é lido.
 */
const UnknownPathPage = async () => <RouteNotFound locale={await getLocale()} />;

export default UnknownPathPage;
