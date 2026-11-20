import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Activity, type ReactNode, useState } from "react";
import { type Control, useController, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import type { CheckoutValues } from "../model/checkout.schema";
import { usePaymentWipe } from "./usePaymentWipe";

type Mode = "visible" | "hidden";

const PaymentFields = () => {
  const form = useForm<CheckoutValues>();
  usePaymentWipe(form, () => undefined);
  return (
    <>
      <input aria-label="Número do cartão" {...form.register("payment.cardNumber")} />
      <input aria-label="Validade" {...form.register("payment.expiry")} />
      <input aria-label="CVV" {...form.register("payment.cvv")} />
      <input aria-label="E-mail" {...form.register("contact.email")} />
    </>
  );
};

/** Igual ao `TextField` real: `useController` + `value={field.value}` (controlado). */
const ControlledCard = ({ control }: { control: Control<CheckoutValues> }) => {
  const { field } = useController({ control, name: "payment.cardNumber" });
  return (
    <input
      aria-label="Número do cartão"
      ref={field.ref}
      name={field.name}
      value={field.value}
      onChange={(event) => field.onChange(event.target.value)}
    />
  );
};

const ControlledPayment = () => {
  const form = useForm<CheckoutValues>({
    defaultValues: { payment: { cardNumber: "" } },
  });
  usePaymentWipe(form, () => undefined);
  return <ControlledCard control={form.control} />;
};

const HostWith = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<Mode>("visible");
  return (
    <>
      <button type="button" onClick={() => setMode("hidden")}>
        esconder
      </button>
      <Activity mode={mode}>{children}</Activity>
    </>
  );
};

const RestoreProbe = ({ onRestored }: { onRestored: () => void }) => {
  const form = useForm<CheckoutValues>();
  usePaymentWipe(form, onRestored);
  return null;
};

const Host = () => {
  const [mode, setMode] = useState<Mode>("visible");
  return (
    <>
      <button
        type="button"
        onClick={() => setMode((m) => (m === "visible" ? "hidden" : "visible"))}
      >
        alternar
      </button>
      <Activity mode={mode}>
        <PaymentFields />
      </Activity>
    </>
  );
};

describe("usePaymentWipe dentro de Activity (F7c, critério 22)", () => {
  it("zera cartão, validade e CVV ao esconder a rota e mantém o resto", async () => {
    const user = userEvent.setup();
    render(<Host />);
    await user.type(screen.getByLabelText("Número do cartão"), "4111111111111111");
    await user.type(screen.getByLabelText("Validade"), "1230");
    await user.type(screen.getByLabelText("CVV"), "123");
    await user.type(screen.getByLabelText("E-mail"), "ana@exemplo.com");

    await user.click(screen.getByRole("button", { name: "alternar" }));
    await user.click(screen.getByRole("button", { name: "alternar" }));

    expect(screen.getByLabelText("Número do cartão")).toHaveValue("");
    expect(screen.getByLabelText("Validade")).toHaveValue("");
    expect(screen.getByLabelText("CVV")).toHaveValue("");
    expect(screen.getByLabelText("E-mail")).toHaveValue("ana@exemplo.com");
  });

  it("com a rota ainda escondida, o `value` do DOM do campo controlado já é vazio", async () => {
    const user = userEvent.setup();
    render(
      <HostWith>
        <ControlledPayment />
      </HostWith>,
    );
    await user.type(screen.getByLabelText("Número do cartão"), "4111111111111111");
    expect(screen.getByLabelText("Número do cartão")).toHaveValue("4111111111111111");

    await user.click(screen.getByRole("button", { name: "esconder" }));

    const hidden = screen.getByLabelText("Número do cartão");
    expect(hidden).not.toBeVisible();
    expect(hidden).toHaveValue("");
  });

  it("não dispara o aviso de restauração do bfcache ao esconder", () => {
    const onRestored = vi.fn();
    const { unmount } = render(<RestoreProbe onRestored={onRestored} />);
    unmount();
    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
    expect(onRestored).not.toHaveBeenCalled();
  });
});
