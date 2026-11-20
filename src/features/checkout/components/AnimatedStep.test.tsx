import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnimatedStep } from "./AnimatedStep";

describe("AnimatedStep", () => {
  it("renderiza o passo atual e troca o conteúdo sem desmontar o foco do h2 de fora", () => {
    const { rerender } = render(
      <AnimatedStep step="personal">
        <p>passo 1</p>
      </AnimatedStep>,
    );
    expect(screen.getByText("passo 1")).toBeInTheDocument();
    rerender(
      <AnimatedStep step="payment">
        <p>passo 2</p>
      </AnimatedStep>,
    );
    expect(screen.getByText("passo 2")).toBeInTheDocument();
    expect(screen.queryByText("passo 1")).not.toBeInTheDocument();
  });

  it("o contêiner corta o overflow horizontal", () => {
    const { container } = render(
      <AnimatedStep step="personal">
        <p>x</p>
      </AnimatedStep>,
    );
    expect(container.firstElementChild).toHaveClass("overflow-x-clip");
  });
});
