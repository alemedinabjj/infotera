import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/api/http";
import { makeBooking } from "@/shared/testing/fixtures";
import { classifyHistoryResults, type HistoryQueryResult } from "./history-rows";

const entry = (n: number) => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  savedAt: "2026-11-19T12:00:00.000Z",
});

const error = (err: unknown): HistoryQueryResult => ({
  status: "error",
  data: undefined,
  error: err,
});

describe("classifyHistoryResults", () => {
  it("classifica cada resultado mantendo a ordem do storage", () => {
    const rows = classifyHistoryResults(
      [entry(1), entry(2), entry(3), entry(4), entry(5), entry(6)],
      [
        { status: "success", data: makeBooking(), error: null },
        error(new ApiError("http", 404, "x")),
        error(new ApiError("http", 500, "x")),
        error(new ApiError("parse", null, "x")),
        { status: "pending", data: undefined, error: null },
        error(new ApiError("network", null, "x")),
      ],
    );
    expect(rows.map((row) => row.kind)).toEqual([
      "found",
      "missing",
      "failed",
      "unreadable",
      "pending",
      "failed",
    ]);
    expect(rows.map((row) => row.entry.id)).toEqual([1, 2, 3, 4, 5, 6].map((n) => entry(n).id));
  });

  it("erro desconhecido nunca vira missing (não apaga o id)", () => {
    expect(classifyHistoryResults([entry(1)], [error(new Error("x"))])[0]?.kind).toBe("failed");
    expect(
      classifyHistoryResults([entry(1)], [error(new ApiError("timeout", null, "x"))])[0]?.kind,
    ).toBe("failed");
  });

  it("consulta em pausa (offline) vira failed, nunca missing", () => {
    const paused: HistoryQueryResult = {
      status: "pending",
      data: undefined,
      error: null,
      paused: true,
    };
    expect(classifyHistoryResults([entry(1)], [paused])[0]?.kind).toBe("failed");
  });

  it("sem resultado ainda é pending", () => {
    expect(classifyHistoryResults([entry(1)], [])[0]?.kind).toBe("pending");
  });
});
