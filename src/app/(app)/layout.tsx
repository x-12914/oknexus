import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SideNav } from "@/components/nav/SideNav";
import { TopBar } from "@/components/nav/TopBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <SideNav />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar userEmail={session.user.email ?? undefined} />
        <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
