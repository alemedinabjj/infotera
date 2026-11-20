import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "./SiteHeader";
import { SkipLink } from "./SkipLink";

describe("SkipLink + SiteHeader", () => {
  it("o skip link é o primeiro focável e aponta para #main-content", async () => {
    render(
      <>
        <SkipLink locale="pt-BR" />
        <SiteHeader
          homeLabel="Infotera Hotéis, página inicial"
          homeHref="/"
          brand="Infotera"
          brandSuffix="Hotéis"
        />
      </>,
    );
    await userEvent.tab();
    const skip = screen.getByRole("link", { name: "Pular para o conteúdo" });
    expect(skip).toHaveFocus();
    expect(skip).toHaveAttribute("href", "#main-content");
  });

  it("o header tem link para a home", () => {
    render(
      <SiteHeader
        homeLabel="Infotera Hotéis, página inicial"
        homeHref="/"
        brand="Infotera"
        brandSuffix="Hotéis"
      />,
    );
    expect(screen.getByRole("link", { name: /Infotera Hotéis/ })).toHaveAttribute("href", "/");
  });
});
