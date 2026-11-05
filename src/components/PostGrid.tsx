import { PenLine } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PostCard } from "@/components/PostCard";
import type { BlogPost } from "@/types";

// A grid of posts, or the "coming soon" empty state when there are none.
export function PostGrid({ posts }: { posts: BlogPost[] }) {
  if (posts.length === 0) {
    return (
      <EmptyState
        icon={PenLine}
        title="More blog posts coming soon!"
        description="Nothing here yet — check back shortly."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
