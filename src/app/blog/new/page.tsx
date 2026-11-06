import { notFound } from "next/navigation";
import { PostForm } from "@/components/PostForm";
import { isBlogEditor } from "@/lib/posts";

export default async function NewPostPage() {
  if (!(await isBlogEditor())) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <h1 className="font-display text-3xl text-brand-teal-900">New post</h1>
      <PostForm />
    </div>
  );
}
