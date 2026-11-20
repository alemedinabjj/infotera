import { describe, expect, it } from "vitest";
import { photoOpenStatus } from "./photo-open-status";

describe("photoOpenStatus", () => {
  it("rota falhou: online é falha, offline é sem internet", () => {
    expect(photoOpenStatus(false, true)).toBe("failed");
    expect(photoOpenStatus(false, false)).toBe("offline");
  });

  it("cartão offline: segue offline sem rede e fica neutro com a conexão de volta", () => {
    expect(photoOpenStatus(true, false)).toBe("offline");
    expect(photoOpenStatus(true, true)).toBe("reconnected");
  });
});
