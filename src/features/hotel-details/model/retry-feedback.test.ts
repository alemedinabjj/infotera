import { describe, expect, it } from "vitest";
import { IDLE_RETRY, trackRetry } from "./retry-feedback";

describe("trackRetry", () => {
  it("começa sem nada a anunciar", () => {
    expect(IDLE_RETRY).toEqual({ retrying: false, stillFailing: false });
  });

  it("tentando: não anuncia (o botão já mostra 'Tentando…')", () => {
    expect(trackRetry(IDLE_RETRY, true)).toEqual({ retrying: true, stillFailing: false });
  });

  it("tentou e continua no erro: anuncia 'ainda não foi possível'", () => {
    const trying = trackRetry(IDLE_RETRY, true);
    expect(trackRetry(trying, false)).toEqual({ retrying: false, stillFailing: true });
  });

  it("nova tentativa limpa o aviso anterior", () => {
    const failed = { retrying: false, stillFailing: true };
    expect(trackRetry(failed, true)).toEqual({ retrying: true, stillFailing: false });
  });

  it("sem mudança devolve o mesmo estado (nada a re-renderizar)", () => {
    const failed = { retrying: false, stillFailing: true };
    expect(trackRetry(failed, false)).toBe(failed);
  });
});
