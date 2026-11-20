export type NumberGroup = { key: string; text: string };

/**
 * Parte o número da reserva depois de cada hífen (`3f2a9c1e-`, `7b4d-`, …) para a tela permitir
 * a quebra só entre grupos (`<wbr>`). A `key` é a posição inicial do grupo no texto.
 */
export const splitNumberGroups = (value: string): NumberGroup[] => {
  let offset = 0;
  return value.split(/(?<=-)/).map((text) => {
    const group = { key: String(offset), text };
    offset += text.length;
    return group;
  });
};

const SHORT_CODE_LENGTH = 8;

/** Código curto legível para citar por telefone: os 8 primeiros caracteres em maiúsculas. */
export const shortBookingCode = (value: string): string =>
  value.slice(0, SHORT_CODE_LENGTH).toUpperCase();
