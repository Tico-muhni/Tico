const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Add it to your environment (see SETUP.md).`);
  }
  return value;
}

async function graphPost(
  path: string,
  params: Record<string, string>
): Promise<Record<string, string>> {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(
      json.error?.message || `Meta Graph API request failed (${res.status})`
    );
  }
  return json;
}

/** Posts to the business Facebook Page. Returns the published post id. */
export async function publishToFacebook(
  message: string,
  imageUrl?: string | null
): Promise<string> {
  const pageId = requireEnv("META_PAGE_ID");
  const accessToken = requireEnv("META_PAGE_ACCESS_TOKEN");

  if (imageUrl) {
    const result = await graphPost(`/${pageId}/photos`, {
      url: imageUrl,
      caption: message,
      access_token: accessToken,
    });
    return result.post_id || result.id;
  }

  const result = await graphPost(`/${pageId}/feed`, {
    message,
    access_token: accessToken,
  });
  return result.id;
}

/**
 * Publishes to the linked Instagram Business account. Instagram's Graph API
 * has no text-only post type, so imageUrl is required (two-step: create a
 * media container, then publish it).
 */
export async function publishToInstagram(
  caption: string,
  imageUrl: string
): Promise<string> {
  const igUserId = requireEnv("META_IG_USER_ID");
  const accessToken = requireEnv("META_PAGE_ACCESS_TOKEN");

  const container = await graphPost(`/${igUserId}/media`, {
    image_url: imageUrl,
    caption,
    access_token: accessToken,
  });

  const publish = await graphPost(`/${igUserId}/media_publish`, {
    creation_id: container.id,
    access_token: accessToken,
  });

  return publish.id;
}
