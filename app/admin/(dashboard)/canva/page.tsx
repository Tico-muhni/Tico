import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/auth";
import { canvaConfigured, isCanvaConnected } from "@/lib/canva";
import CanvaClient from "./canva-client";

export const metadata = { title: "תוכן מקנבה | Tico" };
// Exporting a design from Canva is asynchronous and can take a while.
export const maxDuration = 60;

export default async function CanvaPage({
  searchParams,
}: {
  searchParams: Promise<{ canva?: string; reason?: string }>;
}) {
  const userId = await currentUserId();
  if (!userId) redirect("/admin/login");
  const { canva, reason } = await searchParams;

  return (
    <CanvaClient
      configured={canvaConfigured()}
      connected={await isCanvaConnected(userId)}
      notice={canva === "connected" ? "connected" : canva === "error" ? (reason ?? "error") : null}
    />
  );
}
