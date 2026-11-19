import type { Bed } from "../api/schemas";

const BED_LABELS: Record<Bed["type"], { one: string; many: string }> = {
  single: { one: "cama de solteiro", many: "camas de solteiro" },
  double: { one: "cama de casal", many: "camas de casal" },
  queen: { one: "cama queen", many: "camas queen" },
  king: { one: "cama king", many: "camas king" },
  twin: { one: "cama twin", many: "camas twin" },
  sofa_bed: { one: "sofá-cama", many: "sofás-camas" },
};

const bedText = ({ type, quantity }: Bed): string =>
  `${quantity} ${quantity === 1 ? BED_LABELS[type].one : BED_LABELS[type].many}`;

/** `1 cama king` · `1 cama king e 1 sofá-cama` · `1 cama king, 2 camas twin e 1 sofá-cama`. */
export const bedsLabel = (beds: readonly Bed[]): string => {
  const parts = beds.map(bedText);
  const last = parts.at(-1);
  if (last === undefined) return "";
  if (parts.length === 1) return last;
  return `${parts.slice(0, -1).join(", ")} e ${last}`;
};
