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

type StayEditStore = {
  openFor: string | null;
  toggle: (criteriaKey: string) => void;
  pickDates: (criteriaKey: string) => void;
  /** Cada consumidor informa os critérios que já resolveu (a chave só existe depois da promessa). */
  observe: (criteriaKey: string) => void;
};

const StayEditContext = createContext<StayEditStore | null>(null);

/**
 * Estado do painel de datas, compartilhado entre a barra da estadia e os botões "Escolher datas"
 * dos quartos. Os critérios chegam por promessa (buracos do PPR), então a chave vem dos
 * consumidores (`useStayEdit(key)`) e o painel vale só para ela: critérios novos fecham o painel
 * sozinhos. Nesse fechamento, cliques no botão do painel são ignorados por um instante: o conteúdo
 * sobe sob o ponteiro e um 2º clique do envio não pode reabri-lo.
 */
export const StayEditProvider = ({ children }: { children: ReactNode }) => {
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [focusRequests, setFocusRequests] = useState(0);
  const openForRef = useRef<string | null>(null);
  const lastKey = useRef<string | null>(null);
  const closedBySubmitAt = useRef(0);

  useEffect(() => {
    openForRef.current = openFor;
  });
  useEffect(() => {
    if (focusRequests > 0) focusCheckIn();
  }, [focusRequests]);

  const observe = useCallback((key: string) => {
    const previous = lastKey.current;
    if (previous !== null && previous !== key && openForRef.current === previous) {
      closedBySubmitAt.current = Date.now();
    }
    lastKey.current = key;
  }, []);

  const toggle = useCallback((key: string) => {
    if (Date.now() - closedBySubmitAt.current < GHOST_CLICK_MS) return;
    setOpenFor((current) => (current === key ? null : key));
  }, []);

  const pickDates = useCallback((key: string) => {
    setOpenFor(key);
    setFocusRequests((count) => count + 1);
  }, []);

  const value = useMemo(
    () => ({ openFor, toggle, pickDates, observe }),
    [openFor, toggle, pickDates, observe],
  );
  return <StayEditContext value={value}>{children}</StayEditContext>;
};

/** Lê o painel de datas para os critérios `criteriaKey` (`"none"` sem critérios); só dentro de `StayEditProvider`. */
export const useStayEdit = (criteriaKey: string): StayEdit => {
  const store = useContext(StayEditContext);
  if (store === null) throw new Error("useStayEdit must be used within StayEditProvider");
  const { observe } = store;
  useEffect(() => observe(criteriaKey), [observe, criteriaKey]);
  return {
    open: store.openFor === criteriaKey,
    toggle: () => store.toggle(criteriaKey),
    pickDates: () => store.pickDates(criteriaKey),
  };
};
