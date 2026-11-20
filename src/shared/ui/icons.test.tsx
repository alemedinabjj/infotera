import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CompareIcon, GlobeIcon, HeartIcon, MapIcon, SuitcaseIcon } from "./icons";

describe("ícones de extras", () => {
  it.each([
    ["heart", <HeartIcon key="h" />],
    ["compare", <CompareIcon key="c" />],
    ["suitcase", <SuitcaseIcon key="s" />],
    ["globe", <GlobeIcon key="g" />],
    ["map", <MapIcon key="m" />],
  ])("%s é decorativo (aria-hidden)", (_name, icon) => {
    const { container } = render(icon);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("HeartIcon preenche só com filled", () => {
    const { container, rerender } = render(<HeartIcon />);
    expect(container.querySelector("svg")).toHaveAttribute("fill", "none");
    rerender(<HeartIcon filled />);
    expect(container.querySelector("svg")).toHaveAttribute("fill", "currentColor");
  });
});
