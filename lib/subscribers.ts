import { randomBytes } from "crypto";

export function generateUnsubscribeToken() {
  return randomBytes(24).toString("hex");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string) {
  return EMAIL_RE.test(value.trim());
}
