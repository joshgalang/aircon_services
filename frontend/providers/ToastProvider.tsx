"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { createPortal, flushSync } from "react-dom";
import { IconBtnCheck, IconBtnXMark } from "@/components/ui/ButtonIcons";

type ToastKind = "success" | "error";

type ToastItem = {
  id: number;
  kind: ToastKind;
  message: string;
};

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

/** Auto-dismiss; user can close sooner with the × button */
const ERROR_TOAST_MS = 3200;
const SUCCESS_TOAST_MS = 2800;

function ToastView({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: () => void;
}) {
  const isOk = item.kind === "success";
  return (
    <div
      role={isOk ? "status" : "alert"}
      className={`animate-toast-in pointer-events-auto flex w-[min(100vw-2rem,26rem)] items-start gap-3 rounded-xl border-2 px-5 py-4 shadow-2xl ring-1 ring-black/5 ${
        isOk
          ? "border-emerald-300 bg-emerald-50 text-emerald-950"
          : "border-red-300 bg-red-50 text-red-950"
      }`}
    >
      <span
        className={`mt-0.5 shrink-0 rounded-full p-1 ${
          isOk ? "bg-emerald-200 text-emerald-900" : "bg-red-200 text-red-900"
        }`}
        aria-hidden
      >
        {isOk ? (
          <IconBtnCheck className="h-5 w-5" />
        ) : (
          <span className="flex h-5 w-5 items-center justify-center text-sm font-bold">
            !
          </span>
        )}
      </span>
      <p className="min-w-0 flex-1 text-base font-medium leading-snug">
        {item.message}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        title="Dismiss"
        className="-m-1 shrink-0 rounded-lg p-2 text-current opacity-70 hover:bg-black/10 hover:opacity-100 active:bg-black/[0.14]"
        aria-label="Dismiss notification"
      >
        <IconBtnXMark className="h-5 w-5" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const trimmed = message.trim();
      if (!trimmed) return;
      const id = Date.now() + Math.random();
      const duration = kind === "success" ? SUCCESS_TOAST_MS : ERROR_TOAST_MS;
      flushSync(() => {
        setItems((list) => [...list, { id, kind, message: trimmed }]);
      });
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const success = useCallback(
    (message: string) => push("success", message),
    [push]
  );
  const error = useCallback(
    (message: string) => push("error", message),
    [push]
  );

  const stack = (
    <div
      className="pointer-events-none fixed right-3 top-3 z-[10050] flex max-h-[80vh] w-[min(100vw-1.5rem,26rem)] flex-col items-end gap-2 overflow-y-auto pl-2 sm:right-5 sm:top-5"
      aria-live="polite"
      aria-relevant="additions"
    >
      {items.map((t) => (
        <ToastView key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );

  return (
    <ToastContext.Provider value={{ success, error }}>
      {children}
      {mounted ? createPortal(stack, document.body) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
