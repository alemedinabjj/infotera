import { notFound } from "next/navigation";

/**
 * Qualquer caminho desconhecido dentro do locale (`/en/xyz`) cai aqui e vira o 404 do idioma
 * (`not-found.tsx` do segmento), com o layout, o cabeçalho e o `<html lang>` certos.
 */
const UnknownPathPage = () => notFound();

export default UnknownPathPage;
