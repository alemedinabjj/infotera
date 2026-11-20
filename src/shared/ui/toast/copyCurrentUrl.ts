import { commonMessages } from "../../i18n/common/messages";
import type { Locale } from "../../i18n/config";
import { copyText } from "../../lib/clipboard";
import { toast } from "./toast-store";

/** Grava a URL atual (com filtros e página) na área de transferência e avisa por toast. */
export const copyCurrentUrl = async (locale: Locale): Promise<void> => {
  const t = commonMessages.get(locale).ui;
  if (await copyText(window.location.href)) {
    toast.success(t.linkCopied);
  } else {
    toast.error(t.copyFailed);
  }
};
