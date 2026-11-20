export type GuestKind = "adult" | "child";

export type CompanionValues = {
  kind: GuestKind;
  firstName: string;
  lastName: string;
  /** `""` (adulto ou não escolhida) ou `"0"`–`"17"` (valor do `Select`). */
  age: string;
};

type GuestCounts = { adults: number; children: number };

const emptyCompanion = (kind: GuestKind): CompanionValues => ({
  kind,
  firstName: "",
  lastName: "",
  age: "",
});

/**
 * Acompanhantes do titular: `adultos − 1` adultos e depois as crianças. Preserva o que já foi
 * digitado por posição **dentro de cada tipo** (mudar a contagem não embaralha os nomes).
 */
export const buildCompanions = (
  { adults, children }: GuestCounts,
  previous: readonly CompanionValues[],
): CompanionValues[] => {
  const byKind = (kind: GuestKind, count: number): CompanionValues[] => {
    const typed = previous.filter((companion) => companion.kind === kind);
    return Array.from(
      { length: Math.max(count, 0) },
      (_, index) => typed[index] ?? emptyCompanion(kind),
    );
  };
  return [...byKind("adult", adults - 1), ...byKind("child", children)];
};

/** `Hóspede 2 · adulto` (o titular é o hóspede 1; `index` é a posição em `companions`). */
export const companionLabel = (index: number, kind: GuestKind): string =>
  `Hóspede ${index + 2} · ${kind === "adult" ? "adulto" : "criança"}`;

/** `Menos de 1 ano`, `1 ano`, `7 anos`. */
export const ageLabel = (age: number): string => {
  if (age === 0) return "Menos de 1 ano";
  return age === 1 ? "1 ano" : `${age} anos`;
};

export const AGE_OPTIONS: readonly number[] = Array.from({ length: 18 }, (_, age) => age);
