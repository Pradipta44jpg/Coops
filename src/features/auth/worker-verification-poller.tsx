"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

const POLL_INTERVAL_MS = 5_000;

/**
 * Silently polls the `workers` table every 5 s.
 * As soon as a verified worker row appears for the current user,
 * navigates them to /worker/dashboard.
 *
 * Renders nothing — drop it anywhere on the page.
 */
export function WorkerVerificationPoller() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const sb = getSupabaseBrowserClient();
    if (!sb) return;

    async function check() {
      const { data: auth } = await sb!.auth.getUser();
      if (!auth.user) return;

      const { data: worker } = await sb!
        .from("workers")
        .select("profile_id, verification_status")
        .eq("profile_id", auth.user.id)
        .eq("verification_status", "verified")
        .maybeSingle();

      if (worker) {
        // Worker has been verified — clear the poll and redirect
        if (timerRef.current) clearInterval(timerRef.current);
        router.replace("/worker/dashboard");
      }
    }

    // Run once immediately in case the user was already verified before landing here
    check();

    timerRef.current = setInterval(check, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [router]);

  return null;
}
