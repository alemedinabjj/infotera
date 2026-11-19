"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type FallbackProps = { error: unknown; reset: () => void };

type ErrorBoundaryProps = {
  children: ReactNode;
  /** Renderizado no lugar dos filhos depois de um erro de renderização. */
  fallback: (props: FallbackProps) => ReactNode;
  /** Chamado por `reset` antes de remontar os filhos (ex.: resetar queries). */
  onReset?: () => void;
  /** Quando qualquer item muda (comparação `Object.is`), a boundary sai do erro sozinha. */
  resetKeys?: readonly unknown[];
  onError?: (error: unknown, info: ErrorInfo) => void;
};

type ErrorBoundaryState = { failed: boolean; error: unknown };

const INITIAL_STATE: ErrorBoundaryState = { failed: false, error: null };

const keysChanged = (previous: readonly unknown[] = [], next: readonly unknown[] = []): boolean =>
  previous.length !== next.length || previous.some((item, index) => !Object.is(item, next[index]));

/**
 * Error boundary de renderização (React não tem hook para isso, por isso é classe). Só captura
 * erros de render/lifecycle dos filhos; erros de request ficam no `useQuery`.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = INITIAL_STATE;

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { failed: true, error };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  override componentDidUpdate(previous: ErrorBoundaryProps): void {
    if (this.state.failed && keysChanged(previous.resetKeys, this.props.resetKeys)) {
      this.setState(INITIAL_STATE);
    }
  }

  reset = (): void => {
    this.props.onReset?.();
    this.setState(INITIAL_STATE);
  };

  override render(): ReactNode {
    if (this.state.failed)
      return this.props.fallback({ error: this.state.error, reset: this.reset });
    return this.props.children;
  }
}
