"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import LoginRegisterModal from "@/app/components/LoginRegisterModal";

type AuthModalContextValue = {
  openAuthModal: () => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function useAuthModal(): AuthModalContextValue {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used within AuthModalProvider");
  return ctx;
}

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openAuthModal = useCallback(() => setOpen(true), []);
  return (
    <AuthModalContext.Provider value={{ openAuthModal }}>
      {children}
      <LoginRegisterModal open={open} onClose={() => setOpen(false)} />
    </AuthModalContext.Provider>
  );
}
