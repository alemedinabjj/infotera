import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Link from "next/link";
import { describe, expect, it, vi } from "vitest";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { buttonClassName } from "./button-styles";
import { Checkbox } from "./Checkbox";
import { IconButton } from "./IconButton";
import { Input } from "./Input";
import { Radio } from "./Radio";
import { Select } from "./Select";
import { Skeleton } from "./Skeleton";
import { Stars } from "./Stars";

describe("Button", () => {
  it("é type=button por padrão e dispara onClick", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Buscar hotéis</Button>);
    const button = screen.getByRole("button", { name: "Buscar hotéis" });
    expect(button).toHaveAttribute("type", "button");
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("loading usa aria-disabled + aria-busy, mantém o foco e ignora cliques", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Confirmar reserva
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Confirmar reserva" });
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    button.focus();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(button).toHaveFocus();
  });

  it("aria-disabled ganha a aparência de desabilitado em qualquer variante", () => {
    for (const variant of ["primary", "secondary", "ghost", "danger"] as const) {
      expect(buttonClassName({ variant })).toContain("aria-disabled:text-fg-subtle");
      expect(buttonClassName({ variant })).toContain("aria-disabled:cursor-not-allowed");
    }
  });

  it("loadingText substitui o rótulo em uma região aria-live polite", () => {
    render(
      <Button loading loadingText="Confirmando…">
        Confirmar reserva
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Confirmando…" });
    expect(button.querySelector('[aria-live="polite"]')).toHaveTextContent("Confirmando…");
  });

  it("tem anel de foco visível com o token do design system", () => {
    render(<Button>Ok</Button>);
    expect(screen.getByRole("button")).toHaveClass("focus-visible:outline-focus");
  });

  it("buttonClassName estiliza um Link e mescla className", () => {
    render(
      <Link href="/search" className={buttonClassName({ variant: "secondary", fullWidth: true })}>
        Ver quartos
      </Link>,
    );
    expect(screen.getByRole("link", { name: "Ver quartos" })).toHaveClass(
      "border-primary",
      "w-full",
    );
    expect(buttonClassName({ variant: "primary" })).toContain("bg-primary");
  });

  it("mescla className sem duplicar conflitos", () => {
    render(<Button className="h-12">Ok</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-12");
    expect(screen.getByRole("button")).not.toHaveClass("h-11");
  });
});

describe("IconButton", () => {
  it("expõe o aria-label como nome", () => {
    render(<IconButton aria-label="Fechar" icon={<span aria-hidden="true">x</span>} />);
    expect(screen.getByRole("button", { name: "Fechar" })).toHaveAttribute("type", "button");
  });
});

describe("controles de formulário", () => {
  it("Input, Select, Checkbox e Radio repassam props e ref", () => {
    render(
      <>
        <label htmlFor="nome">Nome</label>
        <Input id="nome" name="nome" defaultValue="Ana" />
        <label htmlFor="ordem">Ordem</label>
        <Select id="ordem" defaultValue="b">
          <option value="a">A</option>
          <option value="b">B</option>
        </Select>
        <Checkbox label="Aceito os termos" />
        <Radio label="Cartão" name="pay" />
      </>,
    );
    expect(screen.getByLabelText("Nome")).toHaveValue("Ana");
    expect(screen.getByLabelText("Ordem")).toHaveValue("b");
    expect(screen.getByLabelText("Aceito os termos")).not.toBeChecked();
    expect(screen.getByLabelText("Cartão")).toHaveAttribute("type", "radio");
  });

  it("Checkbox alterna ao clicar no rótulo", async () => {
    render(<Checkbox label="Wi-Fi" />);
    await userEvent.click(screen.getByText("Wi-Fi"));
    expect(screen.getByRole("checkbox", { name: "Wi-Fi" })).toBeChecked();
  });
});

describe("Skeleton, Badge e Stars", () => {
  it("Skeleton é aria-hidden", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("Badge mostra o texto", () => {
    render(<Badge tone="danger">Esgotado</Badge>);
    expect(screen.getByText("Esgotado")).toHaveClass("text-danger");
  });

  it("Stars decorative esconde o contêiner e remove o role img", () => {
    const { container } = render(<Stars locale="pt-BR" value={4} decorative />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("Stars tem nome acessível e estrelas aria-hidden", () => {
    const { container } = render(<Stars locale="pt-BR" value={4.5} />);
    expect(screen.getByRole("img", { name: "Avaliação 4,5 de 5" })).toBeInTheDocument();
    for (const svg of container.querySelectorAll("svg")) {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("Stars aceita label customizado", () => {
    render(<Stars locale="pt-BR" value={3} label="Nota do quarto: 3" />);
    expect(screen.getByRole("img", { name: "Nota do quarto: 3" })).toBeInTheDocument();
  });
});
