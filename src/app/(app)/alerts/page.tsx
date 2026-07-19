import { redirect } from "next/navigation";
import { sessionUserId } from "@/lib/auth";
import { AlertsView } from "@/components/alerts/AlertsView";

export default async function AlertsPage() {
  const userId = await sessionUserId();
  if (!userId) redirect("/login");
  return <AlertsView />;
}
