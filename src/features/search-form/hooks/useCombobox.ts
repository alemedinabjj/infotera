import {
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useId,
  useReducer,
  useRef,
} from "react";
import { comboboxReducer, INITIAL_COMBOBOX_STATE } from "../model/combobox";

type UseComboboxOptions = {
  /** Chave estável de cada opção (vira parte do `id`). */
  itemKeys: readonly (string | number)[];
  /** `false` mantém o popover fechado (nada a mostrar). */
  canOpen: boolean;
  /** `false` no estado de erro: Tab precisa chegar ao "Tentar de novo" dentro do popover. */
  closeOnTab: boolean;
  onSelect: (index: number) => void;
  /** Esc com o popover já fechado (limpar o texto). */
  onEscapeClosed: () => void;
  /** O foco saiu do conjunto input + popover. */
  onLeave: () => void;
};

/**
 * Teclado e atributos ARIA 1.2 de um combobox com listbox. Genérico: não sabe o que é "destino".
 * ↓/↑ circulam, Enter seleciona a opção ativa (sem submeter), Esc fecha e depois limpa, Tab fecha.
 */
export const useCombobox = ({
  itemKeys,
  canOpen,
  closeOnTab,
  onSelect,
  onEscapeClosed,
  onLeave,
}: UseComboboxOptions) => {
  const listboxId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [state, dispatch] = useReducer(comboboxReducer, INITIAL_COMBOBOX_STATE);
  const count = itemKeys.length;
  const isOpen = state.isOpen && canOpen;
  const activeIndex = isOpen ? state.activeIndex : -1;
  const optionId = (index: number) => `${listboxId}-${itemKeys[index]}`;

  useEffect(() => {
    dispatch({ type: "itemsChanged", count });
  }, [count]);

  const handleArrow = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!canOpen) return;
    event.preventDefault();
    if (event.altKey) dispatch({ type: "open" });
    else dispatch({ type: event.key === "ArrowDown" ? "next" : "prev", count });
  };

  const handleEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || activeIndex < 0) return; // sem ativa: submit nativo
    event.preventDefault();
    onSelect(activeIndex);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") handleArrow(event);
    else if (event.key === "Enter") handleEnter(event);
    else if (event.key === "Escape") {
      if (isOpen) dispatch({ type: "close" });
      else onEscapeClosed();
    } else if (event.key === "Tab" && closeOnTab) dispatch({ type: "close" });
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (wrapperRef.current?.contains(event.relatedTarget)) return;
    dispatch({ type: "close" });
    onLeave();
  };

  return {
    isOpen,
    activeIndex,
    open: () => dispatch({ type: "open" }),
    close: () => dispatch({ type: "close" }),
    reset: () => dispatch({ type: "reset" }),
    wrapperProps: { ref: wrapperRef, onBlur: handleBlur },
    inputProps: {
      role: "combobox",
      "aria-autocomplete": "list",
      "aria-expanded": isOpen,
      "aria-controls": listboxId,
      "aria-activedescendant": activeIndex >= 0 ? optionId(activeIndex) : undefined,
      onKeyDown: handleKeyDown,
    } as const,
    listboxProps: { id: listboxId, role: "listbox" } as const,
    getOptionProps: (index: number) =>
      ({
        id: optionId(index),
        role: "option",
        "aria-selected": index === activeIndex,
        // Mantém o foco no input: sem isso o blur fecharia o popover antes do clique.
        onMouseDown: (event: MouseEvent) => event.preventDefault(),
        onClick: () => onSelect(index),
      }) as const,
  };
};
