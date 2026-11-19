import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { addDays, todayISO } from "@/shared/lib/dates";
import { Toaster } from "@/shared/ui";
import { MissingDestination } from "./MissingDestination";
import { SearchHeader } from "./SearchHeader";

const SUMMARY = "12–15 dez · 3 noites · 2 adultos · 1 quarto";

const Form = () => (
  <form aria-label="Formulário de busca">
    <button type="submit">Buscar hotéis</button>
  </form>
);

const renderHeader = (props: Partial<Parameters<typeof SearchHeader>[0]> = {}) =>
  render(
    <>
      <SearchHeader
        destination="Rio de Janeiro, RJ"
        summary={SUMMARY}
        mode="stay"
        checkIn={addDays(todayISO(), 30)}
        editForm={<Form />}
        {...props}
      />
      <Toaster />
    </>,
  );

const stubClipboard = (writeText: (text: string) => Promise<void>) =>
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });

afterEach(() => vi.unstubAllGlobals());

describe("SearchHeader: modo stay (critério 26)", () => {
  it("h1 com o destino e o resumo; painel fechado", () => {
    renderHeader();
    expect(
      screen.getByRole("heading", { level: 1, name: "Hotéis em Rio de Janeiro, RJ" }),
    ).toBeInTheDocument();
    expect(screen.getByText(SUMMARY)).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: "Alterar busca" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it("'Alterar busca' abre e fecha o painel sem mover o foco", async () => {
    const user = userEvent.setup();
    renderHeader();
    const toggle = screen.getByRole("button", { name: "Alterar busca" });
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAttribute("aria-controls", "search-edit-panel");
    expect(screen.getByRole("form", { name: "Formulário de busca" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Alterar busca" })).toBeInTheDocument();
    expect(toggle).toHaveFocus();
    await user.click(toggle);
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it("sem aviso quando as datas são futuras", () => {
    renderHeader();
    expect(screen.queryByText("As datas desta busca já passaram")).not.toBeInTheDocument();
  });
});

describe("SearchHeader: datas passadas (critério 27)", () => {
  it("mostra o aviso quando o check-in já passou", async () => {
    renderHeader({ checkIn: "2020-01-10" });
    expect(await screen.findByText("As datas desta busca já passaram")).toBeInTheDocument();
    expect(screen.getByText(/Use "Alterar busca"/)).toBeInTheDocument();
  });
});

describe("SearchHeader: modo browse (critério 25)", () => {
  it("painel aberto com o aviso pedindo as datas antes do formulário", () => {
    renderHeader({ mode: "browse", summary: "Datas não definidas", checkIn: null });
    expect(screen.getByText("Datas não definidas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alterar busca" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    const notice = screen.getByText("Escolha as datas da estadia");
    const form = screen.getByRole("form");
    expect(notice.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(/mostramos o preço total/)).toBeInTheDocument();
  });
});

describe("SearchHeader: copiar link (critério 15)", () => {
  it("copia a URL atual e avisa com toast", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(async () => undefined);
    renderHeader();
    stubClipboard(writeText);
    await user.click(screen.getByRole("button", { name: "Copiar link" }));
    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(await screen.findByText("Link copiado.")).toBeInTheDocument();
  });

  it("se a cópia falhar, orienta a copiar da barra", async () => {
    const user = userEvent.setup();
    renderHeader();
    stubClipboard(async () => {
      throw new Error("negado");
    });
    await user.click(screen.getByRole("button", { name: "Copiar link" }));
    expect(
      await screen.findByText("Não foi possível copiar. Copie o endereço na barra do navegador."),
    ).toBeInTheDocument();
  });

  it("sem a API de clipboard também cai no toast de erro", async () => {
    const user = userEvent.setup();
    renderHeader();
    vi.stubGlobal("navigator", { ...navigator, clipboard: undefined });
    await user.click(screen.getByRole("button", { name: "Copiar link" }));
    await waitFor(() =>
      expect(screen.getAllByText(/Não foi possível copiar/).length).toBeGreaterThan(0),
    );
  });
});

describe("SearchHeader: foco depois de Alterar busca", () => {
  it("o envio do painel leva o foco ao h1 na próxima montagem", async () => {
    const user = userEvent.setup();
    const { unmount } = renderHeader();
    await user.click(screen.getByRole("button", { name: "Alterar busca" }));
    const form = screen.getByRole("form");
    act(() => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    window.history.pushState(null, "", "/search?destination=Outro");
    unmount();
    renderHeader();
    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
  });

  const submitPanel = async () => {
    const user = userEvent.setup();
    const { unmount } = renderHeader();
    await user.click(screen.getByRole("button", { name: "Alterar busca" }));
    act(() => {
      screen
        .getByRole("form")
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    return unmount;
  };

  it("envio sem mudar a URL não conta como edição", async () => {
    const unmount = await submitPanel();
    unmount();
    renderHeader();
    expect(screen.getByRole("heading", { level: 1 })).not.toHaveFocus();
  });

  it("Voltar/Avançar descarta o envio pendente (sem prazo)", async () => {
    const unmount = await submitPanel();
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    window.history.pushState(null, "", "/search?destination=Depois");
    unmount();
    renderHeader();
    expect(screen.getByRole("heading", { level: 1 })).not.toHaveFocus();
  });

  it("carga normal não mexe no foco", () => {
    renderHeader();
    expect(screen.getByRole("heading", { level: 1 })).not.toHaveFocus();
  });
});

describe("MissingDestination (critério 24)", () => {
  it("h1, texto e o slot do formulário", () => {
    render(
      <MissingDestination>
        <Form />
      </MissingDestination>,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Para onde você vai?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Escolha um destino para ver hotéis, preços e disponibilidade."),
    ).toBeInTheDocument();
    expect(screen.getByRole("form")).toBeInTheDocument();
  });
});
