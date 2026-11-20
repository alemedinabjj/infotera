import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeReview } from "@/shared/testing/fixtures";
import { renderWithProviders } from "@/shared/testing/render";
import { ReviewsStatic } from "./ReviewsStatic";

describe("ReviewsStatic (fallback do pager)", () => {
  it("mostra a 1ª página e a paginação, toda desabilitada (antes de hidratar não faria nada)", () => {
    renderWithProviders(
      <ReviewsStatic
        page={{ items: [makeReview({ id: 1, title: "Ótima estadia" })], total: 14 }}
      />,
    );
    expect(screen.getByText("Ótima estadia")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Paginação" })).toBeInTheDocument();
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(1);
    for (const button of buttons) expect(button).toBeDisabled();
  });
});
