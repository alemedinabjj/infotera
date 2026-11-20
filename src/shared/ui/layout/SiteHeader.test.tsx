import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "./SiteHeader";

describe("SiteHeader: logo", () => {
  it("abaixo de xs mostra só 'Infotera', sem quebrar linha, e o nome acessível segue completo", () => {
    render(<SiteHeader homeLabel="Infotera Hotéis, página inicial" homeHref="/" />);
    const link = screen.getByRole("link", { name: "Infotera Hotéis, página inicial" });
    expect(link.className).toContain("whitespace-nowrap");
    expect(link.textContent).toBe("Infotera Hotéis");
    const rest = link.querySelector("span");
    expect(rest?.className).toContain("hidden xs:inline");
  });
});
