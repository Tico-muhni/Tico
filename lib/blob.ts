import { put } from "@vercel/blob";

// A token is optional: when the Blob store is connected through Vercel's newer
// OIDC mode there is only BLOB_STORE_ID, and the SDK authenticates by itself
// when no token is passed.
const blobToken = () => process.env.BLOB_READ_WRITE_TOKEN || undefined;

export async function uploadDraftImage(file: File): Promise<string> {
  const token = blobToken();
  const ext = file.name.split(".").pop() || "jpg";
  const pathname = `draft-images/${crypto.randomUUID()}.${ext}`;
  const blob = await put(pathname, file, { access: "public", token });
  return blob.url;
}

export async function uploadGeneratedImage(
  buffer: Buffer,
  contentType = "image/png"
): Promise<string> {
  const token = blobToken();
  const ext = contentType === "image/png" ? "png" : "jpg";
  const pathname = `generated-images/${crypto.randomUUID()}.${ext}`;
  const blob = await put(pathname, buffer, {
    access: "public",
    token,
    contentType,
  });
  return blob.url;
}

export async function uploadTikiaDocument(
  buffer: Buffer,
  filename: string,
  contentType = "application/octet-stream"
): Promise<string> {
  const token = blobToken();
  const ext = filename.split(".").pop() || "bin";
  const pathname = `tikia-documents/${crypto.randomUUID()}.${ext}`;
  const blob = await put(pathname, buffer, {
    access: "public",
    token,
    contentType,
  });
  return blob.url;
}
