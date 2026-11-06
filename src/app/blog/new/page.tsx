import { notFound } from "next/navigation";
import { PostForm } from "@/components/PostForm";
import { isBlogEditor } from "@/lib/posts";

export default async function NewPostPage() {
  if (!(await isBlogEditor())) notFound();

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PostForm />
    </div>
  );
}
