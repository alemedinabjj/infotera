import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement>;

const Icon = ({ className = "size-5", ...props }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    className={className}
    {...props}
  />
);

export const SearchIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);
export const MapPinIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </Icon>
);
export const CalendarIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </Icon>
);
export const UserIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Icon>
);
export const BedIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 18V6M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5" />
    <circle cx="7" cy="11" r="1.5" />
  </Icon>
);
export const StarIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9L12 2.5Z" />
  </Icon>
);
export const ChevronLeftIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m15 18-6-6 6-6" />
  </Icon>
);
export const ChevronRightIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m9 18 6-6-6-6" />
  </Icon>
);
export const ChevronDownIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);
export const XIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Icon>
);
export const PlusIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
export const MinusIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 12h14" />
  </Icon>
);
export const CheckIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M20 6 9 17l-5-5" />
  </Icon>
);
export const AlertCircleIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4M12 16h.01" />
  </Icon>
);
export const InfoIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </Icon>
);
export const CheckCircleIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="m8 12 3 3 5-6" />
  </Icon>
);
export const WifiOffIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m2 2 20 20M8.5 16.4a5 5 0 0 1 7 0M2 8.8a15 15 0 0 1 4.2-2.6M10.7 5.1A15 15 0 0 1 22 8.8M5 12.9a10 10 0 0 1 5.2-2.8M19 12.9a10 10 0 0 0-2.4-1.9" />
    <path d="M12 20h.01" />
  </Icon>
);
export const FilterIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z" />
  </Icon>
);
export const LinkIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
  </Icon>
);
export const ArrowLeftIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </Icon>
);
export const BuildingIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="5" y="3" width="14" height="18" rx="1" />
    <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M3 21h18" />
  </Icon>
);
export const UmbrellaIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M22 12a10 10 0 0 0-20 0Z" />
    <path d="M12 12v8a2 2 0 0 0 4 0M12 2v1" />
  </Icon>
);
export const PalmTreeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 22V11" />
    <path d="M12 11c-3 0-6-2-7-5 3 0 6 1 7 5ZM12 11c3 0 6-2 7-5-3 0-6 1-7 5ZM12 11c-1-3-.5-6 0-8 1 2 1 5 0 8Z" />
  </Icon>
);
export const TreesIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0ZM7 16v6M13 19v3" />
    <path d="M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5" />
  </Icon>
);
export const HistoryIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5M12 7v5l4 2" />
  </Icon>
);
export const CreditCardIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20M6 15h4" />
  </Icon>
);
export const LockIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Icon>
);
export const TagIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
    <circle cx="7.5" cy="7.5" r="1" />
  </Icon>
);
export const CopyIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="8" y="8" width="14" height="14" rx="2" />
    <path d="M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2" />
  </Icon>
);

/** Coração (favoritos); `filled` preenche com a cor corrente. */
export const HeartIcon = ({ filled = false, ...props }: IconProps & { filled?: boolean }) => (
  <Icon {...props} fill={filled ? "currentColor" : "none"}>
    <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z" />
  </Icon>
);
/** Dois painéis lado a lado (comparar). */
export const CompareIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="4" width="7" height="16" rx="1.5" />
    <rect x="14" y="4" width="7" height="16" rx="1.5" />
  </Icon>
);
/** Mala (minhas reservas). */
export const SuitcaseIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" />
  </Icon>
);
