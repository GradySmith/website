// Routes that make up the Trip Planner (login required, app-style sidebar).
// Everything else on the site is the public blog.
export const PLANNER_PATH_PREFIXES = [
  "/discover",
  "/trips",
  "/bookings",
  "/map",
  "/calendar",
  "/budget",
  "/trash",
];

// Routes a signed-out visitor may open.
export const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/auth",
  "/destinations",
  "/blog",
  "/resources",
  "/about",
];

export function isPublicPath(pathname: string): boolean {
  return pathname === "/" || PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
