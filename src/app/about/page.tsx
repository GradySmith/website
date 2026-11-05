import Link from "next/link";
import { SITE } from "@/data/site";

export const metadata = { title: "About me — Grady Travels" };

export default function AboutPage() {
  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-10 md:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-5">
        <h1 className="font-display text-5xl text-brand-teal-900">About me</h1>
        <p className="font-hand text-3xl">{SITE.tagline}</p>
        {SITE.about.paragraphs.map((paragraph, index) => (
          <p key={index} className="leading-relaxed text-brand-ink">
            {paragraph}
          </p>
        ))}
        <Link
          href="/blog"
          className="w-fit rounded-full bg-brand-teal-600 px-6 py-3 text-sm font-medium text-white hover:bg-brand-teal-700"
        >
          Read the blog
        </Link>
      </div>
      {SITE.about.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={SITE.about.photoUrl}
          alt="Grady at Machu Picchu"
          className="w-full rounded-3xl object-cover shadow-md"
        />
      )}
    </div>
  );
}
