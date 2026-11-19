import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "./Pagination";

describe("Pagination", () => {
  it("não renderiza com uma página só", () => {
    const { container } = render(<Pagination page={1} totalPages={1} getHref={() => "/"} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("modo link: nav, página atual e hrefs", () => {
    render(<Pagination page={5} totalPages={10} getHref={(page) => `/search?page=${page}`} />);
    expect(screen.getByRole("navigation", { name: "Paginação" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Página 5" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Página 4" })).toHaveAttribute(
      "href",
      "/search?page=4",
    );
    expect(screen.getByRole("link", { name: /Próxima/ })).toHaveAttribute("href", "/search?page=6");
    expect(screen.getByText("Página 5 de 10")).toBeInTheDocument();
  });

  it("modo link: Anterior desabilitado na primeira página, sem href", () => {
    render(<Pagination page={1} totalPages={3} getHref={(page) => `/s?p=${page}`} />);
    expect(screen.queryByRole("link", { name: /Anterior/ })).not.toBeInTheDocument();
    expect(screen.getByText("Anterior").closest("[aria-disabled]")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("modo botão: o foco permanece no botão da página depois de mudar de página", async () => {
    const Harness = () => {
      const [page, setPage] = useState(5);
      return <Pagination page={page} totalPages={10} onPageChange={setPage} />;
    };
    render(<Harness />);
    const next = screen.getByRole("button", { name: /Próxima/ });
    await userEvent.click(next);
    expect(screen.getByRole("button", { name: "Página 6" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(next).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Página 7" }));
    expect(screen.getByRole("button", { name: "Página 7" })).toHaveFocus();
  });

  it("modo botão: chama onPageChange e desabilita Próxima no fim", async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={3} totalPages={3} onPageChange={onPageChange} />);
    expect(screen.getByRole("button", { name: /Próxima/ })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Página 2" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
    await userEvent.click(screen.getByRole("button", { name: /Anterior/ }));
    expect(onPageChange).toHaveBeenLastCalledWith(2);
  });

  it("reticências ficam escondidas dos leitores de tela", () => {
    render(<Pagination page={5} totalPages={10} onPageChange={() => undefined} />);
    const ellipses = screen.getAllByText("…");
    expect(ellipses).toHaveLength(2);
    for (const ellipsis of ellipses) expect(ellipsis).toHaveAttribute("aria-hidden", "true");
  });
});
