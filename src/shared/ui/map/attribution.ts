import { OSM_COPYRIGHT_URL } from "../../lib/map-tiles";

const ENTITIES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => ENTITIES[char] ?? char);

/**
 * Atribuição do controle nativo do Leaflet (ele a insere como HTML). O texto vem do dicionário e é
 * escapado; o destino é a constante do OpenStreetMap, nunca dado de rede.
 */
export const attributionHtml = (text: string): string =>
  `<a href="${OSM_COPYRIGHT_URL}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`;
