import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clickButton,
  fillCard,
  fillHolder,
  goToReview,
  happyApi,
  makeSelection,
  renderCheckout,
  seedSelection,
  stubLoadedDocument,
} from "./checkout-test-utils";

vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);
vi.mock("../api/create-booking.action", () => ({ createBookingAction: vi.fn() }));

const consoleSpies = ["log", "info", "warn", "error", "debug"].map((method) =>
  vi.spyOn(console, method as "log"),
);

beforeEach(async () => {
  for (const spy of consoleSpies) spy.mockImplementation(() => undefined);
  stubLoadedDocument();
  happyApi();
  await seedSelection(makeSelection());
});
afterEach(() => {
  // Nenhum valor do formulário pode ir para o console.
  for (const spy of consoleSpies) expect(spy).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

describe("indicador de passos (critério 19)", () => {
  it("<ol> com 3 passos, atual com aria-current e concluídos como botões que voltam", async () => {
    const user = userEvent.setup();
    renderCheckout();
    await fillHolder(user);
    const list = screen.getByRole("list", { name: "Etapas da reserva" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(list.querySelector('[aria-current="step"]')).toHaveTextContent("Hóspedes");
    expect(within(list).queryByRole("button")).not.toBeInTheDocument();

    await clickButton(user, "Continuar para pagamento");
    expect(list.querySelector('[aria-current="step"]')).toHaveTextContent("Pagamento");
    const done = within(list).getByRole("button", { name: "Hóspedes, concluído" });
    await user.click(done);
    expect(
      await screen.findByRole("heading", { level: 2, name: "Dados dos hóspedes" }),
    ).toHaveFocus();
    expect(screen.getByLabelText("Nome")).toHaveValue("Ana");
  });
});

describe("passo 1 (critérios 20–23, 25)", () => {
  it("vazio: não avança, foca o 1º campo e o resumo lista os erros com rótulo", async () => {
    const user = userEvent.setup();
    renderCheckout();
    await clickButton(user, "Continuar para pagamento");
    expect(screen.getByRole("heading", { level: 2, name: "Dados dos hóspedes" })).toBeVisible();
    await waitFor(() => expect(screen.getByLabelText("Nome")).toHaveFocus());
    const summary = screen.getByRole("alert", { name: "" });
    expect(summary).toHaveTextContent("Corrija 4 campos para continuar");
    expect(summary).toHaveTextContent("Titular — Nome: Informe o nome.");
    await user.click(within(summary).getByRole("button", { name: /Titular — E-mail/ }));
    expect(screen.getByLabelText("E-mail")).toHaveFocus();
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("aria-invalid", "true");
  });

  it("2 adultos e 1 criança: blocos por hóspede, idade obrigatória da criança", async () => {
    await seedSelection(makeSelection({ adults: 2, children: 1 }));
    const user = userEvent.setup();
    renderCheckout();
    expect(await screen.findByRole("group", { name: "Hóspede 2 · adulto" })).toBeVisible();
    const child = screen.getByRole("group", { name: "Hóspede 3 · criança" });
    const age = within(child).getByLabelText("Idade no check-in");
    expect(within(age).getByRole("option", { name: "Menos de 1 ano" })).toBeInTheDocument();
    expect(within(age).getAllByRole("option")).toHaveLength(19);
    await clickButton(user, "Continuar para pagamento");
    expect(screen.getByRole("alert", { name: "" })).toHaveTextContent(
      "Hóspede 3 — Idade: Informe a idade da criança no check-in.",
    );
  });

  it("telefone: máscara, regra por país e reaplicação ao trocar o país", async () => {
    const user = userEvent.setup();
    renderCheckout();
    const phone = await screen.findByLabelText("Número de telefone");
    await user.type(phone, "20987654321");
    expect(phone).toHaveValue("(20) 98765-4321");
    await user.tab();
    expect(
      await screen.findByText("O DDD 20 não existe. Confira o código da cidade."),
    ).toBeVisible();
    await user.clear(phone);
    await user.type(phone, "11987654321");
    expect(phone).toHaveValue("(11) 98765-4321");
    await user.selectOptions(screen.getByLabelText("País do telefone"), "US");
    expect(phone).toHaveValue("(119) 876-5432");
    expect(screen.getByText("Como (201) 555-0123.")).toBeVisible();
  });

  it("o erro do blur espera o clique quando um botão está pressionado (nada se move sob o ponteiro)", async () => {
    const user = userEvent.setup();
    renderCheckout();
    const email = await screen.findByLabelText("E-mail");
    await user.type(email, "ana@");
    const button = screen.getByRole("button", { name: "Continuar para pagamento" });
    fireEvent.pointerDown(button);
    fireEvent.blur(email);
    expect(
      screen.queryByText("Digite um e-mail válido, como nome@exemplo.com."),
    ).not.toBeInTheDocument();
    fireEvent.click(button);
    expect(await screen.findByText(/Corrija \d campos para continuar/)).toBeVisible();
    expect(
      screen.getAllByText("Digite um e-mail válido, como nome@exemplo.com.").length,
    ).toBeGreaterThan(0);
  });

  it("válido: avança e leva o foco ao h2 do passo", async () => {
    const user = userEvent.setup();
    renderCheckout();
    await fillHolder(user);
    await clickButton(user, "Continuar para pagamento");
    expect(await screen.findByRole("heading", { level: 2, name: "Pagamento" })).toHaveFocus();
    expect(screen.getByText("Passo 2 de 3")).toBeVisible();
  });
});

describe("passo 2 (critério 24)", () => {
  const toPayment = async (user: ReturnType<typeof userEvent.setup>) => {
    await fillHolder(user);
    await clickButton(user, "Continuar para pagamento");
    await screen.findByRole("heading", { level: 2, name: "Pagamento" });
  };

  it("atributos de autocomplete e inputMode dos campos sensíveis", async () => {
    const user = userEvent.setup();
    renderCheckout();
    await toPayment(user);
    expect(screen.getByLabelText("Número do cartão")).toHaveAttribute("autocomplete", "cc-number");
    expect(screen.getByLabelText("Número do cartão")).toHaveAttribute("inputmode", "numeric");
    expect(screen.getByLabelText("Nome impresso no cartão")).toHaveAttribute(
      "autocomplete",
      "cc-name",
    );
    expect(screen.getByLabelText("Validade")).toHaveAttribute("autocomplete", "cc-exp");
    expect(screen.getByLabelText("CVV")).toHaveAttribute("autocomplete", "cc-csc");
    expect(screen.getByLabelText("CVV")).toHaveAttribute("type", "text");
    expect(screen.getByRole("textbox", { name: "CPF" })).toHaveAttribute("autocomplete", "off");
    expect(screen.getByText("Pagamento simulado")).toBeVisible();
  });

  it("máscara, bandeira e mensagens de Luhn, vencido, mês, CVV e CPF", async () => {
    const user = userEvent.setup();
    renderCheckout();
    await toPayment(user);
    const number = screen.getByLabelText("Número do cartão");
    await user.type(number, "4111111111111112");
    expect(number).toHaveValue("4111 1111 1111 1112");
    expect(screen.getByText("Bandeira: Visa")).toBeVisible();
    await user.tab();
    expect(await screen.findByText(/Número de cartão inválido\./)).toBeVisible();
    await user.type(screen.getByLabelText("Validade"), "0120");
    expect(screen.getByLabelText("Validade")).toHaveValue("01/20");
    await user.tab();
    expect(await screen.findByText(/Cartão vencido\./)).toBeVisible();
    await user.clear(screen.getByLabelText("Validade"));
    await user.type(screen.getByLabelText("Validade"), "1330");
    await user.tab();
    expect(await screen.findByText(/Mês inválido\./)).toBeVisible();
    await user.type(screen.getByLabelText("CVV"), "12");
    await user.tab();
    expect(await screen.findByText("Digite os 3 números do verso do cartão.")).toBeVisible();
    const cpf = screen.getByRole("textbox", { name: "CPF" });
    await user.type(cpf, "11111111111");
    await user.tab();
    expect(await screen.findByText(/CPF inválido\./)).toBeVisible();
  });

  it("passaporte: troca o rótulo, limpa o valor e aceita FZ123456", async () => {
    const user = userEvent.setup();
    renderCheckout();
    await toPayment(user);
    await user.type(screen.getByRole("textbox", { name: "CPF" }), "111");
    await user.click(screen.getByRole("radio", { name: "Passaporte" }));
    const passport = screen.getByRole("textbox", { name: "Número do passaporte" });
    expect(passport).toHaveValue("");
    await user.type(passport, "abc");
    await user.tab();
    expect(await screen.findByText(/Passaporte inválido\./)).toBeVisible();
    await user.clear(passport);
    await user.type(passport, "fz123456");
    expect(passport).toHaveValue("FZ123456");
    await waitFor(() =>
      expect(screen.queryByText(/Passaporte inválido\./)).not.toBeInTheDocument(),
    );
  });
});

describe("passo 3 (critérios 26–27)", () => {
  it("cartão e documento mascarados e 'Editar' volta ao passo com foco no h2", async () => {
    const user = userEvent.setup();
    renderCheckout();
    await goToReview(user);
    expect(screen.getByText(/Visa •••• 1111 · validade 12\/30/)).toBeVisible();
    expect(screen.getByText("CPF ***.982.247-**")).toBeVisible();
    expect(screen.queryByText(/4111 1111/)).not.toBeInTheDocument();
    expect(screen.getByText("Ana Souza · titular")).toBeVisible();
    await user.click(screen.getByRole("button", { name: /Editar\s*pagamento/ }));
    expect(await screen.findByRole("heading", { level: 2, name: "Pagamento" })).toHaveFocus();
    expect(screen.getByLabelText("Número do cartão")).toHaveValue("4111 1111 1111 1111");
  });

  it("termos: Dialog com corpo focável, 'Li e aceito' marca o checkbox e devolve o foco", async () => {
    const user = userEvent.setup();
    renderCheckout();
    await goToReview(user);
    const trigger = screen.getByRole("button", { name: "Ler termos e condições" });
    await user.click(trigger);
    expect(
      await screen.findByRole("region", { name: "Termos e condições da reserva" }),
    ).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Li e aceito" }));
    expect(screen.getByRole("checkbox", { name: /Li e aceito os termos/ })).toBeChecked();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("confirmar sem aceitar: erro no checkbox e no resumo, sem enviar", async () => {
    const user = userEvent.setup();
    renderCheckout();
    await goToReview(user);
    await clickButton(user, "Confirmar reserva");
    const checkbox = screen.getByRole("checkbox", { name: /Li e aceito os termos/ });
    await waitFor(() => expect(checkbox).toHaveFocus());
    expect(checkbox).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getAllByText("Para continuar, aceite os termos da reserva.").length,
    ).toBeGreaterThan(0);
  });
});

it("o cartão não aparece em nenhum lugar do DOM da revisão", async () => {
  const user = userEvent.setup();
  renderCheckout();
  await fillHolder(user);
  await clickButton(user, "Continuar para pagamento");
  await fillCard(user);
  await clickButton(user, "Revisar reserva");
  await screen.findByRole("heading", { level: 2, name: "Revise e confirme" });
  expect(document.body.innerHTML).not.toContain("4111 1111 1111 1111");
  expect(document.body.innerHTML).not.toContain("52998224725");
});
