import Link from "next/link";
import { SocialLinks } from "@/components/SocialLinks";
import { SITE } from "@/data/site";

// Shown at the bottom of every post: a short "about me" and, for visitors who
// aren't signed in, an invitation to create a free account.
export function PostFooter({ signedIn }: { signedIn: boolean }) {
  return (
    <footer className="mt-6 flex flex-col gap-6 border-t border-brand-teal-200 pt-10">
      <section className="flex flex-col items-center gap-5 rounded-3xl bg-brand-teal-50 p-8 text-center sm:flex-row sm:items-start sm:text-left">
        {SITE.about.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={SITE.about.photoUrl}
            alt="Grady"
            className="h-28 w-28 flex-shrink-0 rounded-full object-cover shadow-sm"
          />
        )}
        <div className="flex flex-col items-center gap-3 sm:items-start">
          <h2 className="font-display text-2xl text-brand-teal-900">About me</h2>
          <p className="text-brand-ink">{SITE.about.paragraphs[0]}</p>
          <SocialLinks />
          <Link
            href="/about"
            className="text-sm font-medium text-brand-teal-700 hover:text-brand-teal-900"
          >
            More about me →
          </Link>
        </div>
      </section>

      {!signedIn && (
        <section className="flex flex-col items-center gap-3 rounded-3xl bg-brand-mint-100 p-8 text-center">
          <h2 className="font-display text-2xl text-brand-teal-900">Join the adventure</h2>
          <p className="max-w-lg text-brand-ink">
            Create a free account to use my Trip Planner — brainstorm destinations, build itineraries
            and keep your bookings in one place.
          </p>
          <Link
            href="/login"
            className="rounded-full bg-brand-teal-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-teal-700"
          >
            Sign up for free
          </Link>
          <p className="text-xs text-brand-muted">
            Already have an account?{" "}
            <Link href="/login" className="underline hover:text-brand-teal-700">
              Sign in
            </Link>
          </p>
        </section>
      )}
    </footer>
  );
}
