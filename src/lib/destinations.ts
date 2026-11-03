import { createClient } from "@/lib/supabase-server";
import { SITE } from "@/data/site";
import type { BlogDestination } from "@/types";

// Read helpers for the public blog. Both swallow errors (returning empty /
// null) so a paused or unreachable database degrades to an empty-state page
// instead of a crash.

export async function getPublishedDestinations(limit?: number): Promise<BlogDestination[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("blog_destinations")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false });
    if (limit) query = query.limit(limit);
    const { data } = await query;
    return (data as BlogDestination[]) ?? [];
  } catch (error) {
    console.error("getPublishedDestinations failed:", error);
    return [];
  }
}

export async function getDestinationBySlug(slug: string): Promise<BlogDestination | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("blog_destinations")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    return (data as BlogDestination | null) ?? null;
  } catch (error) {
    console.error("getDestinationBySlug failed:", error);
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
