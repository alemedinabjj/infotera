"use client";

import { buttonClassName } from "@/shared/ui/atoms/button-styles";
import { cardClassName } from "@/shared/ui/molecules/card-styles";
import { useAppShellMessages } from "../hooks/useAppShellMessages";
import { useInstallPrompt } from "../hooks/useInstallPrompt";

/**
 * Cartão "Instale o app" da página inicial (abaixo do formulário, então nada acima dele se move
 * quando aparece). Só existe quando o navegador entregou o `beforeinstallprompt`, o app não está
 * instalado e a pessoa não disse "Agora não" nos últimos 30 dias.
 */
export const InstallPromptCard = () => {
  const messages = useAppShellMessages().install;
  const { view, install, dismiss } = useInstallPrompt();
  if (view === "hidden") return null;

  return (
    <section aria-labelledby="install-card-title" className={cardClassName({ className: "p-5" })}>
      <h2 id="install-card-title" className="text-lg font-semibold text-fg">
        {messages.title}
      </h2>
      <p className="mt-1 text-fg-muted">{messages.description}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void install()}
          className={buttonClassName({ variant: "primary" })}
        >
          {messages.install}
        </button>
        <button type="button" onClick={dismiss} className={buttonClassName({ variant: "ghost" })}>
          {messages.dismiss}
        </button>
      </div>
    </section>
  );
};
