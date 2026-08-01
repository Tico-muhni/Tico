import RegisterForm from "./register-form";

export default function RegisterPage() {
  const requireCode = !!process.env.REGISTRATION_CODE;

  return (
    <div
      className="flex flex-1 items-center justify-center p-4"
      style={{ backgroundColor: "#EDF6F0" }}
    >
      <div className="w-full max-w-sm rounded-2xl border bg-white p-8 shadow-sm" style={{ borderColor: "#D5E5DC" }}>
        <h1 className="mb-1 text-center text-xl font-extrabold" style={{ color: "#2E8B57" }}>
          הרשמה ל-Tico RTM
        </h1>
        <p className="mb-6 text-center text-xs text-foreground/60">
          כלי יומי שסורק חדשות משכנתאות/נדל&quot;ן ומכין בריפים לסרטונים.
        </p>
        <RegisterForm requireCode={requireCode} />
      </div>
    </div>
  );
}
