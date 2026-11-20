"use client";

import { useEffect, useRef, useState } from "react";
import { useOnline } from "@/shared/hooks/useOnline";
import {
  type ConnectivityView,
  connectivityView,
  RESTORED_VISIBLE_MS,
} from "../model/connectivity";

/** Aviso global de conexão: `offline` enquanto cair; `restored` por 4 s ao voltar; senão `hidden`. */
export const useConnectivityView = (): ConnectivityView => {
  const online = useOnline();
  const previous = useRef(online);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const next = connectivityView(previous.current, online);
    previous.current = online;
    if (next !== "restored") {
      setRestored(false);
      return;
    }
    setRestored(true);
    const timer = window.setTimeout(() => setRestored(false), RESTORED_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [online]);

  if (!online) return "offline";
  return restored ? "restored" : "hidden";
};
