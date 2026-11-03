"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { isBlogOwner, slugify } from "@/lib/destinations";

export type SaveDestinationState = { error?: string } | undefined;

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

// Create (no `id`) or update (with `id`) a destination post. Owner only —
// checked here as well as by the table's row-level-security policies.
export async function saveDestination(
  _prev: SaveDestinationState,
  formData: FormData
): Promise<SaveDestinationState> {
  if (!(await isBlogOwner())) return { error: "Only the blog owner can do this." };

  const id = text(formData, "id");
  const name = text(formData, "name");
  if (!name) return { error: "Name is required." };

  const slug = slugify(text(formData, "slug") || name);
  if (!slug) return { error: "Couldn't build a URL from that name." };

  const tips = text(formData, "tips")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const fields = {
    slug,
    name,
    country: text(formData, "country") || null,
    summary: text(formData, "summary") || null,
    body: text(formData, "body") || null,
    best_time: text(formData, "best_time") || null,
    tips,
    cover_image_url: text(formData, "cover_image_url") || null,
    video_url: text(formData, "video_url") || null,
    published: formData.get("published") === "on",
    updated_at: new Date().toISOString(),
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("blog_destinations").update(fields).eq("id", id)
    : await supabase.from("blog_destinations").insert(fields);

  if (error) {
    return {
      error: error.code === "23505" ? "Another destination already uses that URL." : error.message,
    };
  }

  revalidatePath("/");
  revalidatePath("/destinations");
  revalidatePath(`/destinations/${slug}`);
  redirect(`/destinations/${slug}`);
}

export async function deleteDestination(formData: FormData) {
  if (!(await isBlogOwner())) return;
  const id = text(formData, "id");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("blog_destinations").delete().eq("id", id);

  revalidatePath("/");
  revalidatePath("/destinations");
  redirect("/destinations");
}
