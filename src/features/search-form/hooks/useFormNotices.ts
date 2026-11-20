import { useEffect, useRef, useState } from "react";
import type { DateNotice } from "../model/notices";

/**
 * Avisos automáticos do formulário: o texto visível (`notice`, vira `description` do campo) e o
 * anunciador `aria-live`. O anúncio é limpo antes de definir, para repetir a frase ser lido de novo.
 */
export const useFormNotices = () => {
  const [notice, setNotice] = useState<DateNotice | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const announce = (text: string) => {
    clearTimeout(timer.current);
    setAnnouncement("");
    timer.current = setTimeout(() => setAnnouncement(text), 50);
  };

  return {
    notice,
    announcement,
    announce,
    showNotice: (next: DateNotice | null) => {
      setNotice(next);
      if (next) announce(next.text);
    },
  };
};
