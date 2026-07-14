import { auth } from "@/lib/auth";
import { SideNav } from "@/components/nav/SideNav";
import { TopBar } from "@/components/nav/TopBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // App is browsable without an account; trading actions require sign-in
  // (enforced by the API routes + client redirect-on-401).
  const session = await auth();

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <SideNav />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          userEmail={session?.user?.email ?? undefined}
          isAdmin={session?.user?.role === "ADMIN"}
        />
        <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
