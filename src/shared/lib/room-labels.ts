import type { Bed } from "../api/schemas";
import { commonMessages } from "../i18n/common/messages";
import { DEFAULT_LOCALE, type Locale } from "../i18n/config";

const bedText = ({ type, quantity }: Bed, locale: Locale): string => {
  const label = commonMessages.get(locale).beds[type];
  return `${quantity} ${quantity === 1 ? label.one : label.many}`;
};

/** `1 cama king` · `1 cama king e 1 sofá-cama` · `1 king bed, 2 twin beds and 1 sofa bed`. */
export const bedsLabel = (beds: readonly Bed[], locale: Locale = DEFAULT_LOCALE): string => {
  const parts = beds.map((bed) => bedText(bed, locale));
  const last = parts.at(-1);
  if (last === undefined) return "";
  if (parts.length === 1) return last;
  return `${parts.slice(0, -1).join(", ")} ${commonMessages.get(locale).beds.and} ${last}`;
};
