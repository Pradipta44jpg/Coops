"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AuthForm({ nextPath = "/dashboard" }: { nextPath?: string }) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [intent, setIntent] = useState<"customer" | "worker">("customer");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setPending(true);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Connect Supabase in .env.local before using authentication.");
      setPending(false);
      return;
    }

    const result = mode === "sign-in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, account_intent: intent } } });

    if (result.error) {
      setMessage(result.error.message);
    } else if (mode === "sign-up") {
      setMessage("Account created. Check your email if confirmation is enabled, then sign in.");
      setMode("sign-in");
    } else {
      const { data: user } = await supabase.auth.getUser();
      if (user?.user) {
        const { data: roles } = await supabase.from("profile_roles").select("role").eq("profile_id", user.user.id);
        const roleList = roles?.map((r) => r.role) ?? [];

        // Admin users go straight to analytics
        if (roleList.includes("platform_admin") || roleList.includes("cooperative_admin")) {
          window.location.assign("/analytics");
          return;
        }

        if (roleList.includes("worker")) {
          const { data: worker } = await supabase.from("workers").select("id").eq("profile_id", user.user.id).maybeSingle();
          if (!worker) {
            window.location.assign("/onboarding/worker");
            return;
          }
        }
      }
      window.location.assign(intent === "worker" ? "/onboarding/worker" : nextPath.startsWith("/") ? nextPath : "/dashboard");
    }

    setPending(false);
  }

  return (
    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-sm sm:p-8">
      <div className="flex gap-5 border-b border-neutral-200 text-sm">
        <button type="button" onClick={() => setMode("sign-in")} className={`border-b-2 pb-3 ${mode === "sign-in" ? "border-[#ef4d23] text-neutral-900" : "border-transparent text-neutral-400"}`}>Sign in</button>
        <button type="button" onClick={() => setMode("sign-up")} className={`border-b-2 pb-3 ${mode === "sign-up" ? "border-[#ef4d23] text-neutral-900" : "border-transparent text-neutral-400"}`}>Create account</button>
      </div>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "sign-up" ? <label className="block text-sm text-neutral-700">Full name<input required value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-neutral-200 px-3 outline-none focus:border-[#ef4d23]" /></label> : null}
        <fieldset className="rounded-xl bg-[#f5f2ee] p-1"><legend className="sr-only">Account type</legend><div className="grid grid-cols-2 gap-1"><button type="button" onClick={() => setIntent("customer")} className={`rounded-lg px-3 py-2 text-xs ${intent === "customer" ? "bg-white font-medium text-neutral-900 shadow-sm" : "text-neutral-500"}`}>I need a service</button><button type="button" onClick={() => setIntent("worker")} className={`rounded-lg px-3 py-2 text-xs ${intent === "worker" ? "bg-white font-medium text-neutral-900 shadow-sm" : "text-neutral-500"}`}>I provide services</button></div></fieldset>
        <label className="block text-sm text-neutral-700">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-neutral-200 px-3 outline-none focus:border-[#ef4d23]" /></label>
        <label className="block text-sm text-neutral-700">Password<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-neutral-200 px-3 outline-none focus:border-[#ef4d23]" /></label>
        {message ? <p role="status" className="rounded-xl bg-[#f5f2ee] px-3 py-2 text-sm text-neutral-600">{message}</p> : null}
        <button disabled={pending} type="submit" className="w-full rounded-xl bg-[#0b0f1a] px-4 py-3 text-sm font-medium text-white disabled:opacity-60">{pending ? "Working..." : mode === "sign-in" ? "Sign in" : "Create account"}</button>
      </form>
      <Link href="/" className="mt-5 block text-center text-xs text-neutral-500 underline underline-offset-4">Back to Coops</Link>
    </div>
  );
}
