import { notFound } from "next/navigation";
import { PostForm } from "@/components/PostForm";
import { getPostBySlug, isBlogEditor } from "@/lib/posts";

export default async function EditPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, isEditor] = await Promise.all([getPostBySlug(slug), isBlogEditor()]);
  if (!post || !isEditor) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <h1 className="font-display text-3xl text-brand-teal-900">Edit post</h1>
      <PostForm post={post} />
    </div>
  );
}
