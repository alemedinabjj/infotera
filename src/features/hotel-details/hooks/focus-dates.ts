import { revealBelowHeader } from "@/shared/lib/scroll";

/**
 * Leva o foco ao campo Check-in do formulário de datas (sem datas na busca, o botão do quarto vira
 * "Escolher datas"). Sem rolar para o campo atrás do header fixo.
 */
export const focusCheckIn = (): void => {
  const input = document.querySelector<HTMLInputElement>('input[name="checkIn"]');
  if (!input) return;
  input.focus({ preventScroll: true });
  revealBelowHeader(input);
};
