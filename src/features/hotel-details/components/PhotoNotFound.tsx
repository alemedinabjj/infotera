"use client";

import { useParams } from "next/navigation";
import { useLocale } from "@/shared/i18n/client";
import { parseHotelId } from "../model/hotel-id";
import { PhotoNotFoundView } from "./PhotoNotFoundView";

/**
 * Versão cliente do "Foto não encontrada" para o `not-found.tsx` (que não recebe `params`: o id do hotel
 * vem de `useParams`). A página renderiza `PhotoNotFoundView` direto, no servidor.
 */
export const PhotoNotFound = () => {
  const locale = useLocale();
  const params = useParams<{ hotelId?: string }>();
  return <PhotoNotFoundView locale={locale} hotelId={parseHotelId(params.hotelId ?? "")} />;
};
