-- Blog editors, subtitle column, and image storage.
-- Paste the CONTENTS of this file into the Supabase SQL Editor and run it.

-- 1. Who may write on the blog. Add more editors with:
--      insert into public.blog_editors (email) values ('friend@example.com');
create table if not exists public.blog_editors (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.blog_editors enable row level security;

insert into public.blog_editors (email) values ('gradys2003@gmail.com')
  on conflict do nothing;

-- True when the signed-in user's email is in blog_editors. SECURITY DEFINER
-- so the policies below can call it without recursing into blog_editors RLS.
create or replace function public.is_blog_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blog_editors
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

drop policy if exists "Editors can see editors" on public.blog_editors;
create policy "Editors can see editors"
  on public.blog_editors for select
  using (public.is_blog_editor());

drop policy if exists "Owner manages editors" on public.blog_editors;
create policy "Owner manages editors"
  on public.blog_editors for all
  using ((auth.jwt() ->> 'email') = 'gradys2003@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'gradys2003@gmail.com');

-- 2. Subtitle on posts.
alter table public.blog_posts add column if not exists subtitle text;

-- 3. Posts: editors (not just the owner) can read drafts and write.
drop policy if exists "Public can read published posts" on public.blog_posts;
create policy "Public can read published posts"
  on public.blog_posts for select
  using (published = true or public.is_blog_editor());

drop policy if exists "Owner can insert posts" on public.blog_posts;
drop policy if exists "Editors can insert posts" on public.blog_posts;
create policy "Editors can insert posts"
  on public.blog_posts for insert
  with check (public.is_blog_editor());

drop policy if exists "Owner can update posts" on public.blog_posts;
drop policy if exists "Editors can update posts" on public.blog_posts;
create policy "Editors can update posts"
  on public.blog_posts for update
  using (public.is_blog_editor());

drop policy if exists "Owner can delete posts" on public.blog_posts;
drop policy if exists "Editors can delete posts" on public.blog_posts;
create policy "Editors can delete posts"
  on public.blog_posts for delete
  using (public.is_blog_editor());

-- 4. Image storage: a public bucket anyone can read, editors can upload.
insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can read blog images" on storage.objects;
create policy "Public can read blog images"
  on storage.objects for select
  using (bucket_id = 'blog-images');

drop policy if exists "Editors can upload blog images" on storage.objects;
create policy "Editors can upload blog images"
  on storage.objects for insert
  with check (bucket_id = 'blog-images' and public.is_blog_editor());

drop policy if exists "Editors can update blog images" on storage.objects;
create policy "Editors can update blog images"
  on storage.objects for update
  using (bucket_id = 'blog-images' and public.is_blog_editor());

drop policy if exists "Editors can delete blog images" on storage.objects;
create policy "Editors can delete blog images"
  on storage.objects for delete
  using (bucket_id = 'blog-images' and public.is_blog_editor());
