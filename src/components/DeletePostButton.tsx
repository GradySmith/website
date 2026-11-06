"use client";

import { Trash2 } from "lucide-react";
import { deletePost } from "@/app/blog/actions";

// Delete with a confirmation prompt.
export function DeletePostButton({
  id,
  title,
  iconOnly = false,
}: {
  id: string;
  title: string;
  iconOnly?: boolean;
}) {
  return (
    <form
      action={deletePost}
      onSubmit={(event) => {
        if (!window.confirm(`Delete "${title}"? This can't be undone.`)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        aria-label="Delete post"
        className={
          iconOnly
            ? "text-brand-muted hover:text-red-600"
            : "flex items-center gap-1 text-sm text-brand-muted hover:text-red-600"
        }
      >
        <Trash2 className="h-4 w-4" />
        {!iconOnly && "Delete"}
      </button>
    </form>
  );
}
