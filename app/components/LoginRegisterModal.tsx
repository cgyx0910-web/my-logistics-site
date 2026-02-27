"use client";

import { useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { X } from "lucide-react";

type Tab = "login" | "register";

export default function LoginRegisterModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { signIn, signUp } = useAuth();
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setError("");
    setSuccess("");
    setEmail("");
    setPassword("");
    setFullName("");
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    if (tab === "login") {
      const { error: err } = await signIn(email, password);
      setSubmitting(false);
      if (err) setError(err);
      else handleClose();
    } else {
      const { error: err } = await signUp(email, password, fullName || undefined);
      setSubmitting(false);
      if (err) setError(err);
      else setSuccess("注册成功，请查收邮件确认（若需）或直接登录。");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="auth-modal-title"
        className="relative w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 id="auth-modal-title" className="text-lg font-semibold text-slate-800">
            {tab === "login" ? "登录" : "注册"}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => { setTab("login"); setError(""); setSuccess(""); }}
            className={`flex-1 px-4 py-3 text-sm font-medium transition ${tab === "login" ? "border-b-2 border-[#2563eb] text-[#2563eb]" : "text-slate-500 hover:text-slate-700"}`}
          >
            登录
          </button>
          <button
            type="button"
            onClick={() => { setTab("register"); setError(""); setSuccess(""); }}
            className={`flex-1 px-4 py-3 text-sm font-medium transition ${tab === "register" ? "border-b-2 border-[#2563eb] text-[#2563eb]" : "text-slate-500 hover:text-slate-700"}`}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {tab === "register" && (
            <div>
              <label htmlFor="auth-full-name" className="mb-1 block text-sm font-medium text-slate-700">
                昵称（选填）
              </label>
              <input
                id="auth-full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
                placeholder="您的昵称"
              />
            </div>
          )}
          <div>
            <label htmlFor="auth-email" className="mb-1 block text-sm font-medium text-slate-700">
              邮箱
            </label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label htmlFor="auth-password" className="mb-1 block text-sm font-medium text-slate-700">
              密码
            </label>
            <input
              id="auth-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-green-600" role="status">
              {success}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-[#2563eb] px-4 py-3 font-semibold text-white transition hover:bg-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 disabled:opacity-60"
          >
            {submitting ? "处理中…" : tab === "login" ? "登录" : "注册"}
          </button>
        </form>
      </div>
    </div>
  );
}
