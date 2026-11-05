"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { isBlogOwner, slugify } from "@/lib/posts";
import { ALL_COUNTRIES, RESOURCE_CATEGORIES } from "@/data/taxonomy";

export type SavePostState = { error?: string } | undefined;

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

// Create (no `id`) or update (with `id`) a post. Owner only — checked here
// as well as by the table's row-level-security policies.
export async function savePost(
  _prev: SavePostState,
  formData: FormData
): Promise<SavePostState> {
  if (!(await isBlogOwner())) return { error: "Only the blog owner can do this." };

  const id = text(formData, "id");
  const title = text(formData, "title");
  if (!title) return { error: "Title is required." };

  const slug = slugify(text(formData, "slug") || title);
  if (!slug) return { error: "Couldn't build a URL from that title." };
  if (slug === "new") return { error: "That URL is reserved — pick another." };

  // Only accept tags that exist in src/data/taxonomy.ts.
  const validCountries = new Set(ALL_COUNTRIES.map((country) => country.slug));
  const validCategories = new Set(RESOURCE_CATEGORIES.map((category) => category.slug));
  const countries = formData.getAll("countries").map(String).filter((s) => validCountries.has(s));
  const categories = formData.getAll("categories").map(String).filter((s) => validCategories.has(s));

  const fields = {
    slug,
    title,
    summary: text(formData, "summary") || null,
    body: text(formData, "body") || null,
    cover_image_url: text(formData, "cover_image_url") || null,
    video_url: text(formData, "video_url") || null,
    countries,
    categories,
    published: formData.get("published") === "on",
    updated_at: new Date().toISOString(),
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("blog_posts").update(fields).eq("id", id)
    : await supabase.from("blog_posts").insert(fields);

  if (error) {
    return {
      error: error.code === "23505" ? "Another post already uses that URL." : error.message,
    };
  }

  revalidatePath("/", "layout");
  redirect(`/blog/${slug}`);
}

export async function deletePost(formData: FormData) {
  if (!(await isBlogOwner())) return;
  const id = text(formData, "id");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("blog_posts").delete().eq("id", id);

  revalidatePath("/", "layout");
  redirect("/blog");
}
