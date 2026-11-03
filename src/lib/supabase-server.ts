// Server-side Supabase client — use this in Server Components, Server
// Actions, and Route Handlers. It reads/writes the auth session via
// cookies, which the browser client can't do. For Client Components,
// use "@/lib/supabase" instead.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // `setAll` was called from a Server Component that can't write
            // cookies directly. Safe to ignore as long as proxy.ts is
            // refreshing the session on every request (it is).
          }
        },
      },
    }
  );
}
