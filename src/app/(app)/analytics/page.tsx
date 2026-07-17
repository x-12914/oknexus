import { redirect } from "next/navigation";
import { sessionUserId } from "@/lib/auth";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";

export default async function AnalyticsPage() {
  const userId = await sessionUserId();
  if (!userId) redirect("/login");
  return <AnalyticsView />;
}
