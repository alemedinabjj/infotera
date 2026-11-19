"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

const loadMotionFeatures = () => import("./motion-features").then((mod) => mod.motionFeatures);

/**
 * `LazyMotion` com features assíncronas e modo `strict` (só `m.*`, nunca `motion.*`) e
 * `reducedMotion="user"`: respeita `prefers-reduced-motion` (desliga transform/layout).
 */
export const MotionProvider = ({ children }: { children: ReactNode }) => (
  <LazyMotion features={loadMotionFeatures} strict>
    <MotionConfig reducedMotion="user">{children}</MotionConfig>
  </LazyMotion>
);
