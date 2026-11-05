import { createClient } from "@/lib/supabase-server";
import { SITE } from "@/data/site";
import type { BlogPost } from "@/types";

// Read helpers for the public blog. Each swallows errors (returning empty /
// null) so a paused or unreachable database degrades to an empty-state page
// instead of a crash.

export async function getPosts(
  filter: { country?: string; category?: string; limit?: number } = {}
): Promise<BlogPost[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("blog_posts")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false });
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

// Returns a YouTube embed URL for a watch/short/youtu.be link, else null.
export function youtubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    let id: string | null = null;
    if (parsed.hostname === "youtu.be") id = parsed.pathname.slice(1);
    else if (parsed.hostname.endsWith("youtube.com")) {
      if (parsed.pathname === "/watch") id = parsed.searchParams.get("v");
      else if (parsed.pathname.startsWith("/shorts/") || parsed.pathname.startsWith("/embed/")) {
        id = parsed.pathname.split("/")[2] ?? null;
      }
    }
    return id ? `https://www.youtube.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

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
