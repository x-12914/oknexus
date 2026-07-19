import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/");
  return (
    <div className="h-full overflow-y-auto">
      <AdminDashboard />
    </div>
  );
}
