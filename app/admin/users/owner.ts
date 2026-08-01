/** The single account allowed to see and manage the control panel. */
export function ownerEmail(): string {
  return (process.env.OWNER_EMAIL ?? "ticozveibel@hotmail.com").toLowerCase();
}
