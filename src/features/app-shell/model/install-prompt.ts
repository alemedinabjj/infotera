import { z } from "@/shared/lib/zod";

/** Quanto tempo "Agora não" esconde o cartão de instalação. */
export const INSTALL_SNOOZE_DAYS = 30;

/** Chave (com o prefixo `infotera:` do wrapper de storage) do momento em que o cartão foi dispensado. */
export const INSTALL_DISMISSED_KEY = "install-dismissed-at";

/** ISO 8601 com data e hora; qualquer outra coisa gravada ali é tratada como "nunca dispensou". */
export const installDismissedSchema = z.iso.datetime().nullable();

const MS_PER_DAY = 86_400_000;

type InstallPromptInput = {
  /** O navegador entregou o `beforeinstallprompt` (Chromium) e ele ainda não foi usado. */
  hasPrompt: boolean;
  /** Já roda como app (`display-mode: standalone`). */
  isStandalone: boolean;
  /** ISO de quando a pessoa disse "Agora não" (ou `null`). */
  dismissedAt: string | null;
  now: number;
};

export type InstallPromptView = "show" | "hidden";

/**
 * Mostra o cartão só quando há o que instalar: tem o evento, o app não está instalado e a pessoa
 * não o dispensou nos últimos 30 dias (entre 29 e 31 dias vira de `hidden` para `show`).
 */
export const installPromptView = ({
  hasPrompt,
  isStandalone,
  dismissedAt,
  now,
}: InstallPromptInput): InstallPromptView => {
  if (!hasPrompt || isStandalone) return "hidden";
  const dismissed = installDismissedSchema.safeParse(dismissedAt);
  const dismissedMs = dismissed.success && dismissed.data ? Date.parse(dismissed.data) : null;
  if (dismissedMs !== null && now - dismissedMs < INSTALL_SNOOZE_DAYS * MS_PER_DAY) return "hidden";
  return "show";
};
