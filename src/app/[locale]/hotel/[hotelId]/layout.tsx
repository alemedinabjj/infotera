import type { ReactNode } from "react";

/**
 * `/hotel/[hotelId]` e filhos. O slot `@modal` recebe a galeria interceptada (`(.)photos/[photo]`):
 * por navegação interna a foto abre como modal sobre a página; num reload ou link direto, a rota
 * `photos/[photo]` renderiza a página cheia.
 */
const HotelLayout = ({ children, modal }: { children: ReactNode; modal: ReactNode }) => (
  <>
    {children}
    {modal}
  </>
);

export default HotelLayout;
