import { describe, expect, it } from "vitest";
import { cardClassName } from "./card-styles";

describe("cardClassName", () => {
  it("static é o padrão, sem hover", () => {
    const classes = cardClassName();
    expect(classes).toContain("rounded-card");
    expect(classes).not.toContain("hover:shadow-raised");
  });

  it("interactive tem hover e anel de foco quando o link recebe foco", () => {
    const classes = cardClassName({ variant: "interactive" });
    expect(classes).toContain("hover:shadow-raised");
    expect(classes).toContain("has-[a:focus-visible]:outline-focus");
  });

  it("selected marca o card com anel, e className é mesclada", () => {
    const classes = cardClassName({ variant: "selected", className: "sm:flex-row" });
    expect(classes).toContain("ring-1");
    expect(classes).toContain("sm:flex-row");
  });
});
