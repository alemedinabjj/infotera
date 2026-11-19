import { describe, expect, it } from "vitest";
import { queryKeys } from "./query-keys";

describe("queryKeys.hotels.infinite", () => {
  const params = { destination: "Rio de Janeiro, RJ", _sort: "id" };

  it("usa o prefixo hotels/infinite e carrega os params", () => {
    expect(queryKeys.hotels.infinite(params)).toEqual(["hotels", "infinite", params]);
  });

  it("não colide com a lista paginada e continua sob o prefixo geral", () => {
    expect(queryKeys.hotels.infinite(params)).not.toEqual(queryKeys.hotels.list(params));
    expect(queryKeys.hotels.infinite(params)[0]).toBe(queryKeys.hotels.all[0]);
  });
});
