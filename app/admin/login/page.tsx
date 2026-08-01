import LoginForm from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-2xl border border-black/5 bg-surface p-8 shadow-sm">
        <h1 className="mb-6 text-center text-xl font-semibold text-primary">
          כניסה לפאנל הניהול
        </h1>
        <LoginForm callbackUrl={callbackUrl ?? "/admin/rtm"} />
      </div>
    </div>
  );
}
