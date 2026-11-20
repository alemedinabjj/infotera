import { describe, expect, it } from "vitest";
import { canShowUpdateToast } from "./update-toast";

describe("canShowUpdateToast", () => {
  it.each(["/checkout", "/en/checkout", "/checkout/"])("não aparece em %s", (path) => {
    expect(canShowUpdateToast(path)).toBe(false);
  });

  it.each(["/", "/search", "/en/search", "/hotel/1", "/confirmation/9", "/checkouts"])(
    "aparece em %s",
    (path) => {
      expect(canShowUpdateToast(path)).toBe(true);
    },
  );
});
