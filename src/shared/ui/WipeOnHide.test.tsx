import { render, screen } from "@testing-library/react";
import { Activity } from "react";
import { describe, expect, it } from "vitest";
import { WipeOnHide } from "./WipeOnHide";

type Mode = "visible" | "hidden";

const Host = ({ mode }: { mode: Mode }) => (
  <Activity mode={mode}>
    <WipeOnHide>
      <p>Ana Souza</p>
    </WipeOnHide>
  </Activity>
);

describe("WipeOnHide", () => {
  it("renderiza o conteúdo enquanto visível", () => {
    render(<Host mode="visible" />);
    expect(screen.getByText("Ana Souza")).toBeTruthy();
  });

  it("tira o conteúdo do DOM ao esconder, não só esconde com CSS", () => {
    const { rerender, container } = render(<Host mode="visible" />);
    rerender(<Host mode="hidden" />);
    expect(container.innerHTML).not.toContain("Ana Souza");
    expect(document.body.innerHTML).not.toContain("Ana Souza");
  });

  it("devolve o conteúdo ao mostrar de novo", () => {
    const { rerender } = render(<Host mode="visible" />);
    rerender(<Host mode="hidden" />);
    rerender(<Host mode="visible" />);
    expect(screen.getByText("Ana Souza")).toBeTruthy();
  });
});
