/** `Corrija 1 campo para continuar` / `Corrija N campos para continuar`. */
export const describeErrorCount = (count: number): string =>
  `Corrija ${count} ${count === 1 ? "campo" : "campos"} para continuar`;
