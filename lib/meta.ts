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

/**
 * Posts to the business Facebook Page. One image -> a photo post; several -> a
 * multi-photo post (each photo is uploaded unpublished, then attached to one feed post).
 * Returns the published post id.
 */
export async function publishToFacebook(
  message: string,
  imageUrls: string[] = []
): Promise<string> {
  const pageId = requireEnv("META_PAGE_ID");
  const accessToken = requireEnv("META_PAGE_ACCESS_TOKEN");

  if (imageUrls.length === 1) {
    const result = await graphPost(`/${pageId}/photos`, {
      url: imageUrls[0],
      caption: message,
      access_token: accessToken,
    });
    return result.post_id || result.id;
  }

  if (imageUrls.length > 1) {
    const params: Record<string, string> = { message, access_token: accessToken };
    for (const [i, url] of imageUrls.entries()) {
      const photo = await graphPost(`/${pageId}/photos`, {
        url,
        published: "false",
        access_token: accessToken,
      });
      params[`attached_media[${i}]`] = JSON.stringify({ media_fbid: photo.id });
    }
    const result = await graphPost(`/${pageId}/feed`, params);
    return result.id;
  }

  const result = await graphPost(`/${pageId}/feed`, {
    message,
    access_token: accessToken,
  });
  return result.id;
}

/**
 * Publishes to the linked Instagram Business account. Instagram has no text-only post
 * type, so at least one image is required. One image -> a single media container;
 * 2-10 images -> a carousel (a child container per slide, then one carousel container).
 */
export async function publishToInstagram(
  caption: string,
  imageUrls: string[]
): Promise<string> {
  const igUserId = requireEnv("META_IG_USER_ID");
  const accessToken = requireEnv("META_PAGE_ACCESS_TOKEN");

  if (imageUrls.length === 0) throw new Error("פרסום לאינסטגרם דורש תמונה");
  if (imageUrls.length > 10) throw new Error("קרוסלה באינסטגרם יכולה להכיל עד 10 תמונות");

  let creationId: string;
  if (imageUrls.length === 1) {
    creationId = (
      await graphPost(`/${igUserId}/media`, {
        image_url: imageUrls[0],
        caption,
        access_token: accessToken,
      })
    ).id;
  } else {
    const children: string[] = [];
    for (const url of imageUrls) {
      const child = await graphPost(`/${igUserId}/media`, {
        image_url: url,
        is_carousel_item: "true",
        access_token: accessToken,
      });
      children.push(child.id);
    }
    creationId = (
      await graphPost(`/${igUserId}/media`, {
        media_type: "CAROUSEL",
        children: children.join(","),
        caption,
        access_token: accessToken,
      })
    ).id;
  }

  const publish = await graphPost(`/${igUserId}/media_publish`, {
    creation_id: creationId,
    access_token: accessToken,
  });

  return publish.id;
}
