"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { isBlogEditor, slugify } from "@/lib/posts";
import { isBodyEmpty } from "@/lib/post-body";
import { sanitizePostHtml } from "@/lib/sanitize-post-html";
import { ALL_COUNTRIES, RESOURCE_CATEGORIES } from "@/data/taxonomy";

export type SavePostState = { error?: string } | undefined;

// URL endings that would clash with real pages under /blog.
const RESERVED_SLUGS = new Set(["new", "manage"]);

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

// Create (no `id`) or update (with `id`) a post. Editors only — checked here
// as well as by the table's row-level-security policies.
export async function savePost(
  _prev: SavePostState,
  formData: FormData
): Promise<SavePostState> {
  if (!(await isBlogEditor())) return { error: "Only blog editors can do this." };

  const id = text(formData, "id");
  const title = text(formData, "title");
  if (!title) return { error: "Title is required." };

  const slug = slugify(text(formData, "slug") || title);
  if (!slug) return { error: "Couldn't build a URL from that title." };
  if (RESERVED_SLUGS.has(slug)) return { error: "That URL is reserved — pick another." };

  // Only accept tags that exist in src/data/taxonomy.ts.
  const validCountries = new Set(ALL_COUNTRIES.map((country) => country.slug));
  const validCategories = new Set(RESOURCE_CATEGORIES.map((category) => category.slug));
  const countries = formData.getAll("countries").map(String).filter((s) => validCountries.has(s));
  const categories = formData.getAll("categories").map(String).filter((s) => validCategories.has(s));

  const body = sanitizePostHtml(String(formData.get("body") ?? ""));

  // "publish" → live, "draft" → hidden, "keep" → leave a saved post as it is.
  const intent = text(formData, "intent");
  const published = intent === "publish" ? true : intent === "draft" ? false : undefined;
  if (intent === "publish" && isBodyEmpty(body)) {
    return { error: "Write something in the post before publishing." };
  }

  const fields = {
    slug,
    title,
    subtitle: text(formData, "subtitle") || null,
    summary: text(formData, "summary") || null,
    body: isBodyEmpty(body) ? null : body,
    cover_image_url: text(formData, "cover_image_url") || null,
    video_url: text(formData, "video_url") || null,
    countries,
    categories,
    updated_at: new Date().toISOString(),
    ...(published !== undefined || !id ? { published: published ?? false } : {}),
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("blog_posts").update(fields).eq("id", id)
    : await supabase.from("blog_posts").insert(fields);

  if (error) {
    if (error.code === "23505") return { error: "Another post already uses that URL." };
    if (/subtitle/i.test(error.message)) {
      return { error: "The database needs the latest update (run 0014_blog_editors.sql in Supabase)." };
    }
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(`/blog/${slug}`);
}

export async function deletePost(formData: FormData) {
  if (!(await isBlogEditor())) return;
  const id = text(formData, "id");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("blog_posts").delete().eq("id", id);

  revalidatePath("/", "layout");
  redirect("/blog/manage");
}
