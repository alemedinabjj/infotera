"use client";

import { PhotoModalError } from "@/features/hotel-details/client";

/** Erro do modal da foto (RSC 500, offline): cartão claro com "Tentar de novo" e "Fechar". */
const PhotoModalRouteError = ({ retry }: { error: unknown; retry: () => void }) => (
  <PhotoModalError retry={retry} />
);

export default PhotoModalRouteError;
