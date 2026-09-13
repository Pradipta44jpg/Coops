import { Navbar } from "@/components/layout/navbar";
import { WorkerApplicationForm } from "@/features/auth/worker-application-form";
import { WorkerVerificationPoller } from "@/features/auth/worker-verification-poller";
import { requireUser } from "@/lib/auth/server";

export default async function WorkerOnboardingPage() {
  const session = await requireUser("/onboarding/worker");
  const { data: cooperatives } = await session.supabase!.from("cooperatives").select("id,name").eq("status", "verified").order("name");

  return (
    <div className="min-h-screen bg-[#ededed] p-3 sm:p-4">
      <div className="min-h-[calc(100vh-24px)] rounded-2xl bg-[#f5f2ee] sm:min-h-[calc(100vh-32px)] sm:rounded-3xl">
        <Navbar />
        {/* Silently polls every 5 s; redirects to /worker/dashboard once verified */}
        <WorkerVerificationPoller />
        <main className="mx-auto max-w-2xl px-4 py-12 sm:px-8 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ef4d23]">Worker onboarding</p>
          <h1 className="mt-3 text-4xl font-medium tracking-tight">Bring your skills to the network.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-600">Submit your details for cooperative review. Verification and worker access are granted by an authorized cooperative administrator.</p>
          <WorkerApplicationForm cooperatives={cooperatives ?? []} />
        </main>
      </div>
    </div>
  );
}
