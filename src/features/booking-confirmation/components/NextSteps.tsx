import type { Locale } from "@/shared/i18n/config";
import { confirmationMessages } from "../i18n/messages";
import { ReceiptSection } from "./ReceiptSection";

/** O que fazer agora; a privacidade do link entra como orientação, não como rodapé. */
export const NextSteps = ({ locale }: { locale: Locale }) => {
  const t = confirmationMessages.get(locale).nextSteps;
  return (
    <ReceiptSection titleId="proximos-passos-titulo" title={t.title}>
      <ol className="flex max-w-prose list-decimal flex-col gap-2 pl-5 text-base text-fg">
        {t.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </ReceiptSection>
  );
};
