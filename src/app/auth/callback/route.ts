// Handles the redirect back from Google (or any future OAuth provider)
// after the user approves the consent screen. Exchanges the ?code= for
// a real Supabase session and sets it in cookies before sending the user
// on to the app.
//
// Also doubles as the landing spot for the "Connect Gmail" flow (see
// src/app/bookings/actions.ts) — when that flow requested the
// gmail.readonly scope with offline access, Google hands back a
// provider_refresh_token here, which we store so booking scans can run
// later without the user being present.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { syncPreferencesToCookies } from "@/lib/preferences";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const gmailConnect = searchParams.get("gmail_connect") === "1";

  let next = searchParams.get("next") ?? "/";
  if (!next.startsWith("/")) {
    next = "/";
  }

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (gmailConnect) {
        const refreshToken = data.session?.provider_refresh_token;
        const userId = data.session?.user.id;

        if (refreshToken && userId) {
          const { error: upsertError } = await supabase
            .from("email_connections")
            .upsert(
              {
                user_id: userId,
                provider: "google",
                access_token: data.session?.provider_token ?? null,
                refresh_token: refreshToken,
                connected_at: new Date().toISOString(),
              },
              { onConflict: "user_id,provider" }
            );

          if (upsertError) {
            console.error("Failed to store Gmail connection:", upsertError.message);
          }
        } else {
          // Google only returns a refresh token on first consent (or when
          // prompt=consent forces re-consent). If it's missing, scans
          // will have no way to get a fresh access token later.
          console.error(
            "Gmail connect: no provider_refresh_token in session — Google may not have granted offline access."
          );
        }
      }

      // Pull this account's saved language/currency into cookies for this
      // browser, in case they're signing in somewhere new.
      if (data.session?.user) {
        await syncPreferencesToCookies(supabase, data.session.user.id);
      }

      // Behind a proxy/load balancer (e.g. Vercel), `origin` can differ
      // from the host the browser actually used — prefer x-forwarded-host
      // once deployed.
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Could not sign in with Google")}`
  );
}
