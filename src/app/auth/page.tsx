import { RoleAuthForm } from "@/features/auth/role-auth-form";
import { Navbar } from "@/components/layout/navbar";

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-[#ededed] p-3 sm:p-4">
      <div className="min-h-[calc(100vh-24px)] rounded-2xl bg-[#f5f2ee] sm:min-h-[calc(100vh-32px)] sm:rounded-3xl">
        <Navbar />
        <main className="flex justify-center px-4 py-12 sm:py-20">
          <RoleAuthForm />
        </main>
      </div>
    </div>
  );
}