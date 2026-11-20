import { onlineManager } from "@tanstack/react-query";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Review } from "@/shared/api/schemas";
import { makeReview } from "@/shared/testing/fixtures";
import { renderWithProviders } from "@/shared/testing/render";
import { ReviewsSection } from "./ReviewsSection";

const TOTAL = 14;

const reviewsFor = (page: number): Review[] => {
  const size = page === 3 ? 4 : 5;
  return Array.from({ length: size }, (_, i) => {
    const n = (page - 1) * 5 + i + 1;
    return makeReview({
      id: n,
      guestName: `Hóspede ${n}`,
      title: `Título ${n}`,
      comment: `Comentário ${n}`,
      rating: 5,
      date: "2025-07-13",
      helpful: n === 1 ? 42 : 0,
      verified: n % 2 === 1,
    });
  });
};

const json = (items: Review[], total = TOTAL) =>
  new Response(JSON.stringify(items), {
    status: 200,
    headers: { "Content-Type": "application/json", "X-Total-Count": String(total) },
  });

const pageOf = (url: string): number => Number(new URL(url).searchParams.get("_page"));

const stubReviews = (override?: (page: number) => Promise<Response> | null) => {
  const fetchMock = vi.fn(async (url: string) => {
    const page = pageOf(url);
    return (await override?.(page)) ?? json(reviewsFor(page));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const first = (total = TOTAL) => ({
  page: { items: total === 0 ? [] : reviewsFor(1), total },
  fetchedAt: Date.now(),
});

const renderReviews = () =>
  renderWithProviders(
    <>
      <button type="button">Fora da seção</button>
      <section aria-labelledby="avaliacoes-titulo">
        <h2 id="avaliacoes-titulo" tabIndex={-1}>
          Avaliações
        </h2>
        <ReviewsSection
          locale="pt-BR"
          hotelId={45}
          rating={4.7}
          reviewCount={2000}
          first={first()}
        />
      </section>
    </>,
  );

const pageButton = (n: number) => screen.getByRole("button", { name: `Página ${n}` });

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  onlineManager.setOnline(true);
});

describe("ReviewsSection: primeira página (critério 28)", () => {
  it("nota agregada, faixa, 5 itens em ordem, campos do comentário e paginação", async () => {
    stubReviews();
    const { container } = renderReviews();
    expect(container).toHaveTextContent("2.000 avaliações");
    expect(await screen.findByText("Mostrando 1–5 de 14 comentários")).toBeInTheDocument();
    const items = screen.getAllByRole("article");
    expect(items).toHaveLength(5);
    expect(
      items.map((item) => within(item).getByRole("heading", { level: 3 }).textContent),
    ).toEqual(["Título 1", "Título 2", "Título 3", "Título 4", "Título 5"]);
    const first = items[0] as HTMLElement;
    expect(first).toHaveTextContent("Hóspede 1");
    expect(first).toHaveTextContent("Nota 5 de 5");
    expect(first).toHaveTextContent("13/07/2025");
    expect(first).toHaveTextContent("Hóspede verificado");
    expect(first).toHaveTextContent("42 pessoas acharam útil");
    expect(within(first).getByText("13/07/2025")).toHaveAttribute("datetime", "2025-07-13");
    expect(items[1]).not.toHaveTextContent("Hóspede verificado");
    expect(items[1]).not.toHaveTextContent("acharam útil");
    expect(first.querySelector("img")).toHaveAttribute("alt", "");
    expect(screen.getByRole("navigation", { name: "Paginação" })).toHaveTextContent(
      "Página 1 de 3",
    );
    expect(pageButton(1)).toHaveAttribute("aria-current", "page");
  });

  it("a página 1 vem do snapshot: nenhum request ao abrir", async () => {
    const fetchMock = stubReviews();
    renderReviews();
    expect(await screen.findByText("Título 1")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("ReviewsSection: trocar de página (critério 29)", () => {
  it("mantém a página 1 visível, aria-busy e 'Atualizando…' até a 2 chegar; depois foca o h2", async () => {
    const user = userEvent.setup();
    let release: (response: Response) => void = () => undefined;
    stubReviews((page) =>
      page === 2
        ? new Promise<Response>((resolve) => {
            release = resolve;
          })
        : null,
    );
    renderReviews();
    await screen.findByText("Título 1");
    await user.click(pageButton(2));

    expect(await screen.findByText("Atualizando avaliações…")).toBeInTheDocument();
    expect(screen.getByText("Título 1")).toBeVisible();
    expect(
      screen.getAllByRole("list").find((list) => list.getAttribute("aria-busy") === "true"),
    ).toBeDefined();
    expect(pageButton(1)).toHaveAttribute("aria-current", "page");
    expect(pageButton(2)).not.toHaveAttribute("aria-current");

    await act(async () => release(json(reviewsFor(2))));
    expect(await screen.findByText("Título 6")).toBeInTheDocument();
    expect(screen.queryByText("Título 1")).not.toBeInTheDocument();
    expect(screen.getByText("Mostrando 6–10 de 14 comentários")).toBeInTheDocument();
    expect(pageButton(2)).toHaveAttribute("aria-current", "page");
    expect(screen.queryByText("Atualizando avaliações…")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Avaliações" })).toHaveFocus());
  });

  it("a página 3 tem 4 itens", async () => {
    const user = userEvent.setup();
    stubReviews();
    renderReviews();
    await screen.findByText("Título 1");
    await user.click(pageButton(3));
    expect(await screen.findByText("Título 11")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(4);
    expect(screen.getByText("Mostrando 11–14 de 14 comentários")).toBeInTheDocument();
  });
});

describe("ReviewsSection: vazio (critério 30)", () => {
  it("EmptyState sem ação; a nota do hotel continua", async () => {
    const { container } = renderWithProviders(
      <ReviewsSection locale="pt-BR" hotelId={6} rating={4.2} reviewCount={456} first={first(0)} />,
    );
    expect(
      await screen.findByRole("heading", { name: "Ainda sem comentários" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Este hotel ainda não recebeu comentários de hóspedes."),
    ).toBeInTheDocument();
    expect(container).toHaveTextContent("456 avaliações");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Paginação" })).not.toBeInTheDocument();
  });
});

describe("ReviewsSection: falha e offline (critério 31)", () => {
  it("falha ao trocar de página: erro com retry no lugar e a lista antiga sai", async () => {
    const user = userEvent.setup();
    let failing = true;
    stubReviews((page) =>
      page === 2 && failing
        ? Promise.resolve(new Response('{"error":"Falha simulada pela mock API"}', { status: 500 }))
        : null,
    );
    renderReviews();
    await screen.findByText("Título 1");
    await user.click(pageButton(2));

    expect(
      await screen.findByRole("heading", { name: "Não foi possível carregar as avaliações." }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Título 1")).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("Falha simulada");

    // O erro veio da troca de página: o foco já está em "Tentar de novo".
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toHaveFocus();

    failing = false;
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText("Título 6")).toBeInTheDocument();
    expect(screen.getByText("Mostrando 6–10 de 14 comentários")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Avaliações" })).toHaveFocus());
  });

  it("offline na troca: aviso acima da página atual, que continua com a paginação na atual", async () => {
    const user = userEvent.setup();
    stubReviews();
    renderReviews();
    await screen.findByText("Título 1");
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
    act(() => {
      onlineManager.setOnline(false);
      window.dispatchEvent(new Event("offline"));
    });
    await user.click(pageButton(2));

    expect(await screen.findByText("Você está sem internet.")).toBeInTheDocument();
    expect(
      screen.getByText("As avaliações aparecem assim que a conexão voltar."),
    ).toBeInTheDocument();
    expect(screen.getByText("Título 1")).toBeVisible();
    expect(pageButton(1)).toHaveAttribute("aria-current", "page");
    // Sem spinner nem "Atualizando…" offline, e o aviso fica depois da paginação (não a empurra).
    expect(screen.queryByText("Atualizando avaliações…")).not.toBeInTheDocument();
    expect(
      pageButton(1).compareDocumentPosition(screen.getByText("Você está sem internet.")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    act(() => {
      onlineManager.setOnline(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(await screen.findByText("Título 6")).toBeInTheDocument();
    expect(screen.queryByText("Você está sem internet.")).not.toBeInTheDocument();
  });

  it("ao voltar online, não rouba o foco de quem já saiu da seção", async () => {
    const user = userEvent.setup();
    stubReviews();
    renderReviews();
    await screen.findByText("Título 1");
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
    act(() => {
      onlineManager.setOnline(false);
      window.dispatchEvent(new Event("offline"));
    });
    await user.click(pageButton(2));
    await screen.findByText("Você está sem internet.");
    screen.getByRole("button", { name: "Fora da seção" }).focus();

    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    act(() => {
      onlineManager.setOnline(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(await screen.findByText("Título 6")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fora da seção" })).toHaveFocus();
  });
});
