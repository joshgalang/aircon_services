"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { isAxiosError } from "axios";
import { useAuth } from "@/providers/AuthProvider";
import { IconBtnArrowRightOnRectangle } from "@/components/ui/ButtonIcons";

type Form = { username: string; password: string };

function loginErrorMessage(err: unknown): string {
  if (!isAxiosError(err) || !err.response) {
    return "Could not reach the server. Is the API running?";
  }
  const { status, data } = err.response;
  if (status === 401 || status === 403) {
    return "Invalid username or password.";
  }
  if (typeof data === "string" && data.trim()) return data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (typeof d.message === "string") return d.message;
    if (typeof d.error === "string") return d.error;
  }
  if (status >= 500) {
    return "Server error (500). Check the API terminal and the Response tab in DevTools for details.";
  }
  return "Sign-in failed.";
}

export default function LoginPage() {
  const { login, user, ready } = useAuth();
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const { register, handleSubmit } = useForm<Form>();

  useEffect(() => {
    if (ready && user) router.replace("/dashboard");
  }, [ready, user, router]);

  const onSubmit = handleSubmit(async (values) => {
    setErr(null);
    try {
      await login(values.username, values.password);
      router.replace("/dashboard");
    } catch (e) {
      setErr(loginErrorMessage(e));
    }
  });

  return (
    <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">Staff login</h1>
      <p className="mt-1 text-sm text-slate-600">
        JWT includes <code className="rounded bg-slate-100 px-1">branch_id</code>{" "}
        for scoped data.
      </p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="text-sm font-medium text-slate-700">Username</label>
          <input
            autoComplete="username"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            {...register("username", { required: true })}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Password</label>
          <input
            type="password"
            autoComplete="current-password"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            {...register("password", { required: true })}
          />
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-900"
        >
          <IconBtnArrowRightOnRectangle className="h-4 w-4" />
          Sign in
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        <Link href="/" className="text-brand-600 hover:underline">
          ← Back to public form
        </Link>
      </p>
    </div>
  );
}
