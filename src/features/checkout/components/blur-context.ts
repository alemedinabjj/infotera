"use client";

import { createContext, useContext } from "react";

/** Envolve o blur de cada campo: adiado enquanto um botão é pressionado (`useDeferredBlur`). */
export type DeferBlur = (run: () => void) => void;

const BlurContext = createContext<DeferBlur>((run) => run());

export const DeferBlurProvider = BlurContext.Provider;
export const useDeferBlur = (): DeferBlur => useContext(BlurContext);
