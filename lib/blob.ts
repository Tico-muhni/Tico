import { put } from "@vercel/blob";

export async function uploadDraftImage(file: File): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not set. Add it to your environment (see SETUP.md)."
    );
  }
  const ext = file.name.split(".").pop() || "jpg";
  const pathname = `draft-images/${crypto.randomUUID()}.${ext}`;
  const blob = await put(pathname, file, {
    access: "public",
    token,
  });
  return blob.url;
}
