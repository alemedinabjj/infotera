import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { AlertCircleIcon, CheckCircleIcon, InfoIcon } from "../icons";

type AlertTone = "info" | "success" | "warning" | "danger";

const TONES: Record<AlertTone, { box: string; title: string }> = {
  info: { box: "border-info bg-info-soft", title: "text-info" },
  success: { box: "border-success bg-success-soft", title: "text-success" },
  warning: { box: "border-warning bg-warning-soft", title: "text-warning" },
  danger: { box: "border-danger bg-danger-soft", title: "text-danger" },
};

const ToneIcon = ({ tone }: { tone: AlertTone }) => {
  switch (tone) {
    case "success":
      return <CheckCircleIcon className="mt-0.5 size-5 shrink-0" />;
    case "info":
      return <InfoIcon className="mt-0.5 size-5 shrink-0" />;
    case "warning":
    case "danger":
      return <AlertCircleIcon className="mt-0.5 size-5 shrink-0" />;
    default: {
      const unreachable: never = tone;
      return unreachable;
    }
  }
};

type AlertProps = {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/** Mensagem inline. `danger` usa `role="alert"`; os demais `role="status"`. */
export const Alert = ({ tone = "info", title, children, action, className }: AlertProps) => (
  <div
    role={tone === "danger" ? "alert" : "status"}
    className={cn("flex gap-3 rounded-card border p-4", TONES[tone].box, className)}
  >
    <span className={TONES[tone].title}>
      <ToneIcon tone={tone} />
    </span>
    <div className="flex min-w-0 flex-1 flex-col gap-2 text-sm text-fg">
      {title ? <p className={cn("font-semibold", TONES[tone].title)}>{title}</p> : null}
      {children ? <div>{children}</div> : null}
      {action}
    </div>
  </div>
);
