/** Every image of a post in order: the carousel slides, or the single image. */
export function postImages(post: { imageUrl: string | null; imageUrls?: string[] | null }): string[] {
  if (post.imageUrls && post.imageUrls.length > 0) return post.imageUrls;
  return post.imageUrl ? [post.imageUrl] : [];
}
