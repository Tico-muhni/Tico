import { auth, signOut } from "@/lib/auth";
import Nav from "./nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Nav
        email={session?.user?.email}
        logout={async () => {
          "use server";
          await signOut({ redirectTo: "/admin/login" });
        }}
      />
      {/* Bottom padding keeps content clear of the mobile tab bar. */}
      <main className="flex-1 bg-background px-4 pb-24 pt-6 md:px-6 md:pb-8 md:pt-8">{children}</main>
    </div>
  );
}
