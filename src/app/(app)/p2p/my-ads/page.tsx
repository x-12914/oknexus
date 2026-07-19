import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MyAdsList } from "@/components/p2p/MyAdsList";

export default async function MyAdsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (
    <div className="h-full overflow-y-auto">
      <MyAdsList />
    </div>
  );
}
