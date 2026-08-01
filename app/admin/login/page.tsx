import Link from "next/link";
import LoginForm from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div
      className="flex flex-1 items-center justify-center p-4"
      style={{ backgroundColor: "#EDF6F0" }}
    >
      <div className="w-full max-w-sm rounded-2xl border bg-white p-8 shadow-sm" style={{ borderColor: "#D5E5DC" }}>
        <h1 className="mb-6 text-center text-xl font-extrabold" style={{ color: "#2E8B57" }}>
          כניסה ל-Tico RTM
        </h1>
        <LoginForm callbackUrl={callbackUrl ?? "/admin/rtm"} />
        <p className="mt-4 text-center text-xs text-foreground/60">
          עדיין אין לך חשבון?{" "}
          <Link href="/register" className="font-semibold underline" style={{ color: "#2E8B57" }}>
            הרשמה
          </Link>
        </p>
      </div>
    </div>
  );
}
