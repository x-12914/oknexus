import { SideNav } from "@/components/nav/SideNav";
import { TopBar } from "@/components/nav/TopBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <SideNav />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
