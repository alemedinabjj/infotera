type StillFailingNoticeProps = {
  /** `true` depois de uma tentativa que falhou de novo. */
  show: boolean;
  message: string;
};

/**
 * Aviso só para leitor de tela (`role="status"`, educado): "Ainda não foi possível…". A região fica
 * **sempre montada** (o texto entra e sai): região que nasce já com texto nem sempre é anunciada.
 */
export const StillFailingNotice = ({ show, message }: StillFailingNoticeProps) => (
  <p role="status" className="sr-only">
    {show ? message : ""}
  </p>
);
