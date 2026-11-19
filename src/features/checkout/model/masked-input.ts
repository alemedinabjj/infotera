export type MaskResult = { value: string; caret: number };

const DIGIT = /\d/;

const countDigits = (text: string): number => text.replace(/\D/g, "").length;

/** Posição logo depois do `n`-ésimo dígito de `text` (0 quando `n` é 0). */
const caretAfterDigit = (text: string, n: number): number => {
  if (n <= 0) return 0;
  let seen = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (DIGIT.test(text.charAt(index))) seen += 1;
    if (seen === n) return index + 1;
  }
  return text.length;
};

/**
 * Aplica a máscara a cada tecla sem o cursor pular: a posição é refeita pela contagem de dígitos
 * antes dele (inserir/apagar no meio e colar texto formatado funcionam). `format` recebe o texto
 * cru e devolve o formatado, descartando o excesso.
 */
export const applyMask = (
  raw: string,
  caret: number,
  format: (text: string) => string,
): MaskResult => {
  const value = format(raw);
  const digitsBeforeCaret = countDigits(raw.slice(0, caret));
  return {
    value,
    caret: caretAfterDigit(value, Math.min(digitsBeforeCaret, countDigits(value))),
  };
};
