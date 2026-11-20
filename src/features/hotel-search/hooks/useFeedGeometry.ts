"use client";

import { type RefObject, useEffect, useState } from "react";

type FeedGeometry = {
  /** Topo do feed no documento (px): a lista não começa no topo da página. */
  scrollMargin: number;
  /** `scroll-padding-top` do `<html>` (o header fixo). */
  scrollPaddingStart: number;
};

const sameGeometry = (a: FeedGeometry, b: FeedGeometry): boolean =>
  a.scrollMargin === b.scrollMargin && a.scrollPaddingStart === b.scrollPaddingStart;

const measure = (feed: HTMLElement): FeedGeometry => {
  const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);
  return {
    scrollMargin: Math.round(feed.getBoundingClientRect().top + window.scrollY),
    scrollPaddingStart: Number.isNaN(padding) ? 0 : padding,
  };
};

/**
 * Mede onde o feed começa no documento e o espaço do header fixo. Alertas e o painel "Alterar
 * busca" mudam o topo da lista sem mexer nela: o `body` é observado e a medida refeita.
 */
export const useFeedGeometry = (feedRef: RefObject<HTMLElement | null>): FeedGeometry => {
  const [geometry, setGeometry] = useState<FeedGeometry>({
    scrollMargin: 0,
    scrollPaddingStart: 0,
  });

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    const update = () => {
      const next = measure(feed);
      setGeometry((current) => (sameGeometry(current, next) ? current : next));
    };
    update();
    window.addEventListener("resize", update);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(document.body);
    return () => {
      window.removeEventListener("resize", update);
      observer?.disconnect();
    };
  }, [feedRef]);

  return geometry;
};
