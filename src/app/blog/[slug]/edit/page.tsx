import { notFound } from "next/navigation";
import { PostForm } from "@/components/PostForm";
import { getPostBySlug, isBlogEditor } from "@/lib/posts";

export default async function EditPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, isEditor] = await Promise.all([getPostBySlug(slug), isBlogEditor()]);
  if (!post || !isEditor) notFound();

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PostForm post={post} />
    </div>
  );
}
