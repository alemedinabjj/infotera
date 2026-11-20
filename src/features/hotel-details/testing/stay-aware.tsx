import type { ReactNode } from "react";
import type { SearchCriteria } from "@/shared/lib/search-params";

let current: SearchCriteria | null = null;

/** Define os critérios que o `StayAware` falso entrega (o real é um RSC assíncrono, fora do alcance do RTL). */
export const setStayCriteria = (criteria: SearchCriteria | null): void => {
  current = criteria;
};

/** Para `vi.mock("./StayAware", ...)`: resolve na hora, com os critérios de `setStayCriteria`. */
export const stayAwareMock = {
  StayAware: ({ children }: { children: (criteria: SearchCriteria | null) => ReactNode }) =>
    children(current),
};
