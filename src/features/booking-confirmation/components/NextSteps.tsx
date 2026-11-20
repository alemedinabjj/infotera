import { ReceiptSection } from "./ReceiptSection";

const STEPS = [
  "Guarde o número da reserva. Ele também está no endereço desta página.",
  "No check-in, apresente um documento com foto de cada hóspede.",
  "Não compartilhe o link desta página: quem tiver o link vê os dados da reserva.",
  "Cancelar ou alterar a reserva não está disponível nesta demonstração.",
] as const;

/** O que fazer agora; a privacidade do link entra como orientação, não como rodapé. */
export const NextSteps = () => (
  <ReceiptSection titleId="proximos-passos-titulo" title="Próximos passos">
    <ol className="flex max-w-prose list-decimal flex-col gap-2 pl-5 text-base text-fg">
      {STEPS.map((step) => (
        <li key={step}>{step}</li>
      ))}
    </ol>
  </ReceiptSection>
);
