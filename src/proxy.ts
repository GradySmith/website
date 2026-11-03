// Next.js 16 renamed middleware.ts to proxy.ts. This runs on every
// request (see matcher below) to keep the Supabase session fresh and
// gate access to signed-in-only pages. See src/lib/supabase-proxy.ts
// for the actual logic.

import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase-proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
