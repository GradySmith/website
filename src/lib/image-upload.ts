// Browser-side image upload for the blog editor. Photos are downscaled in the
// browser first (phone photos are often 5–10 MB), then uploaded straight to
// the public "blog-images" Supabase Storage bucket. Only blog editors may
// upload — enforced by the bucket's row-level-security policies.

import { createClient } from "@/lib/supabase";

const MAX_DIMENSION = 2000;
const MAX_FILE_BYTES = 30 * 1024 * 1024;
const BUCKET = "blog-images";

async function downscale(file: File): Promise<{ blob: Blob; ext: string; type: string }> {
  // Animated GIFs would lose their animation on a canvas, so keep them as-is.
  if (file.type === "image/gif") return { blob: file, ext: "gif", type: "image/gif" };

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser can't process images.");
  context.fillStyle = "#ffffff"; // flatten transparent PNGs onto white for JPEG
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85)
  );
  if (!blob) throw new Error("Couldn't prepare that image.");
  return { blob, ext: "jpg", type: "image/jpeg" };
}

// Uploads one image and returns its public URL. Throws an Error with a
// human-readable message on failure.
export async function uploadBlogImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} isn't an image.`);
  if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} is too large (30 MB max).`);

  let prepared;
  try {
    prepared = await downscale(file);
  } catch {
    throw new Error(`Couldn't read ${file.name}. Try a JPG or PNG.`);
  }

  const supabase = createClient();
  const now = new Date();
  const path = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}.${prepared.ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, prepared.blob, {
    contentType: prepared.type,
    cacheControl: "31536000",
  });
  if (error) {
    throw new Error(
      /row-level security|not authorized|unauthorized/i.test(error.message)
        ? "You don't have permission to upload images (are you signed in as an editor?)."
        : `Upload failed: ${error.message}`
    );
  }

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
