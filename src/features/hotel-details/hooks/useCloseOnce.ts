"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useResetOnHide } from "@/shared/hooks/useResetOnHide";
import { restorePhotoFocus, usePhotoOpener } from "./usePhotoOpener";

/**
 * Fechamento do modal da foto (viewer, loading e erro): Esc, "Fechar" e cliques repetidos durante a
 * saída pedem **uma** volta no histórico. `requestClose` trava por ref e fecha o `Dialog`; quando ele
 * termina de sair, `onClosed` devolve o foco ao gatilho e faz um único `router.back()`. Voltar do
 * navegador desmonta o modal sem passar por aqui: `usePhotoOpener` devolve o foco no cleanup.
 *
 * Com `cacheComponents` o Next esconde a rota (Activity) em vez de desmontar: ao esconder, o estado
 * (fase de saída, trava) volta ao de aberto, para o modal reexibido pelo Avançar abrir de novo, e o
 * fim de saída que o `Dialog` sinaliza ao esconder (sem `requestClose`) não volta no histórico.
 */
export const useCloseOnce = () => {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const closing = useRef(false);
  usePhotoOpener();
  useResetOnHide(() => {
    closing.current = false;
    setOpen(true);
  });

  const requestClose = () => {
    if (closing.current) return;
    closing.current = true;
    setOpen(false);
  };

  const onClosed = () => {
    // O `Dialog` também chama `onClosed` quando o Activity esconde a rota (a saída é cortada): sem pedido
    // de fechar não há o que desfazer, e um `back()` aqui tirava a pessoa da foto que o Avançar acabou de abrir.
    if (!closing.current) return;
    restorePhotoFocus();
    router.back();
  };

  return { open, requestClose, onClosed };
};
