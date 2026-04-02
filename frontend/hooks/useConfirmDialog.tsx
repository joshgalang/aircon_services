"use client";

import { useCallback, useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

export function useConfirmDialog(): [
  ReactNode,
  (opts: ConfirmOptions) => Promise<boolean>,
] {
  const [state, setState] = useState<
    | null
    | (ConfirmOptions & { resolve: (v: boolean) => void })
  >(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...opts, resolve });
    });
  }, []);

  const respond = useCallback((result: boolean) => {
    setState((cur) => {
      if (!cur) return null;
      const finish = cur.resolve;
      window.setTimeout(() => finish(result), 0);
      return null;
    });
  }, []);

  const node =
    state === null ? null : (
      <ConfirmDialog
        title={state.title}
        message={state.message}
        confirmLabel={state.confirmLabel}
        cancelLabel={state.cancelLabel}
        danger={state.danger}
        onConfirm={() => respond(true)}
        onCancel={() => respond(false)}
      />
    );

  return [node, confirm];
}
