import { describe, expect, it } from "vitest";
import { parseBookingId } from "./booking-id";

const ID = "3f2a9c1e-7b4d-4e8a-9f12-6c0d3b2a1e57";

describe("parseBookingId", () => {
  it.each([
    ["v4 válido", ID, ID],
    ["maiúsculas viram minúsculas", ID.toUpperCase(), ID],
    ["espaços nas pontas", `  ${ID} `, ID],
    ["espaço codificado", `%20${ID}%20`, ID],
    ["id percent-encoded", ID.replaceAll("-", "%2D"), ID],
    ["id curto do json-server", "L-nHVI_", "L-nHVI_"],
    ["id curto preserva a caixa", " aB3dE9x ", "aB3dE9x"],
  ])("aceita: %s", (_name, raw, expected) => {
    expect(parseBookingId(raw)).toBe(expected);
  });

  it.each([
    ["UUID v1", "00000000-0000-1000-8000-000000000000"],
    ["v4 com variante inválida", "3f2a9c1e-7b4d-4e8a-1f12-6c0d3b2a1e57"],
    ["numérico", "1"],
    ["numérico longo", "1234567"],
    ["curto demais", "ab12"],
    ["longo demais", "a".repeat(37)],
    ["id curto com ponto", "ab.cdef"],
    ["texto", "abc"],
    ["path traversal", "../hotels/1"],
    ["path traversal codificado", "%2e%2e"],
    ["%2e%2e%2fhotels%2f1", "%2e%2e%2fhotels%2f1"],
    ["% sozinho", "%"],
    ["% malformado", "%E0%A4%A"],
    ["vazio", ""],
    ["só espaços", "   "],
    ["UUID com sufixo", `${ID}/extra`],
    ["UUID com query", `${ID}?x=1`],
    ["UUID sem hífens", ID.replaceAll("-", "")],
  ])("rejeita: %s", (_name, raw) => {
    expect(parseBookingId(raw)).toBeNull();
  });
});
