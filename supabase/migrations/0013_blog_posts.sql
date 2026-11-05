-- Blog posts: public, owner-authored. Each post can be tagged with any
-- number of countries (slugs like 'peru') and travel-resource categories
-- (slugs like 'itineraries', 'entry-visa-requirements'); the site menus
-- and country pages are built from those tags.

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text,
  body text,
  cover_image_url text,
  video_url text,
  countries text[] not null default '{}',
  categories text[] not null default '{}',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_posts_countries_idx on public.blog_posts using gin (countries);
create index if not exists blog_posts_categories_idx on public.blog_posts using gin (categories);

alter table public.blog_posts enable row level security;

drop policy if exists "Public can read published posts" on public.blog_posts;
create policy "Public can read published posts"
  on public.blog_posts for select
  using (published = true or (auth.jwt() ->> 'email') = 'gradys2003@gmail.com');

drop policy if exists "Owner can insert posts" on public.blog_posts;
create policy "Owner can insert posts"
  on public.blog_posts for insert
  with check ((auth.jwt() ->> 'email') = 'gradys2003@gmail.com');

drop policy if exists "Owner can update posts" on public.blog_posts;
create policy "Owner can update posts"
  on public.blog_posts for update
  using ((auth.jwt() ->> 'email') = 'gradys2003@gmail.com');

drop policy if exists "Owner can delete posts" on public.blog_posts;
create policy "Owner can delete posts"
  on public.blog_posts for delete
  using ((auth.jwt() ->> 'email') = 'gradys2003@gmail.com');
