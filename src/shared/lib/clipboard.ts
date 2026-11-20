/**
 * Copia `text` para a área de transferência. Devolve `false` (sem lançar) quando não há Clipboard
 * API (contexto não seguro) ou quando a escrita é recusada (permissão negada).
 */
export const copyText = async (text: string): Promise<boolean> => {
  try {
    if (typeof navigator === "undefined" || !navigator.clipboard) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
