import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/admin/drafts", label: "טיוטות לאישור" },
  { href: "/admin/subscribers", label: "רשימת תפוצה" },
  { href: "/admin/topics", label: "נושאים" },
  { href: "/admin/templates", label: "תבניות תמונה" },
  { href: "/admin/history", label: "היסטוריה" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-black/5 bg-surface px-6 py-4">
        <nav className="flex flex-wrap gap-4 text-sm font-medium text-primary">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-secondary">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {session?.user?.email && (
            <span className="text-sm text-foreground/60">{session.user.email}</span>
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin/login" });
            }}
          >
            <button type="submit" className="text-sm text-foreground/60 hover:text-button">
              התנתקות
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 bg-background px-6 py-8">{children}</main>
    </div>
  );
}
