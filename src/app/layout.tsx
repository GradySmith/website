import type { Metadata } from "next";
import { Young_Serif, Outfit, Caveat } from "next/font/google";
import { headers } from "next/headers";
import { Sidebar } from "@/components/Sidebar";
import { BlogHeader } from "@/components/BlogHeader";
import { SocialLinks } from "@/components/SocialLinks";
import { SITE } from "@/data/site";
import { PLANNER_PATH_PREFIXES } from "@/lib/site-routes";
import { TopBar } from "@/components/TopBar";
import { PreferencesProvider } from "@/lib/preferences-context";
import { createClient } from "@/lib/supabase-server";
import { getServerPreferences, type UserPreferences } from "@/lib/preferences";
import { getUsdToCadRate } from "@/lib/exchange-rate";
import "./globals.css";

const youngSerif = Young_Serif({
  variable: "--font-young-serif",
  subsets: ["latin"],
  weight: "400",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${SITE.name} — ${SITE.tagline}`,
  description: SITE.tagline,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // src/proxy.ts tags every request with the pathname it's for, so we
  // know here whether to show the app chrome (Sidebar) or render the
  // page full-bleed (e.g. /login).
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/auth");
  // The Trip Planner keeps the app-style sidebar; everything else is the
  // public blog with a simple top header.
  const isPlannerRoute = PLANNER_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  let userEmail: string | undefined;
  let preferences: UserPreferences = { locale: "en", currency: "USD" };
  let exchangeRate = 1;

  if (isPlannerRoute) {
    const supabase = await createClient();
    const [{ data }, prefs, rate] = await Promise.all([
      supabase.auth.getClaims(),
      getServerPreferences(),
      getUsdToCadRate(),
    ]);
    userEmail = data?.claims?.email as string | undefined;
    preferences = prefs;
    exchangeRate = rate;
  } else if (!isAuthRoute) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getClaims();
      userEmail = data?.claims?.email as string | undefined;
    } catch {
      userEmail = undefined;
    }
  }

  return (
    <html lang="en">
      <body className={`${youngSerif.variable} ${outfit.variable} ${caveat.variable} antialiased`}>
        {isAuthRoute ? (
          children
        ) : !isPlannerRoute ? (
          <div className="flex min-h-screen flex-col">
            <BlogHeader userEmail={userEmail} />
            <main className="flex-1 px-6 py-10">{children}</main>
            <footer className="flex flex-col items-center gap-4 border-t border-brand-teal-100 px-6 py-8 text-xs text-brand-muted">
              <SocialLinks />
              <p>
                © {new Date().getFullYear()} {SITE.name}
              </p>
            </footer>
          </div>
        ) : (
          <PreferencesProvider
            initialLocale={preferences.locale}
            initialCurrency={preferences.currency}
            exchangeRate={exchangeRate}
          >
            <div className="flex min-h-screen">
              <Sidebar userEmail={userEmail} />
              <div className="flex flex-1 flex-col">
                <div className="flex flex-shrink-0 justify-end px-10 pt-6">
                  <TopBar />
                </div>
                <main className="flex-1 overflow-y-auto px-10 pb-8 pt-4">{children}</main>
              </div>
            </div>
          </PreferencesProvider>
        )}
      </body>
    </html>
  );
}
