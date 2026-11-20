import { PhoneField } from "./PhoneField";
import { TextField } from "./TextField";

/** Hóspede 1: o titular da reserva (a confirmação vai para o e-mail dele). */
export const ContactFields = () => (
  <fieldset className="flex min-w-0 flex-col gap-4 md:gap-5">
    <legend className="mb-2 text-lg font-semibold text-fg">Hóspede 1 · titular da reserva</legend>
    <p className="-mt-1 text-sm text-fg-muted">A confirmação vai para este e-mail.</p>
    <div className="grid gap-4 sm:grid-cols-2 md:gap-5">
      <TextField
        name="contact.firstName"
        label="Nome"
        autoComplete="given-name"
        autoCapitalize="words"
      />
      <TextField
        name="contact.lastName"
        label="Sobrenome"
        autoComplete="family-name"
        autoCapitalize="words"
      />
    </div>
    <TextField
      name="contact.email"
      label="E-mail"
      type="email"
      inputMode="email"
      autoComplete="email"
      autoCapitalize="none"
    />
    <PhoneField />
  </fieldset>
);
