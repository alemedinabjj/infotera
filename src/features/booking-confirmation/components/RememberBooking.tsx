"use client";

import { useEffect } from "react";
import { recordBooking } from "@/shared/lib/booking-history";

/**
 * Guarda o id da reserva no histórico local (só o id e quando foi aberta) depois que a página
 * confirma que ela existe. Reload não duplica. Não renderiza nada.
 */
export const RememberBooking = ({ id }: { id: string }) => {
  useEffect(() => {
    recordBooking(id, new Date());
  }, [id]);
  return null;
};
