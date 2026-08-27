import { redirect } from "next/navigation";
import { sessionUserId } from "@/lib/auth";
import { ActivityCenter } from "@/components/orders/ActivityCenter";

export default async function OrdersPage() {
  const userId = await sessionUserId();
  if (!userId) redirect("/login");
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-5xl">
        <ActivityCenter />
      </div>
    </div>
  );
}
