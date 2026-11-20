import { describe, expect, it, vi } from "vitest";
import { AfterConnection } from "./RequestOnly";

const connection = vi.hoisted(() => vi.fn<() => Promise<void>>());
vi.mock("next/server", () => ({ connection }));

describe("RequestOnly", () => {
  it("só entrega o conteúdo depois de connection() resolver (nunca na casca)", async () => {
    let open: () => void = () => undefined;
    connection.mockReturnValue(
      new Promise<void>((resolve) => {
        open = resolve;
      }),
    );
    const content = <p>erro</p>;
    let delivered: unknown = null;
    const pending = AfterConnection({ children: content }).then((value) => {
      delivered = value;
    });
    await Promise.resolve();
    expect(connection).toHaveBeenCalledTimes(1);
    expect(delivered).toBeNull();
    open();
    await pending;
    expect(delivered).toBe(content);
  });
});
