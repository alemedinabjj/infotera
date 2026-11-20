import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { navigationSpies, setTestUrl } from "./next-navigation";

vi.mock("next/navigation", async () => (await import("./next-navigation")).navigationMock);

const { useRouter, useSearchParams } = await import("next/navigation");

const Probe = () => {
  const params = useSearchParams();
  const router = useRouter();
  return (
    <>
      <p data-testid="sort">{params.get("sort") ?? "nenhum"}</p>
      <button type="button" onClick={() => router.push("/search?sort=push")}>
        ir
      </button>
    </>
  );
};

describe("next-navigation mock", () => {
  it("lê a URL inicial definida por setTestUrl", () => {
    setTestUrl("/search?sort=price-asc");
    render(<Probe />);
    expect(screen.getByTestId("sort")).toHaveTextContent("price-asc");
  });

  it("replaceState atualiza useSearchParams", () => {
    setTestUrl("/search");
    render(<Probe />);
    expect(screen.getByTestId("sort")).toHaveTextContent("nenhum");
    act(() => window.history.replaceState(null, "", "/search?sort=rating-desc"));
    expect(screen.getByTestId("sort")).toHaveTextContent("rating-desc");
  });

  it("popstate também atualiza", () => {
    setTestUrl("/search?sort=a");
    render(<Probe />);
    act(() => {
      // O jsdom troca a URL sem avisar; o popstate é quem notifica (como o Voltar do browser).
      window.history.replaceState(null, "", "/search?sort=b");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.getByTestId("sort")).toHaveTextContent("b");
  });

  it("router.push é espiável e muda a URL", () => {
    setTestUrl("/search");
    render(<Probe />);
    act(() => screen.getByRole("button", { name: "ir" }).click());
    expect(navigationSpies.push).toHaveBeenCalledWith("/search?sort=push");
    expect(window.location.search).toBe("?sort=push");
    expect(screen.getByTestId("sort")).toHaveTextContent("push");
  });
});
