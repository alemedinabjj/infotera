import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RatingScore } from "./RatingScore";

describe("RatingScore", () => {
  it("nota, rótulo e contagem; leitor lê a frase completa", () => {
    const { container } = render(<RatingScore rating={4.8} reviewCount={2847} />);
    expect(container).toHaveTextContent("Nota 4,8 de 5,Excelente·2.847 avaliações");
  });

  it("showLabel=false esconde o rótulo", () => {
    const { container } = render(<RatingScore rating={4.8} reviewCount={1} showLabel={false} />);
    expect(container).not.toHaveTextContent("Excelente");
    expect(container).toHaveTextContent("1 avaliação");
  });

  it("sem avaliações mostra só o aviso", () => {
    const { container } = render(<RatingScore rating={0} reviewCount={0} />);
    expect(container).toHaveTextContent("Sem avaliações");
    expect(container.querySelector("svg")).toBeNull();
  });

  it("sem reviewCount: nota inteira, sem contagem e sem rótulo", () => {
    const { container } = render(<RatingScore rating={5} size="sm" />);
    expect(container).toHaveTextContent("Nota 5 de 5");
    expect(container).not.toHaveTextContent("Excelente");
    expect(container).not.toHaveTextContent("avaliação");
    expect(container.querySelector(".text-sm.font-semibold")).toHaveTextContent("5");
  });
});
