-- Blog destinations: public, owner-authored travel posts.
-- Anyone (including signed-out visitors) can read published posts; only the
-- blog owner's account can write. Change the email below if the owner changes.

create table if not exists public.blog_destinations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  country text,
  summary text,
  body text,
  best_time text,
  tips text[] not null default '{}',
  cover_image_url text,
  video_url text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.blog_destinations enable row level security;

drop policy if exists "Public can read published destinations" on public.blog_destinations;
create policy "Public can read published destinations"
  on public.blog_destinations for select
  using (published = true or (auth.jwt() ->> 'email') = 'gradys2003@gmail.com');

drop policy if exists "Owner can insert destinations" on public.blog_destinations;
create policy "Owner can insert destinations"
  on public.blog_destinations for insert
  with check ((auth.jwt() ->> 'email') = 'gradys2003@gmail.com');

drop policy if exists "Owner can update destinations" on public.blog_destinations;
create policy "Owner can update destinations"
  on public.blog_destinations for update
  using ((auth.jwt() ->> 'email') = 'gradys2003@gmail.com');

drop policy if exists "Owner can delete destinations" on public.blog_destinations;
create policy "Owner can delete destinations"
  on public.blog_destinations for delete
  using ((auth.jwt() ->> 'email') = 'gradys2003@gmail.com');
