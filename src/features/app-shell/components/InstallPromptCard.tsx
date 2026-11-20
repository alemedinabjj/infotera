"use client";

import { type RefObject, useRef } from "react";
import { Button } from "@/shared/ui/atoms/Button";
import { cardClassName } from "@/shared/ui/molecules/card-styles";
import { useAppShellMessages } from "../hooks/useAppShellMessages";
import { useFocusSearchOnExit } from "../hooks/useFocusSearchOnExit";
import { useInstallPrompt } from "../hooks/useInstallPrompt";

type CardProps = {
  onInstall: () => void;
  onDismiss: () => void;
  /** Região de aviso do slot (referência de posição para devolver o foco). */
  marker: RefObject<HTMLParagraphElement | null>;
};

const InstallCard = ({ onInstall, onDismiss, marker }: CardProps) => {
  const messages = useAppShellMessages().install;
  const cardRef = useRef<HTMLElement>(null);
  useFocusSearchOnExit(cardRef, marker);
  return (
    <section
      ref={cardRef}
      aria-labelledby="install-card-title"
      className={cardClassName({ className: "p-4 sm:p-6" })}
    >
      <h2 id="install-card-title" className="text-lg font-semibold text-fg">
        {messages.title}
      </h2>
      <p className="mt-1 text-fg-muted">{messages.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {/* "Buscar hotéis" já é a ação primária da home: instalar é secundário. */}
        <Button variant="secondary" onClick={onInstall}>
          {messages.install}
        </Button>
        <Button variant="ghost" onClick={onDismiss}>
          {messages.dismiss}
        </Button>
      </div>
    </section>
  );
};

/**
 * Cartão "Instale o app" da página inicial (abaixo do formulário, então nada acima dele se move
 * quando aparece). Só existe quando o navegador entregou o `beforeinstallprompt`, o app não está
 * instalado e a pessoa não disse "Agora não" nos últimos 30 dias. A região `role="status"` fica
 * sempre montada, fora do cartão (ele desmonta), e anuncia a dispensa; ao sair, o cartão devolve o
 * foco a "Buscar hotéis".
 */
export const InstallPromptCard = () => {
  const messages = useAppShellMessages().install;
  const { view, install, dismiss, dismissedNow } = useInstallPrompt();
  const marker = useRef<HTMLParagraphElement>(null);

  return (
    <>
      <p ref={marker} role="status" className="sr-only">
        {dismissedNow ? messages.dismissed : null}
      </p>
      {view === "show" ? (
        <InstallCard onInstall={() => void install()} onDismiss={dismiss} marker={marker} />
      ) : null}
    </>
  );
};
