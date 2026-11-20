import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nProvider, useLocale } from "./client";

const Probe = () => <p>{useLocale()}</p>;

describe("I18nProvider", () => {
  it("entrega o locale da rota", () => {
    render(
      <I18nProvider locale="en-US">
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByText("en-US")).toBeInTheDocument();
  });

  it("sem provider usa pt-BR", () => {
    render(<Probe />);
    expect(screen.getByText("pt-BR")).toBeInTheDocument();
  });
});
