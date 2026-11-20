export type ToastTone = "success" | "error" | "info";

export type ToastAction = {
  label: string;
  onClick: () => void;
  /**
   * Para onde o foco volta depois da ação (o toast e, às vezes, o controle de origem desmontam).
   * Sem isto, volta ao controle que estava focado quando o toast foi criado, se ainda existir.
   */
  returnFocus?: () => HTMLElement | null;
  /** A ação navega para outra rota: o foco não é devolvido (a página nova cuida dele). */
  navigates?: true;
};

export type ToastItemData = {
  id: number;
  /** Mesma `key` substitui o toast no lugar (deduplica). */
  key?: string;
  /** Sobe a cada substituição por `key`: reinicia o timer sem remontar o item. */
  version: number;
  tone: ToastTone;
  message: string;
  action?: ToastAction;
  /** Controle focado quando o toast foi criado (o que o disparou). */
  origin?: HTMLElement;
  /** Duração em ms até sumir sozinho. */
  duration: number;
};

export const MAX_VISIBLE_TOASTS = 3;

const DEFAULT_DURATION_MS = 5000;
const ERROR_DURATION_MS = 8000;
/** WCAG 2.2.1: quem precisa agir tem mais tempo. */
const ACTION_DURATION_MS = 10_000;

/** Duração por tipo: 5 s, 8 s no erro, 10 s com ação; `override` vence. */
export const toastDuration = (tone: ToastTone, hasAction: boolean, override?: number): number => {
  if (override !== undefined) return override;
  if (hasAction) return ACTION_DURATION_MS;
  return tone === "error" ? ERROR_DURATION_MS : DEFAULT_DURATION_MS;
};

/**
 * Insere um toast. Uma `key` igual substitui o item no lugar (mesmo `id`, `version` + 1),
 * sem mudar a posição. Mantém o teto de 3 (descarta o mais antigo); o mais novo fica por último.
 */
export const pushToast = (list: ToastItemData[], item: ToastItemData): ToastItemData[] => {
  const index = item.key === undefined ? -1 : list.findIndex((entry) => entry.key === item.key);
  const existing = list[index];
  if (existing === undefined) return [...list, item].slice(-MAX_VISIBLE_TOASTS);
  return list.map((entry, position) =>
    position === index ? { ...item, id: existing.id, version: existing.version + 1 } : entry,
  );
};
