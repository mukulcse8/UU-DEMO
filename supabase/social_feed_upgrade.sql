-- CampusConnect social feed permissions and interaction upgrade.
-- Run once in Supabase SQL Editor after schema.sql and social_features_upgrade.sql.
-- Safe to re-run: policies and indexes are replaced idempotently.

-- Every signed-in member may participate in the general campus feed.
-- Verified status remains mandatory for academic groups, student directory and DMs.
drop policy if exists "Verified students can create posts" on public.posts;
drop policy if exists "Authenticated users can create campus posts" on public.posts;
create policy "Authenticated users can create campus posts"
on public.posts for insert to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.university_id = posts.university_id
  )
);

drop policy if exists "Verified students can comment" on public.comments;
drop policy if exists "Authenticated users can comment" on public.comments;
create policy "Authenticated users can comment"
on public.comments for insert to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.posts p
    join public.profiles me on me.id = auth.uid()
    where p.id = comments.post_id
      and p.university_id = me.university_id
  )
);

-- Likes are available to every authenticated member, not only verified students.
drop policy if exists "Verified students can like" on public.post_likes;
drop policy if exists "Authenticated users can like" on public.post_likes;
create policy "Authenticated users can like"
on public.post_likes for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.posts p
    join public.profiles me on me.id = auth.uid()
    where p.id = post_likes.post_id
      and p.university_id = me.university_id
  )
);

-- Record share actions so share counts can be measured without exposing private data.
create table if not exists public.post_shares (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists post_shares_post_created_idx
  on public.post_shares(post_id, created_at desc);
alter table public.post_shares enable row level security;
drop policy if exists "Users can share campus posts" on public.post_shares;
create policy "Users can share campus posts"
on public.post_shares for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.posts p
    join public.profiles me on me.id = auth.uid()
    where p.id = post_shares.post_id
      and p.university_id = me.university_id
  )
);
drop policy if exists "Members can read campus post shares" on public.post_shares;
create policy "Members can read campus post shares"
on public.post_shares for select to authenticated
using (
  exists (
    select 1 from public.posts p
    join public.profiles me on me.id = auth.uid()
    where p.id = post_shares.post_id
      and p.university_id = me.university_id
  )
);

-- Feed interactions are streamed live when Supabase Realtime is enabled.
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.posts';
  exception when duplicate_object then null; when undefined_object then null;
  end;
  begin execute 'alter publication supabase_realtime add table public.post_likes';
  exception when duplicate_object then null; when undefined_object then null;
  end;
  begin execute 'alter publication supabase_realtime add table public.comments';
  exception when duplicate_object then null; when undefined_object then null;
  end;
  begin execute 'alter publication supabase_realtime add table public.post_shares';
  exception when duplicate_object then null; when undefined_object then null;
  end;
end $$;
