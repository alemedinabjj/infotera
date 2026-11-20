import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StayAware } from "./StayAware";

describe("StayAware: o buraco na casca", () => {
  it("com os critérios pendentes mostra o mesmo conteúdo, sem critérios (o link já funciona)", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <StayAware criteria={new Promise(() => undefined)}>
        {(criteria) => (
          <a href={criteria === null ? "/search?destination=Rio" : "/search?com-datas"}>
            Resultados
          </a>
        )}
      </StayAware>,
    );
    expect(screen.getByRole("link", { name: "Resultados" })).toHaveAttribute(
      "href",
      "/search?destination=Rio",
    );
  });
});
