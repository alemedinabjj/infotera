import { describe, expect, it } from "vitest";
import {
  addDays,
  formatDate,
  formatDateRange,
  isBeforeToday,
  isoDateSchema,
  isValidISODate,
  nightsBetween,
  todayISO,
  toISODate,
} from "./dates";

describe("isValidISODate", () => {
  it.each(["2026-02-29", "2026-13-01", "26-1-1", "2026-02-30", "", "2026-1-01", "abcd-ef-gh"])(
    "rejeita %s",
    (value) => {
      expect(isValidISODate(value)).toBe(false);
    },
  );

  it.each(["2028-02-29", "2026-12-31", "2026-01-01"])("aceita %s", (value) => {
    expect(isValidISODate(value)).toBe(true);
  });

  it("isoDateSchema aplica a mesma regra", () => {
    expect(isoDateSchema.safeParse("2026-02-30").success).toBe(false);
    expect(isoDateSchema.safeParse("2026-03-01").success).toBe(true);
  });
});

describe("addDays", () => {
  it("atravessa virada de ano, mês e bissexto", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("atravessa transições de horário de verão sem perder dia", () => {
    expect(addDays("2026-03-07", 2)).toBe("2026-03-09");
    expect(addDays("2026-11-01", 1)).toBe("2026-11-02");
  });
});

describe("nightsBetween", () => {
  it("conta noites inteiras", () => {
    expect(nightsBetween("2026-03-07", "2026-03-08")).toBe(1);
    expect(nightsBetween("2026-03-07", "2026-03-09")).toBe(2);
    expect(nightsBetween("2026-12-30", "2027-01-02")).toBe(3);
    expect(nightsBetween("2026-03-08", "2026-03-08")).toBe(0);
    expect(nightsBetween("2026-03-09", "2026-03-08")).toBe(-1);
  });

  it("não é afetado por DST (americano e europeu)", () => {
    expect(nightsBetween("2026-03-07", "2026-03-09")).toBe(2);
    expect(nightsBetween("2026-10-31", "2026-11-02")).toBe(2);
    expect(nightsBetween("2026-03-28", "2026-03-30")).toBe(2);
  });

  it("lança para data inválida", () => {
    expect(() => nightsBetween("2026-02-30", "2026-03-01")).toThrow(RangeError);
  });
});

describe("toISODate / todayISO", () => {
  it("usa a data local, não UTC", () => {
    expect(toISODate(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
    expect(toISODate(new Date(2026, 0, 5, 0, 5))).toBe("2026-01-05");
  });

  it("todayISO aceita um relógio injetado", () => {
    expect(todayISO(new Date(2026, 10, 19, 22, 0))).toBe("2026-11-19");
  });
});

describe("isBeforeToday", () => {
  it("compara por dia", () => {
    expect(isBeforeToday("2026-11-18", "2026-11-19")).toBe(true);
    expect(isBeforeToday("2026-11-19", "2026-11-19")).toBe(false);
    expect(isBeforeToday("2026-11-20", "2026-11-19")).toBe(false);
  });
});

describe("formatDate", () => {
  it("short não volta um dia", () => {
    expect(formatDate("2026-12-01", "short")).toBe("01/12/2026");
    expect(formatDate("2026-01-01")).toBe("01/01/2026");
  });

  it("long inclui dia da semana", () => {
    expect(formatDate("2026-12-12", "long")).toMatch(/sáb/i);
  });
});

describe("formatDateRange", () => {
  const today = "2026-11-19";

  it.each([
    ["2026-12-12", "2026-12-15", "12–15 dez"],
    ["2026-12-30", "2027-01-02", "30 dez 2026 – 2 jan 2027"],
    ["2026-11-28", "2026-12-02", "28 nov – 2 dez"],
    ["2027-03-10", "2027-03-12", "10–12 mar 2027"],
    ["2027-03-30", "2027-04-02", "30 mar – 2 abr 2027"],
    ["2026-01-01", "2026-01-02", "1–2 jan"],
  ])("%s a %s → %s", (checkIn, checkOut, expected) => {
    expect(formatDateRange(checkIn, checkOut, today)).toBe(expected);
  });
});

describe("formatDate por idioma", () => {
  it.each([
    ["short", "pt-BR", "01/12/2026"],
    ["short", "en-US", "12/01/2026"],
    ["medium", "pt-BR", "1 de dez. de 2026"],
    ["medium", "en-US", "Dec 1, 2026"],
  ] as const)("%s em %s → %s", (format, locale, expected) => {
    expect(formatDate("2026-12-01", format, locale)).toBe(expected);
  });

  it("long em en-US inclui o dia da semana em inglês", () => {
    expect(formatDate("2026-12-12", "long", "en-US")).toMatch(/Sat/);
  });
});

describe("formatDateRange por idioma", () => {
  const today = "2026-11-19";

  it.each([
    ["2026-12-12", "2026-12-15", "Dec 12–15"],
    ["2026-12-30", "2027-01-02", "Dec 30, 2026 – Jan 2, 2027"],
    ["2026-11-28", "2026-12-02", "Nov 28 – Dec 2"],
    ["2027-03-10", "2027-03-12", "Mar 10–12, 2027"],
    ["2027-03-30", "2027-04-02", "Mar 30 – Apr 2, 2027"],
  ])("%s a %s → %s", (checkIn, checkOut, expected) => {
    expect(formatDateRange(checkIn, checkOut, today, "en-US")).toBe(expected);
  });
});
