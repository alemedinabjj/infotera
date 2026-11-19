import { useEffect, useState } from "react";

type Seen = { key: string; count: number };

/**
 * Quantos itens do feed já foram montados (maior índice + 1). Itens com índice menor que isso, ao
 * serem remontados pela virtualização ao rolar de volta, não animam de novo. Reinicia quando a
 * `key` (consulta) muda. Atualiza no efeito: os itens do render atual ainda animam.
 */
export const useSeenCount = (key: string, items: readonly { index: number }[]): number => {
  const [seen, setSeen] = useState<Seen>({ key, count: 0 });
  const highest = items.reduce((max, item) => Math.max(max, item.index + 1), 0);

  useEffect(() => {
    setSeen((previous) => ({
      key,
      count: previous.key === key ? Math.max(previous.count, highest) : highest,
    }));
  }, [key, highest]);

  return seen.key === key ? seen.count : 0;
};
