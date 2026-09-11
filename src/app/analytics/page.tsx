import { redirect } from "next/navigation";

/**
 * /analytics has moved to /admin/analytics.
 * This redirect handles any bookmarked or linked URLs.
 */
export default function AnalyticsRedirect() {
  redirect("/admin/analytics");
}
