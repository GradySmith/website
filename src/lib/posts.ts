import { createClient } from "@/lib/supabase-server";
import { SITE } from "@/data/site";
import type { BlogPost } from "@/types";

// Read helpers for the public blog. Each swallows errors (returning empty /
// null) so a paused or unreachable database degrades to an empty-state page
// instead of a crash.

export async function getPosts(
  filter: { country?: string; category?: string; limit?: number; includeDrafts?: boolean } = {}
): Promise<BlogPost[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });
    // Drafts are only returned to editors anyway (row-level security).
    if (!filter.includeDrafts) query = query.eq("published", true);
    if (filter.country) query = query.contains("countries", [filter.country]);
    if (filter.category) query = query.contains("categories", [filter.category]);
    if (filter.limit) query = query.limit(filter.limit);
    const { data } = await query;
    return (data as BlogPost[]) ?? [];
  } catch (error) {
    console.error("getPosts failed:", error);
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("blog_posts").select("*").eq("slug", slug).maybeSingle();
    return (data as BlogPost | null) ?? null;
  } catch (error) {
    console.error("getPostBySlug failed:", error);
    return null;
  }
}

export async function isBlogOwner(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    return (data?.claims?.email as string | undefined)?.toLowerCase() === SITE.ownerEmail;
  } catch {
    return false;
  }
}

// Blog editors: the owner plus anyone listed in the blog_editors table.
// Falls back to owner-only if the table hasn't been created yet.
export async function isBlogEditor(): Promise<boolean> {
  if (await isBlogOwner()) return true;
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("is_blog_editor");
    return data === true;
  } catch {
    return false;
  }
}

export { youtubeEmbedUrl } from "@/lib/embeds";

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatPostDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" });
}

// The signed-in visitor's email, or undefined for logged-out visitors.
export async function getViewerEmail(): Promise<string | undefined> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    return (data?.claims?.email as string | undefined) ?? undefined;
  } catch {
    return undefined;
  }
}
