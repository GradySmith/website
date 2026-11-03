"use client";

// App Router error boundary: without this file, an uncaught render error
// anywhere under the root layout falls back to Next's generic (and in some
// cases nearly blank) default error UI, which is exactly what made the
// Home page rendering issue hard to diagnose — there was no visible signal
// that anything had actually thrown. With this in place, any future error
// shows a real message and a retry button instead of silently vanishing.

import { useEffect } from "react";
import { PillButton } from "@/components/PillButton";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error rendering this page:", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-red-100 bg-red-50 px-8 py-12 text-center">
      <p className="font-display text-xl font-semibold text-red-700">
        Something went wrong loading this page
      </p>
      <p className="text-sm text-red-600">
        {error.message || "An unexpected error occurred."}
      </p>
      <PillButton type="button" onClick={reset}>
        Try again
      </PillButton>
    </div>
  );
}
