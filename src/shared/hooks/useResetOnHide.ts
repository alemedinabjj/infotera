import { useLayoutEffect, useRef } from "react";

/**
 * Com `cacheComponents` o Next esconde a rota (`<Activity mode="hidden">`) em vez de desmontá-la, e o
 * estado local sobrevive. Este hook chama `reset` quando o componente é escondido (ou desmontado), para
 * zerar o que é transitório (menu aberto) ou sensível (campos de cartão). O cleanup de
 * `useLayoutEffect` é o padrão da doc: roda antes de esconder, sem flash de estado velho.
 *
 * `reset` pode mudar de identidade a cada render: o hook guarda a versão mais recente.
 */
export const useResetOnHide = (reset: () => void): void => {
  const latest = useRef(reset);
  useLayoutEffect(() => {
    latest.current = reset;
  });
  useLayoutEffect(
    () => () => {
      latest.current();
    },
    [],
  );
};
