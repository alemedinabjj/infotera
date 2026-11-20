/**
 * Segunda entrada pública, **só com o que é seguro no bundle do cliente** (um `error.tsx` não pode
 * importar o `index.ts`: ele leva as funções `"use cache"` e o loader do build junto).
 */
export { PhotoModalError } from "./components/PhotoModalError";
export { PhotoModalLoading } from "./components/PhotoModalLoading";
export { PhotoNotFound } from "./components/PhotoNotFound";
