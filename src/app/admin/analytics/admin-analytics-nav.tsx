import Link from "next/link";
import type { Route } from "next";
import { BarChart2, Brain } from "lucide-react";

const tabs = [
  { href: "/admin/analytics",        label: "Analytics & Reports", icon: BarChart2 },
  { href: "/admin/analytics/ai-forecasting", label: "AI Demand Forecasting", icon: Brain },
] as const;

export function AdminAnalyticsNav({ active }: { active: "/admin/analytics" | "/admin/analytics/ai-forecasting" }) {
  return (
    <div className="flex items-center gap-1 rounded-2xl border border-[var(--line)] bg-white p-1 shadow-sm w-fit mb-6">
      {tabs.map(({ href, label, icon: Icon }) => {
        const isActive = active === href;
        return (
          <Link
            key={href}
            href={href as Route}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-[#0b0f1a] text-white shadow-sm"
                : "text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            <Icon size={15} className={isActive ? "text-[#ef4d23]" : "text-neutral-400"} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
