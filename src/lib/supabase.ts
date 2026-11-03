// Browser-side Supabase client — safe to import into Client Components
// (e.g. for realtime subscriptions). For Server Components, Server
// Actions, and Route Handlers, use "@/lib/supabase-server" instead.

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
