import Link from "next/link";
import { Plus, Settings2 } from "lucide-react";
import { PostGrid } from "@/components/PostGrid";
import { getPosts, isBlogEditor } from "@/lib/posts";

export const metadata = { title: "Blog — Grady Travels" };
export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const [posts, isEditor] = await Promise.all([getPosts(), isBlogEditor()]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-brand-teal-900">Blog</h1>
          <p className="mt-2 text-brand-muted">My latest posts, newest first.</p>
        </div>
        {isEditor && (
          <div className="flex items-center gap-2">
            <Link
              href="/blog/manage"
              className="flex items-center gap-1.5 rounded-full border border-brand-teal-200 px-4 py-2 text-sm font-medium text-brand-teal-700 hover:bg-brand-teal-50"
            >
              <Settings2 className="h-4 w-4" />
              Manage posts
            </Link>
            <Link
              href="/blog/new"
              className="flex items-center gap-1.5 rounded-full bg-brand-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-teal-700"
            >
              <Plus className="h-4 w-4" />
              New post
            </Link>
          </div>
        )}
      </div>

      <PostGrid posts={posts} />
    </div>
  );
}
