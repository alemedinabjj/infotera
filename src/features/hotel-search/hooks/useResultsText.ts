"use client";

import {
  describeAnnouncement,
  describeToolbar,
  type ToolbarHeading,
  type ToolbarStatus,
} from "../model/results-view";
import type { ResultsModel } from "./results-model";
import { useFeedAnnouncement } from "./useFeedAnnouncement";

type ResultsText = {
  toolbar: { heading: ToolbarHeading; status: ToolbarStatus };
  /** Texto do `aria-live` (rolagem contínua: o anúncio do lote tem prioridade). */
  announcement: string;
};

/** Textos da toolbar e do anunciador para o modo ativo. */
export const useResultsText = (
  results: ResultsModel,
  page: number,
  destination: string,
): ResultsText => {
  const { view, slow, total, feed } = results;
  const feedAnnouncement = useFeedAnnouncement(feed, total);
  return {
    toolbar: describeToolbar({
      view,
      slow,
      total,
      listing: feed ? { mode: "infinite", loaded: feed.loaded } : { mode: "pages", page },
    }),
    // Durante o lote o botão já diz "Carregando mais hotéis…": o anunciador geral fica mudo.
    announcement:
      feed?.footer.kind === "loading-more"
        ? ""
        : feedAnnouncement || describeAnnouncement({ view, slow, total, destination }),
  };
};
