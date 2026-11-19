import { describe, expect, it } from "vitest";
import { type ComboboxState, comboboxReducer, INITIAL_COMBOBOX_STATE } from "./combobox";

const open = (activeIndex: number): ComboboxState => ({ isOpen: true, activeIndex });

describe("comboboxReducer", () => {
  it("começa fechado e sem opção ativa", () => {
    expect(INITIAL_COMBOBOX_STATE).toEqual({ isOpen: false, activeIndex: -1 });
  });

  it("↓ fechado abre e ativa a primeira", () => {
    expect(comboboxReducer(INITIAL_COMBOBOX_STATE, { type: "next", count: 3 })).toEqual(open(0));
  });

  it("↑ fechado abre e ativa a última", () => {
    expect(comboboxReducer(INITIAL_COMBOBOX_STATE, { type: "prev", count: 3 })).toEqual(open(2));
  });

  it("↓ e ↑ circulam", () => {
    expect(comboboxReducer(open(2), { type: "next", count: 3 })).toEqual(open(0));
    expect(comboboxReducer(open(0), { type: "prev", count: 3 })).toEqual(open(2));
    expect(comboboxReducer(open(1), { type: "next", count: 3 })).toEqual(open(2));
    expect(comboboxReducer(open(1), { type: "prev", count: 3 })).toEqual(open(0));
  });

  it("aberto sem ativa: ↓ vai para a primeira e ↑ para a última", () => {
    expect(comboboxReducer(open(-1), { type: "next", count: 3 })).toEqual(open(0));
    expect(comboboxReducer(open(-1), { type: "prev", count: 3 })).toEqual(open(2));
  });

  it("sem itens abre sem ativar nada", () => {
    expect(comboboxReducer(INITIAL_COMBOBOX_STATE, { type: "next", count: 0 })).toEqual(open(-1));
    expect(comboboxReducer(open(-1), { type: "prev", count: 0 })).toEqual(open(-1));
  });

  it("first e last", () => {
    expect(comboboxReducer(open(1), { type: "first", count: 4 })).toEqual(open(0));
    expect(comboboxReducer(open(1), { type: "last", count: 4 })).toEqual(open(3));
  });

  it("open mantém o índice; close e reset limpam tudo", () => {
    expect(comboboxReducer(open(1), { type: "open" })).toEqual(open(1));
    expect(comboboxReducer({ isOpen: false, activeIndex: -1 }, { type: "open" })).toEqual(open(-1));
    expect(comboboxReducer(open(2), { type: "close" })).toEqual(INITIAL_COMBOBOX_STATE);
    expect(comboboxReducer(open(2), { type: "reset" })).toEqual(INITIAL_COMBOBOX_STATE);
  });

  it("itemsChanged só reseta o índice fora do limite", () => {
    expect(comboboxReducer(open(4), { type: "itemsChanged", count: 3 })).toEqual(open(-1));
    expect(comboboxReducer(open(2), { type: "itemsChanged", count: 3 })).toEqual(open(2));
    const state = open(1);
    expect(comboboxReducer(state, { type: "itemsChanged", count: 5 })).toBe(state);
  });
});
