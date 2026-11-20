"use client";

import { useLocale } from "../client";
import { commonMessages } from "./messages";

/** Dicionário comum no idioma da rota (componentes cliente). */
export const useCommonMessages = () => commonMessages.get(useLocale());
