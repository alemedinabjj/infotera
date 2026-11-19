/** Estado do combobox genérico: não sabe o que é destino. `activeIndex = -1` = nenhuma opção ativa. */
export type ComboboxState = { isOpen: boolean; activeIndex: number };

export type ComboboxAction =
  | { type: "open" }
  | { type: "close" }
  | { type: "reset" }
  | { type: "next"; count: number }
  | { type: "prev"; count: number }
  | { type: "first"; count: number }
  | { type: "last"; count: number }
  | { type: "itemsChanged"; count: number };

export const INITIAL_COMBOBOX_STATE: ComboboxState = { isOpen: false, activeIndex: -1 };

const moveTo = (index: number, count: number): ComboboxState => ({
  isOpen: true,
  activeIndex: count > 0 ? index : -1,
});

const nextIndex = (current: number, count: number): number => (current + 1) % Math.max(count, 1);

const prevIndex = (current: number, count: number): number =>
  current <= 0 ? count - 1 : current - 1;

/**
 * Reducer puro do teclado. ↓/↑ circulam e abrem se fechado (a primeira ↓ ativa a primeira
 * opção; a primeira ↑ ativa a última); `itemsChanged` desativa o índice que saiu do intervalo.
 */
export const comboboxReducer = (state: ComboboxState, action: ComboboxAction): ComboboxState => {
  switch (action.type) {
    case "open":
      return state.isOpen ? state : { ...state, isOpen: true };
    case "close":
    case "reset":
      return INITIAL_COMBOBOX_STATE;
    case "next":
      return moveTo(state.isOpen ? nextIndex(state.activeIndex, action.count) : 0, action.count);
    case "prev":
      return moveTo(prevIndex(state.isOpen ? state.activeIndex : -1, action.count), action.count);
    case "first":
      return moveTo(0, action.count);
    case "last":
      return moveTo(action.count - 1, action.count);
    case "itemsChanged":
      return state.activeIndex < action.count ? state : { ...state, activeIndex: -1 };
    default: {
      const unreachable: never = action;
      return unreachable;
    }
  }
};
