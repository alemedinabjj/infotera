import { describe, expect, it } from "vitest";
import { toUserMessage } from "./errors";
import { ApiError } from "./http";

describe("toUserMessage", () => {
  it("cobre todos os kinds com mensagens distintas", () => {
    const messages = [
      toUserMessage(new ApiError("network", null, "x"), "pt-BR"),
      toUserMessage(new ApiError("timeout", null, "x"), "pt-BR"),
      toUserMessage(new ApiError("parse", 200, "x"), "pt-BR"),
      toUserMessage(new ApiError("http", 404, "x"), "pt-BR"),
      toUserMessage(new ApiError("http", 422, "x"), "pt-BR"),
      toUserMessage(new ApiError("http", 500, "x"), "pt-BR"),
      toUserMessage(new Error("x"), "pt-BR"),
    ];
    expect(new Set(messages).size).toBe(messages.length);
  });

  it("nunca vaza o texto bruto do servidor nem o status", () => {
    const message = toUserMessage(
      new ApiError("http", 500, "HTTP 500: Falha simulada pela mock API"),
      "pt-BR",
    );
    expect(message).not.toMatch(/500|Falha simulada|mock/i);
  });

  it("trata valores que não são ApiError", () => {
    expect(toUserMessage("boom", "pt-BR")).toMatch(/Algo deu errado/);
  });
});
