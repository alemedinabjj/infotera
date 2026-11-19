const CPF_LENGTH = 11;

/** Só os dígitos, no máximo 11 (excesso descartado). */
export const cpfDigits = (value: string): string => value.replace(/\D/g, "").slice(0, CPF_LENGTH);

const checkDigit = (digits: number[], length: number): number => {
  const sum = digits
    .slice(0, length)
    .reduce((acc, digit, index) => acc + digit * (length + 1 - index), 0);
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
};

/** CPF com os dois dígitos verificadores (módulo 11); rejeita 11 dígitos repetidos. */
export const isValidCpf = (value: string): boolean => {
  const raw = value.replace(/\D/g, "");
  if (raw.length !== CPF_LENGTH || /^(\d)\1{10}$/.test(raw)) return false;
  const digits = [...raw].map(Number);
  return checkDigit(digits, 9) === digits[9] && checkDigit(digits, 10) === digits[10];
};

/** `52998224725` → `529.982.247-25` (parcial enquanto digita). */
export const formatCpf = (value: string): string => {
  const d = cpfDigits(value);
  const parts = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean);
  const head = parts.join(".");
  return d.length > 9 ? `${head}-${d.slice(9)}` : head;
};

/** Revisão: `***.982.247-**` (só os dígitos do meio). */
export const maskCpf = (value: string): string => {
  const d = cpfDigits(value);
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
};
