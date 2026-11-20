import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

const Bomb = ({ explode }: { explode: boolean | { explode: boolean } }) => {
  if (typeof explode === "object" ? explode.explode : explode) throw new Error("boom");
  return <p>filho ok</p>;
};

const silenceConsole = () => vi.spyOn(console, "error").mockImplementation(() => undefined);

describe("ErrorBoundary", () => {
  it("renderiza os filhos quando nada falha", () => {
    render(
      <ErrorBoundary fallback={() => <p>fallback</p>}>
        <Bomb explode={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("filho ok")).toBeInTheDocument();
  });

  it("mostra o fallback com o erro quando um filho lança", () => {
    silenceConsole();
    render(
      <ErrorBoundary
        fallback={({ error }) => <p>{error instanceof Error ? error.message : "?"}</p>}
      >
        <Bomb explode />
      </ErrorBoundary>,
    );
    expect(screen.getByText("boom")).toBeInTheDocument();
  });

  it("reset chama onReset e remonta os filhos", async () => {
    silenceConsole();
    const state = { explode: true };
    const onReset = vi.fn(() => {
      state.explode = false;
    });
    render(
      <ErrorBoundary
        onReset={onReset}
        fallback={({ reset }) => (
          <button type="button" onClick={reset}>
            Tentar de novo
          </button>
        )}
      >
        <Bomb explode={state} />
      </ErrorBoundary>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(onReset).toHaveBeenCalledOnce();
    expect(screen.getByText("filho ok")).toBeInTheDocument();
  });

  it("sai do erro quando resetKeys muda e não antes", () => {
    silenceConsole();
    const tree = (key: string, explode: boolean) => (
      <ErrorBoundary resetKeys={[key]} fallback={() => <p>fallback</p>}>
        <Bomb explode={explode} />
      </ErrorBoundary>
    );
    const { rerender } = render(tree("a", true));
    expect(screen.getByText("fallback")).toBeInTheDocument();
    rerender(tree("a", false));
    expect(screen.getByText("fallback")).toBeInTheDocument();
    rerender(tree("b", false));
    expect(screen.getByText("filho ok")).toBeInTheDocument();
  });

  it("repassa o erro para onError", () => {
    silenceConsole();
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError} fallback={() => <p>fallback</p>}>
        <Bomb explode />
      </ErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledOnce();
  });
});
