import { put } from "@vercel/blob";

function requireBlobToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not set. Add it to your environment (see SETUP.md)."
    );
  }
  return token;
}

export async function uploadDraftImage(file: File): Promise<string> {
  const token = requireBlobToken();
  const ext = file.name.split(".").pop() || "jpg";
  const pathname = `draft-images/${crypto.randomUUID()}.${ext}`;
  const blob = await put(pathname, file, { access: "public", token });
  return blob.url;
}

export async function uploadGeneratedImage(
  buffer: Buffer,
  contentType = "image/png"
): Promise<string> {
  const token = requireBlobToken();
  const ext = contentType === "image/png" ? "png" : "jpg";
  const pathname = `generated-images/${crypto.randomUUID()}.${ext}`;
  const blob = await put(pathname, buffer, {
    access: "public",
    token,
    contentType,
  });
  return blob.url;
}
