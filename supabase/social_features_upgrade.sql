-- CampusConnect Social Features Upgrade
-- Run once in Supabase SQL Editor AFTER the existing schema and verification upgrade.

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(post_id,user_id)
);

create table if not exists public.social_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check(char_length(name) between 2 and 100),
  description text,
  university_id uuid not null references public.universities(id),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.social_group_members (
  group_id uuid not null references public.social_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(group_id,user_id)
);

create table if not exists public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.social_groups(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check(char_length(content) between 1 and 4000),
  created_at timestamptz not null default now()
);

create table if not exists public.direct_conversations (
  id uuid primary key default gen_random_uuid(),
  member_ids uuid[] not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check(array_length(member_ids,1)=2)
);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check(char_length(content) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists group_messages_created_idx on public.group_messages(group_id,created_at);
create index if not exists direct_messages_created_idx on public.direct_messages(conversation_id,created_at);
create index if not exists social_groups_uni_idx on public.social_groups(university_id,created_at desc);

alter table public.post_likes enable row level security;
alter table public.social_groups enable row level security;
alter table public.social_group_members enable row level security;
alter table public.group_messages enable row level security;
alter table public.direct_conversations enable row level security;
alter table public.direct_messages enable row level security;

drop policy if exists "Read likes for visible posts" on public.post_likes;
create policy "Read likes for visible posts" on public.post_likes for select to authenticated
using(exists(select 1 from public.posts p where p.id=post_id));
drop policy if exists "Verified students can like" on public.post_likes;
create policy "Verified students can like" on public.post_likes for insert to authenticated
with check(user_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.student_status='verified'));
drop policy if exists "Users can remove own likes" on public.post_likes;
create policy "Users can remove own likes" on public.post_likes for delete to authenticated using(user_id=auth.uid());

drop policy if exists "Same university can read groups" on public.social_groups;
create policy "Same university can read groups" on public.social_groups for select to authenticated
using(university_id=(select university_id from public.profiles where id=auth.uid() and student_status='verified'));
drop policy if exists "Verified students create groups" on public.social_groups;
create policy "Verified students create groups" on public.social_groups for insert to authenticated
with check(created_by=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.student_status='verified' and p.university_id=social_groups.university_id));

drop policy if exists "Members can view group members" on public.social_group_members;
create policy "Members can view group members" on public.social_group_members for select to authenticated
using(exists(select 1 from public.social_groups g where g.id=group_id and g.university_id=(select university_id from public.profiles where id=auth.uid() and student_status='verified')));
drop policy if exists "Verified same university can join groups" on public.social_group_members;
create policy "Verified same university can join groups" on public.social_group_members for insert to authenticated
with check(user_id=auth.uid() and exists(select 1 from public.social_groups g join public.profiles p on p.id=auth.uid() where g.id=group_id and g.university_id=p.university_id and p.student_status='verified'));

drop policy if exists "Group members read messages" on public.group_messages;
create policy "Group members read messages" on public.group_messages for select to authenticated
using(exists(select 1 from public.social_group_members m where m.group_id=group_messages.group_id and m.user_id=auth.uid()));
drop policy if exists "Group members send messages" on public.group_messages;
create policy "Group members send messages" on public.group_messages for insert to authenticated
with check(sender_id=auth.uid() and exists(select 1 from public.social_group_members m where m.group_id=group_messages.group_id and m.user_id=auth.uid()));

drop policy if exists "Conversation participants can read" on public.direct_conversations;
create policy "Conversation participants can read" on public.direct_conversations for select to authenticated using(auth.uid()=any(member_ids));
drop policy if exists "Verified students create conversations" on public.direct_conversations;
create policy "Verified students create conversations" on public.direct_conversations for insert to authenticated
with check(created_by=auth.uid() and auth.uid()=any(member_ids) and exists(select 1 from public.profiles p where p.id=auth.uid() and p.student_status='verified') and exists(select 1 from public.profiles peer where peer.id=any(member_ids) and peer.id<>auth.uid() and peer.student_status='verified' and peer.university_id=(select university_id from public.profiles where id=auth.uid())));
drop policy if exists "Participants read direct messages" on public.direct_messages;
create policy "Participants read direct messages" on public.direct_messages for select to authenticated
using(exists(select 1 from public.direct_conversations c where c.id=conversation_id and auth.uid()=any(c.member_ids)));
drop policy if exists "Participants send direct messages" on public.direct_messages;
create policy "Participants send direct messages" on public.direct_messages for insert to authenticated
with check(sender_id=auth.uid() and exists(select 1 from public.direct_conversations c where c.id=conversation_id and auth.uid()=any(c.member_ids)) and exists(select 1 from public.profiles p where p.id=auth.uid() and p.student_status='verified'));

-- The client may edit ordinary profile fields only; role and verification status stay protected.
revoke update on public.profiles from authenticated;
grant update(full_name,department,batch,avatar_url) on public.profiles to authenticated;

-- Enable live message events for Supabase Realtime (safe to rerun).
do $$
begin
  execute 'alter publication supabase_realtime add table public.group_messages';
exception when duplicate_object then null;
end $$;
do $$
begin
  execute 'alter publication supabase_realtime add table public.direct_messages';
exception when duplicate_object then null;
end $$;
