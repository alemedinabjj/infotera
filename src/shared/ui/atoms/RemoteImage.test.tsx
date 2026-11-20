import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RemoteImage } from "./RemoteImage";

const SRC = "https://images.unsplash.com/photo-1";

describe("RemoteImage", () => {
  it("renderiza a foto com alt e lazy por padrão", () => {
    render(<RemoteImage src={SRC} alt="Fachada" sizes="100vw" />);
    const img = screen.getByRole("img", { name: "Fachada" });
    expect(img).toHaveAttribute("loading", "lazy");
  });

  it("priority carrega já, com prioridade alta", () => {
    render(<RemoteImage src={SRC} alt="Fachada" sizes="100vw" priority />);
    const img = screen.getByRole("img", { name: "Fachada" });
    expect(img).toHaveAttribute("loading", "eager");
    expect(img).toHaveAttribute("fetchpriority", "high");
  });

  it("imagem quebrada vira o bloco com ícone, sem a foto", () => {
    const { container } = render(<RemoteImage src={SRC} alt="Fachada" sizes="100vw" />);
    fireEvent.error(screen.getByRole("img", { name: "Fachada" }));
    expect(screen.queryByRole("img", { name: "Fachada" })).not.toBeInTheDocument();
    expect(container.querySelector("svg[aria-hidden='true']")).toBeInTheDocument();
  });

  it("aceita fallback próprio e avisa o carregamento", async () => {
    const onLoad = vi.fn();
    render(
      <RemoteImage
        src={SRC}
        alt="Foto"
        sizes="100vw"
        onLoad={onLoad}
        fallback={<p>Não foi possível carregar esta foto.</p>}
      />,
    );
    const img = screen.getByRole("img", { name: "Foto" });
    fireEvent.load(img);
    await waitFor(() => expect(onLoad).toHaveBeenCalledTimes(1));
    fireEvent.error(img);
    expect(screen.getByText("Não foi possível carregar esta foto.")).toBeInTheDocument();
  });
});
