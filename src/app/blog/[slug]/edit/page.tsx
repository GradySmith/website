import { notFound } from "next/navigation";
import { PostForm } from "@/components/PostForm";
import { getPostBySlug, isBlogOwner } from "@/lib/posts";

export default async function EditPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, isOwner] = await Promise.all([getPostBySlug(slug), isBlogOwner()]);
  if (!post || !isOwner) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <h1 className="font-display text-3xl text-brand-teal-900">Edit post</h1>
      <PostForm post={post} />
    </div>
  );
}
