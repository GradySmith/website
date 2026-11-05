import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PostGrid } from "@/components/PostGrid";
import { findCategory } from "@/data/taxonomy";
import { getPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";

export default async function ResourceCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: categorySlug } = await params;
  const category = findCategory(categorySlug);
  if (!category) notFound();

  const posts = await getPosts({ category: categorySlug });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link
          href="/resources"
          className="flex w-fit items-center gap-1 text-sm text-brand-muted hover:text-brand-teal-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Travel Resources
        </Link>
        <h1 className="font-display text-4xl text-brand-teal-900">{category.name}</h1>
        <p className="text-brand-muted">{category.description}</p>
      </div>

      <PostGrid posts={posts} />
    </div>
  );
}
