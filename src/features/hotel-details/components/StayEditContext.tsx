"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { focusCheckIn } from "../hooks/focus-dates";

/** Janela em que um clique no botão do painel, logo após o envio fechá-lo, é um clique "fantasma". */
const GHOST_CLICK_MS = 600;

type StayEdit = {
  /** O painel "Alterar datas e hóspedes" está aberto para os critérios atuais. */
  open: boolean;
  toggle: () => void;
  /** Abre o painel (se estiver fechado) e leva o foco ao Check-in. */
  pickDates: () => void;
};

const StayEditContext = createContext<StayEdit | null>(null);

type StayEditProviderProps = {
  /** Critérios atuais em texto (`"none"` sem critérios): o painel vale só para eles. */
  criteriaKey: string;
  children: ReactNode;
};

/**
 * Estado do painel de datas, compartilhado entre a barra da estadia e os botões "Escolher datas"
 * dos quartos. Critérios novos fecham o painel sozinhos; nesse fechamento, cliques no botão do
 * painel são ignorados por um instante: o conteúdo sobe sob o ponteiro e um 2º clique do envio não
 * pode reabri-lo.
 */
export const StayEditProvider = ({ criteriaKey, children }: StayEditProviderProps) => {
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [focusRequests, setFocusRequests] = useState(0);
  const open = openFor === criteriaKey;
  const wasOpen = useRef(false);
  const closedBySubmitAt = useRef(0);

  // Declarados nesta ordem: o 1º lê o `open` do render anterior, o 2º o atualiza.
  // biome-ignore lint/correctness/useExhaustiveDependencies: só reage à troca dos critérios
  useEffect(() => {
    if (wasOpen.current) closedBySubmitAt.current = Date.now();
  }, [criteriaKey]);
  useEffect(() => {
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (focusRequests > 0) focusCheckIn();
  }, [focusRequests]);

  const toggle = useCallback(() => {
    if (Date.now() - closedBySubmitAt.current < GHOST_CLICK_MS) return;
    setOpenFor((current) => (current === criteriaKey ? null : criteriaKey));
  }, [criteriaKey]);

  const pickDates = useCallback(() => {
    setOpenFor(criteriaKey);
    setFocusRequests((count) => count + 1);
  }, [criteriaKey]);

  const value = useMemo(() => ({ open, toggle, pickDates }), [open, toggle, pickDates]);
  return <StayEditContext value={value}>{children}</StayEditContext>;
};

/** Lê o painel de datas; só dentro de `StayEditProvider`. */
export const useStayEdit = (): StayEdit => {
  const value = useContext(StayEditContext);
  if (value === null) throw new Error("useStayEdit must be used within StayEditProvider");
  return value;
};
