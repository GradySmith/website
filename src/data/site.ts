// Single place to edit blog-wide text and links. Leave a social URL as an
// empty string to hide that button.

export const SITE = {
  name: "Grady Travels",
  tagline: "Travel stories, tips, and the places in between.",
  ownerEmail: "gradys2003@gmail.com",
  about: {
    heading: "Hi, I'm Grady.",
    paragraphs: [
      "I'm a traveller from Toronto sharing the places I go, what they cost, and what I'd do differently. This is where my videos, photos and tips from YouTube, Instagram and TikTok live in one place.",
      "Browse the destinations I've covered, or use the Trip Planner to brainstorm and organise your own journey.",
    ],
    photoUrl: "/grady.jpg",
  },
  socials: {
    youtube: "",
    instagram: "",
    tiktok: "",
  },
} as const;
