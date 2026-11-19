import { render, screen } from "@testing-library/react";
import { m } from "motion/react";
import { describe, expect, it } from "vitest";
import { MotionProvider } from "./MotionProvider";

describe("MotionProvider", () => {
  it("renderiza m.div dentro do provider", async () => {
    render(
      <MotionProvider>
        <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          conteúdo animado
        </m.div>
      </MotionProvider>,
    );
    expect(await screen.findByText("conteúdo animado")).toBeInTheDocument();
  });
});
