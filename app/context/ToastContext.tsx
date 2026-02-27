"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastType = "success" | "error";
type ToastState = { message: string; type: ToastType } | null;

const ToastContext = createContext<{
  toast: { success: (msg: string) => void; error: (msg: string) => void };
} | null>(null);

const DURATION = 3000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ToastState>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, type: ToastType) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState({ message, type });
    timerRef.current = setTimeout(() => {
      setState(null);
      timerRef.current = null;
    }, DURATION);
  }, []);

  const toast = useCallback(
    () => ({
      success: (msg: string) => show(msg, "success"),
      error: (msg: string) => show(msg, "error"),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={{ toast: toast() }}>
      {children}
      {state && (
        <div
          className="fixed left-1/2 top-6 z-[200] -translate-x-1/2 rounded-lg px-4 py-2 text-sm font-medium shadow-lg"
          style={{
            backgroundColor: state.type === "success" ? "#10b981" : "#ef4444",
            color: "#fff",
          }}
          role="alert"
        >
          {state.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { toast: { success: () => {}, error: () => {} } };
  return ctx;
}
