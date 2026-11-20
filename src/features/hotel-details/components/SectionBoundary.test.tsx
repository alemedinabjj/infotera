import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiGet } from "@/shared/api/http";
import { z } from "@/shared/lib/zod";
import { renderWithProviders } from "@/shared/testing/render";
import { SectionBoundary } from "./SectionBoundary";

const probeOptions = queryOptions({
  queryKey: ["probe"],
  queryFn: ({ signal }) => apiGet("/probe", z.array(z.string()), { signal }),
});

const Content = () => {
  const { data } = useSuspenseQuery(probeOptions);
  return <p>Conteúdo: {data.join(", ")}</p>;
};

const Harness = () => (
  <>
    <h2 id="probe-heading" tabIndex={-1}>
      Seção
    </h2>
    <SectionBoundary
      headingId="probe-heading"
      errorTitle="Não foi possível carregar a seção."
      options={probeOptions}
      loading={<p>Carregando…</p>}
    >
      <Content />
    </SectionBoundary>
  </>
);

type Deferred = { resolve: (response: Response) => void };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("SectionBoundary: retry no lugar (critério 24)", () => {
  it("sucesso inicial mostra o conteúdo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json(["a", "b"])),
    );
    renderWithProviders(<Harness />);
    expect(screen.getByText("Carregando…")).toBeInTheDocument();
    expect(await screen.findByText("Conteúdo: a, b")).toBeInTheDocument();
  });

  it("erro: mensagem fixa, 'Tentando…' no mesmo botão, e o conteúdo entra com o foco no h2", async () => {
    const user = userEvent.setup();
    let pending: Deferred | null = null;
    const fetchMock = vi
      .fn<(url: string) => Promise<Response>>()
      .mockResolvedValueOnce(json({ error: "Falha simulada pela mock API" }, 500))
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            pending = { resolve };
          }),
      );
    vi.stubGlobal("fetch", fetchMock);
    renderWithProviders(<Harness />);

    const button = await screen.findByRole("button", { name: "Tentar de novo" });
    expect(
      screen.getByRole("heading", { name: "Não foi possível carregar a seção." }),
    ).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("Falha simulada");

    button.focus();
    await user.click(button);
    expect(await screen.findByRole("button", { name: "Tentando…" })).toBe(button);
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveFocus();

    await user.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await waitFor(() => expect(pending).not.toBeNull());
    (pending as Deferred | null)?.resolve(json(["x"]));
    expect(await screen.findByText("Conteúdo: x")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Tentar|Tentando/ })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Seção" })).toHaveFocus());
  });

  it("falha de novo: o botão volta ao rótulo, com o foco, e o erro continua", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({ error: "x" }, 500)),
    );
    renderWithProviders(<Harness />);
    const button = await screen.findByRole("button", { name: "Tentar de novo" });
    button.focus();
    await user.click(button);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Tentar de novo" })).not.toHaveAttribute(
        "aria-busy",
      ),
    );
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBe(button);
    expect(button).toHaveFocus();
    expect(
      screen.getByRole("heading", { name: "Não foi possível carregar a seção." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Seção" })).not.toHaveFocus();
  });
});
