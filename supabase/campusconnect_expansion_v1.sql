-- CampusConnect additive expansion migration.
-- Review against the live schema before running. Does not drop/rename existing objects.
begin;

create table if not exists public.user_connections (
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
create table if not exists public.user_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 100),
  description text not null default '',
  cover_path text,
  logo_path text,
  category text not null default 'General',
  university_id uuid references public.universities(id),
  department text,
  community_type text not null check (community_type in ('public','private','hidden')),
  rules text not null default '',
  max_members integer check (max_members is null or max_members > 0),
  join_approval boolean not null default true,
  invite_permission text not null default 'admins' check (invite_permission in ('admins','members')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false
);
create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','moderator','member')),
  status text not null default 'active' check (status in ('active','banned','left')),
  joined_at timestamptz not null default now(),
  primary key (community_id,user_id)
);
create or replace function public.cc_add_community_owner()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  insert into public.community_members(community_id,user_id,role,status)
  values(new.id,new.created_by,'owner','active')
  on conflict(community_id,user_id) do update set role='owner',status='active';
  return new;
end;
$$;
drop trigger if exists cc_community_owner_after_insert on public.communities;
create trigger cc_community_owner_after_insert after insert on public.communities
for each row execute function public.cc_add_community_owner();

create table if not exists public.community_join_requests (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (community_id,user_id,id)
);
create unique index if not exists community_one_pending_request_idx
  on public.community_join_requests(community_id,user_id) where status='pending';
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  content text not null check (char_length(content) between 1 and 10000),
  media_paths text[] not null default '{}',
  is_announcement boolean not null default false,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  parent_id uuid references public.community_comments(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create table if not exists public.community_reactions (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null default 'like',
  created_at timestamptz not null default now(),
  primary key(post_id,user_id)
);
create table if not exists public.community_invitations (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  token_hash text not null unique,
  created_by uuid not null references public.profiles(id),
  expires_at timestamptz not null,
  max_uses integer not null default 1 check(max_uses > 0),
  used_count integer not null default 0 check(used_count >= 0),
  created_at timestamptz not null default now()
);
create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id),
  post_id uuid references public.community_posts(id) on delete cascade,
  reported_user_id uuid references public.profiles(id),
  reason text not null,
  status text not null default 'open' check(status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);
create table if not exists public.community_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  community_id uuid references public.communities(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.community_moderation_logs (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  target_user_id uuid references public.profiles(id),
  target_post_id uuid references public.community_posts(id),
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.resource_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.academic_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null check(char_length(title) between 3 and 240),
  description text not null default '',
  university_id uuid references public.universities(id),
  faculty text,
  department text,
  batch text,
  semester text,
  academic_year text,
  course_code text,
  course_name text,
  course_teacher text,
  category_id uuid references public.resource_categories(id),
  resource_type text not null default 'document',
  storage_path text,
  external_url text,
  cover_path text,
  source_reference text,
  language text not null default 'en',
  tags text[] not null default '{}',
  visibility text not null default 'university' check(visibility in ('private','university','public')),
  status text not null default 'pending' check(status in ('pending','approved','rejected','correction_requested','deleted')),
  uploaded_by uuid not null references public.profiles(id),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  file_size_bytes bigint check(file_size_bytes is null or file_size_bytes >= 0),
  stored_size_bytes bigint check(stored_size_bytes is null or stored_size_bytes >= 0),
  mime_type text,
  version_label text not null default '1.0',
  view_count bigint not null default 0,
  download_count bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create table if not exists public.resource_versions (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.academic_resources(id) on delete cascade,
  version_label text not null,
  storage_path text not null,
  change_description text,
  uploaded_by uuid not null references public.profiles(id),
  file_size_bytes bigint,
  stored_size_bytes bigint,
  created_at timestamptz not null default now(),
  unique(resource_id,version_label)
);
create table if not exists public.resource_reviews (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.academic_resources(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check(rating between 1 and 5),
  review text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(resource_id,user_id)
);
create table if not exists public.resource_comments (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.academic_resources(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.resource_comments(id) on delete cascade,
  content text not null check(char_length(content) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create table if not exists public.resource_favorites (
  resource_id uuid not null references public.academic_resources(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(resource_id,user_id)
);
create table if not exists public.resource_requests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  course_code text,
  department text,
  semester text,
  resource_type text,
  description text,
  priority text not null default 'normal' check(priority in ('low','normal','high')),
  status text not null default 'open' check(status in ('open','in_progress','fulfilled','rejected','closed')),
  requested_by uuid not null references public.profiles(id),
  fulfilled_resource_id uuid references public.academic_resources(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.resource_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  resource_id uuid references public.academic_resources(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists communities_type_created_idx on public.communities(community_type,created_at desc) where is_deleted=false;
create index if not exists community_members_user_idx on public.community_members(user_id,status);
create index if not exists community_posts_feed_idx on public.community_posts(community_id,created_at desc) where deleted_at is null;
create index if not exists resources_search_idx on public.academic_resources using gin(to_tsvector('simple',coalesce(title,'')||' '||coalesce(description,'')||' '||coalesce(course_code,'')||' '||coalesce(course_name,'')));
create index if not exists resources_filter_idx on public.academic_resources(university_id,department,semester,status,created_at desc);
create index if not exists resource_comments_idx on public.resource_comments(resource_id,created_at);
create index if not exists resource_notifications_user_idx on public.resource_notifications(user_id,created_at desc);


-- Guard immutable identity/approval fields against client-side privilege escalation.
create or replace function public.cc_guard_connection_update()
returns trigger language plpgsql set search_path=public
as $$
begin
  if new.requester_id <> old.requester_id or new.addressee_id <> old.addressee_id then
    raise exception 'Connection participants cannot be changed';
  end if;
  if auth.uid() = old.addressee_id and new.status not in ('accepted','declined',old.status) then
    raise exception 'Addressee may only accept or decline';
  end if;
  if auth.uid() = old.requester_id and new.status not in ('cancelled',old.status) then
    raise exception 'Requester may only cancel';
  end if;
  return new;
end;
$$;
drop trigger if exists cc_guard_connection_update_trigger on public.user_connections;
create trigger cc_guard_connection_update_trigger before update on public.user_connections
for each row execute function public.cc_guard_connection_update();

create or replace function public.cc_guard_resource_owner_update()
returns trigger language plpgsql security definer set search_path=public
as $$
declare v_reviewer boolean;
begin
  select exists(select 1 from public.profiles p where p.id=auth.uid()
    and p.role in ('super_admin','university_admin','moderator')) into v_reviewer;
  if auth.uid() = old.uploaded_by then
    if new.status is distinct from old.status
       or new.approved_by is distinct from old.approved_by
       or new.approved_at is distinct from old.approved_at
       or new.uploaded_by is distinct from old.uploaded_by
       or (new.storage_path is not null and new.storage_path not like (auth.uid()::text || '/%')) then
      raise exception 'Only an authorized reviewer can change approval fields';
    end if;
    if old.status='approved' and (
      new.title is distinct from old.title or new.description is distinct from old.description
      or new.storage_path is distinct from old.storage_path or new.category_id is distinct from old.category_id
      or new.course_code is distinct from old.course_code or new.course_name is distinct from old.course_name
    ) then
      new.status := 'pending';
      new.approved_by := null;
      new.approved_at := null;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists cc_guard_resource_owner_update_trigger on public.academic_resources;
create trigger cc_guard_resource_owner_update_trigger before update on public.academic_resources
for each row execute function public.cc_guard_resource_owner_update();


-- Verification helper: status is sourced only from profiles and cannot be set by a client.
create or replace function public.cc_is_verified()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles p where p.id=auth.uid() and p.student_status='verified'); $$;
create or replace function public.cc_is_community_staff(p_community uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.community_members m where m.community_id=p_community and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin','moderator')); $$;
create or replace function public.cc_is_community_member(p_community uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.community_members m where m.community_id=p_community and m.user_id=auth.uid() and m.status='active'); $$;

revoke all on function public.cc_is_verified() from public;
revoke all on function public.cc_is_community_staff(uuid) from public;
revoke all on function public.cc_is_community_member(uuid) from public;
grant execute on function public.cc_is_verified() to authenticated;
grant execute on function public.cc_is_community_staff(uuid) to authenticated;
grant execute on function public.cc_is_community_member(uuid) to authenticated;

alter table public.user_connections enable row level security;
alter table public.user_follows enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_join_requests enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_reactions enable row level security;
alter table public.community_invitations enable row level security;
alter table public.community_reports enable row level security;
alter table public.community_notifications enable row level security;
alter table public.community_moderation_logs enable row level security;
alter table public.resource_categories enable row level security;
alter table public.academic_resources enable row level security;
alter table public.resource_versions enable row level security;
alter table public.resource_reviews enable row level security;
alter table public.resource_comments enable row level security;
alter table public.resource_favorites enable row level security;
alter table public.resource_requests enable row level security;
alter table public.resource_notifications enable row level security;


-- Idempotent policy replacement for safe re-application.
drop policy if exists cc_connections_read on public.user_connections;
drop policy if exists cc_connections_insert on public.user_connections;
drop policy if exists cc_connections_update on public.user_connections;
drop policy if exists cc_follows_read on public.user_follows;
drop policy if exists cc_follows_insert on public.user_follows;
drop policy if exists cc_follows_delete on public.user_follows;
drop policy if exists cc_communities_read on public.communities;
drop policy if exists cc_communities_create on public.communities;
drop policy if exists cc_communities_owner_update on public.communities;
drop policy if exists cc_members_read on public.community_members;
drop policy if exists cc_members_self_join on public.community_members;
drop policy if exists cc_members_self_leave on public.community_members;
drop policy if exists cc_join_request_read on public.community_join_requests;
drop policy if exists cc_join_request_create on public.community_join_requests;
drop policy if exists cc_join_request_cancel on public.community_join_requests;
drop policy if exists cc_join_request_staff_review on public.community_join_requests;
drop policy if exists cc_community_posts_read on public.community_posts;
drop policy if exists cc_community_posts_insert on public.community_posts;
drop policy if exists cc_community_posts_owner_update on public.community_posts;
drop policy if exists cc_community_posts_delete on public.community_posts;
drop policy if exists cc_community_comments_read on public.community_comments;
drop policy if exists cc_community_comments_write on public.community_comments;
drop policy if exists cc_community_reactions_read on public.community_reactions;
drop policy if exists cc_community_reactions_write on public.community_reactions;
drop policy if exists cc_community_reactions_delete on public.community_reactions;
drop policy if exists cc_invitation_read on public.community_invitations;
drop policy if exists cc_invitation_create on public.community_invitations;
drop policy if exists cc_reports_create on public.community_reports;
drop policy if exists cc_reports_staff_read on public.community_reports;
drop policy if exists cc_community_notifications_read on public.community_notifications;
drop policy if exists cc_community_notifications_update on public.community_notifications;
drop policy if exists cc_moderation_logs_staff_read on public.community_moderation_logs;
drop policy if exists cc_moderation_logs_staff_insert on public.community_moderation_logs;
drop policy if exists cc_categories_read on public.resource_categories;
drop policy if exists cc_resources_read on public.academic_resources;
drop policy if exists cc_resources_upload on public.academic_resources;
drop policy if exists cc_resources_owner_update on public.academic_resources;
drop policy if exists cc_resources_owner_delete on public.academic_resources;
drop policy if exists cc_resources_reviewer_update on public.academic_resources;
drop policy if exists cc_versions_read on public.resource_versions;
drop policy if exists cc_versions_insert on public.resource_versions;
drop policy if exists cc_reviews_read on public.resource_reviews;
drop policy if exists cc_reviews_write on public.resource_reviews;
drop policy if exists cc_reviews_update on public.resource_reviews;
drop policy if exists cc_comments_read on public.resource_comments;
drop policy if exists cc_comments_insert on public.resource_comments;
drop policy if exists cc_comments_owner_update on public.resource_comments;
drop policy if exists cc_favorites_read on public.resource_favorites;
drop policy if exists cc_favorites_write on public.resource_favorites;
drop policy if exists cc_favorites_delete on public.resource_favorites;
drop policy if exists cc_requests_read on public.resource_requests;
drop policy if exists cc_requests_insert on public.resource_requests;
drop policy if exists cc_requests_update on public.resource_requests;
drop policy if exists cc_resource_notifications_read on public.resource_notifications;
drop policy if exists cc_resource_notifications_update on public.resource_notifications;
drop policy if exists cc_private_storage_owner_insert on storage.objects;
drop policy if exists cc_private_storage_owner_read on storage.objects;
drop policy if exists cc_private_storage_owner_delete on storage.objects;
drop policy if exists cc_private_storage_approved_resource_read on storage.objects;

-- Connections/follows: only involved accounts can inspect; verified users initiate.
create policy cc_connections_read on public.user_connections for select to authenticated
using(requester_id=auth.uid() or addressee_id=auth.uid());
create policy cc_connections_insert on public.user_connections for insert to authenticated
with check(requester_id=auth.uid() and public.cc_is_verified());
create policy cc_connections_update on public.user_connections for update to authenticated
using(requester_id=auth.uid() or addressee_id=auth.uid())
with check(requester_id=auth.uid() or addressee_id=auth.uid());
create policy cc_follows_read on public.user_follows for select to authenticated
using(follower_id=auth.uid() or followed_id=auth.uid());
create policy cc_follows_insert on public.user_follows for insert to authenticated
with check(follower_id=auth.uid() and public.cc_is_verified());
create policy cc_follows_delete on public.user_follows for delete to authenticated
using(follower_id=auth.uid());

-- Public communities are discoverable; private/hidden are visible only to members/staff.
create policy cc_communities_read on public.communities for select to authenticated
using(is_deleted=false and (community_type='public' or public.cc_is_community_member(id) or public.cc_is_community_staff(id)));
create policy cc_communities_create on public.communities for insert to authenticated
with check(created_by=auth.uid() and public.cc_is_verified());
create policy cc_communities_owner_update on public.communities for update to authenticated
using(exists(select 1 from public.community_members m where m.community_id=id and m.user_id=auth.uid() and m.role in ('owner','admin') and m.status='active'))
with check(exists(select 1 from public.community_members m where m.community_id=id and m.user_id=auth.uid() and m.role in ('owner','admin') and m.status='active'));
create policy cc_members_read on public.community_members for select to authenticated
using(public.cc_is_community_member(community_id) or exists(select 1 from public.communities c where c.id=community_id and c.community_type='public'));
create policy cc_members_self_join on public.community_members for insert to authenticated
with check(user_id=auth.uid() and role='member' and status='active' and public.cc_is_verified()
  and exists(select 1 from public.communities c where c.id=community_id and c.community_type='public' and c.join_approval=false));
create policy cc_members_self_leave on public.community_members for delete to authenticated
using(user_id=auth.uid() and role='member');
create policy cc_join_request_read on public.community_join_requests for select to authenticated
using(user_id=auth.uid() or public.cc_is_community_staff(community_id));
create policy cc_join_request_create on public.community_join_requests for insert to authenticated
with check(user_id=auth.uid() and public.cc_is_verified() and exists(select 1 from public.communities c where c.id=community_id and (c.community_type in ('private','hidden') or c.join_approval=true)));
create policy cc_join_request_cancel on public.community_join_requests for update to authenticated
using(user_id=auth.uid() and status='pending') with check(user_id=auth.uid() and status='cancelled');
create policy cc_join_request_staff_review on public.community_join_requests for update to authenticated
using(public.cc_is_community_staff(community_id)) with check(public.cc_is_community_staff(community_id));
create policy cc_community_posts_read on public.community_posts for select to authenticated
using(deleted_at is null and (
  public.cc_is_community_member(community_id)
  or exists(select 1 from public.communities c where c.id=community_id and c.community_type='public')
));
create policy cc_community_posts_insert on public.community_posts for insert to authenticated
with check(author_id=auth.uid() and public.cc_is_community_member(community_id));
create policy cc_community_posts_owner_update on public.community_posts for update to authenticated
using(author_id=auth.uid() or public.cc_is_community_staff(community_id))
with check(author_id=auth.uid() or public.cc_is_community_staff(community_id));
create policy cc_community_posts_delete on public.community_posts for delete to authenticated
using(author_id=auth.uid() or public.cc_is_community_staff(community_id));
create policy cc_community_comments_read on public.community_comments for select to authenticated
using(public.cc_is_community_member((select p.community_id from public.community_posts p where p.id=post_id)));
create policy cc_community_comments_write on public.community_comments for insert to authenticated
with check(author_id=auth.uid() and public.cc_is_community_member((select p.community_id from public.community_posts p where p.id=post_id)));
create policy cc_community_reactions_read on public.community_reactions for select to authenticated
using(public.cc_is_community_member((select p.community_id from public.community_posts p where p.id=post_id)));
create policy cc_community_reactions_write on public.community_reactions for insert to authenticated
with check(user_id=auth.uid() and public.cc_is_community_member((select p.community_id from public.community_posts p where p.id=post_id)));
create policy cc_community_reactions_delete on public.community_reactions for delete to authenticated using(user_id=auth.uid());
create policy cc_invitation_read on public.community_invitations for select to authenticated
using(public.cc_is_community_staff(community_id));
create policy cc_invitation_create on public.community_invitations for insert to authenticated
with check(created_by=auth.uid() and public.cc_is_community_staff(community_id));
create policy cc_reports_create on public.community_reports for insert to authenticated
with check(reporter_id=auth.uid() and public.cc_is_community_member(community_id));
create policy cc_reports_staff_read on public.community_reports for select to authenticated
using(public.cc_is_community_staff(community_id));
create policy cc_community_notifications_read on public.community_notifications for select to authenticated using(user_id=auth.uid());
create policy cc_community_notifications_update on public.community_notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy cc_moderation_logs_staff_read on public.community_moderation_logs for select to authenticated using(public.cc_is_community_staff(community_id));
create policy cc_moderation_logs_staff_insert on public.community_moderation_logs for insert to authenticated with check(actor_id=auth.uid() and public.cc_is_community_staff(community_id));

create policy cc_categories_read on public.resource_categories for select to authenticated using(is_active=true);
create policy cc_resources_read on public.academic_resources for select to authenticated
using(deleted_at is null and (
  uploaded_by=auth.uid()
  or (status='approved' and visibility='public')
  or (status='approved' and visibility='university' and university_id=(select p.university_id from public.profiles p where p.id=auth.uid()))
));
create policy cc_resources_upload on public.academic_resources for insert to authenticated
with check(uploaded_by=auth.uid() and status='pending' and approved_by is null and approved_at is null and public.cc_is_verified() and (storage_path is null or storage_path like (auth.uid()::text || '/%')));
create policy cc_resources_owner_update on public.academic_resources for update to authenticated
using(uploaded_by=auth.uid() and status<>'deleted') with check(uploaded_by=auth.uid());
create policy cc_resources_owner_delete on public.academic_resources for delete to authenticated using(uploaded_by=auth.uid());
create policy cc_resources_reviewer_update on public.academic_resources for update to authenticated
using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('super_admin','university_admin','moderator')) and uploaded_by<>auth.uid())
with check(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('super_admin','university_admin','moderator')) and uploaded_by<>auth.uid());
create policy cc_versions_read on public.resource_versions for select to authenticated
using(exists(select 1 from public.academic_resources r where r.id=resource_id and (r.status='approved' or r.uploaded_by=auth.uid())));
create policy cc_versions_insert on public.resource_versions for insert to authenticated
with check(uploaded_by=auth.uid() and exists(select 1 from public.academic_resources r where r.id=resource_id and r.uploaded_by=auth.uid()));
create policy cc_reviews_read on public.resource_reviews for select to authenticated
using(exists(select 1 from public.academic_resources r where r.id=resource_id and r.status='approved'));
create policy cc_reviews_write on public.resource_reviews for insert to authenticated
with check(user_id=auth.uid() and public.cc_is_verified() and exists(select 1 from public.academic_resources r where r.id=resource_id and r.status='approved'));
create policy cc_reviews_update on public.resource_reviews for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy cc_comments_read on public.resource_comments for select to authenticated
using(exists(select 1 from public.academic_resources r where r.id=resource_id and r.status='approved'));
create policy cc_comments_insert on public.resource_comments for insert to authenticated
with check(user_id=auth.uid() and public.cc_is_verified() and exists(select 1 from public.academic_resources r where r.id=resource_id and r.status='approved'));
create policy cc_comments_owner_update on public.resource_comments for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy cc_favorites_read on public.resource_favorites for select to authenticated using(user_id=auth.uid());
create policy cc_favorites_write on public.resource_favorites for insert to authenticated with check(user_id=auth.uid() and public.cc_is_verified());
create policy cc_favorites_delete on public.resource_favorites for delete to authenticated using(user_id=auth.uid());
create policy cc_requests_read on public.resource_requests for select to authenticated using(requested_by=auth.uid() or status='open');
create policy cc_requests_insert on public.resource_requests for insert to authenticated with check(requested_by=auth.uid() and public.cc_is_verified());
create policy cc_requests_update on public.resource_requests for update to authenticated using(requested_by=auth.uid()) with check(requested_by=auth.uid());
create policy cc_resource_notifications_read on public.resource_notifications for select to authenticated using(user_id=auth.uid());
create policy cc_resource_notifications_update on public.resource_notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

-- Private R2/Supabase objects are not public. Supabase bucket is reserved for sensitive private assets.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('campus-private','campus-private',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict(id) do nothing;
create policy cc_private_storage_owner_insert on storage.objects for insert to authenticated
with check(bucket_id='campus-private' and (storage.foldername(name))[1]=auth.uid()::text);
create policy cc_private_storage_owner_read on storage.objects for select to authenticated
using(bucket_id='campus-private' and (storage.foldername(name))[1]=auth.uid()::text);
create policy cc_private_storage_owner_delete on storage.objects for delete to authenticated
using(bucket_id='campus-private' and (storage.foldername(name))[1]=auth.uid()::text);
create policy cc_private_storage_approved_resource_read on storage.objects for select to authenticated
using(bucket_id='campus-private' and exists(
  select 1 from public.academic_resources r
  where r.storage_path=name and r.status='approved' and r.deleted_at is null
  and (r.visibility='public' or (r.visibility='university' and r.university_id=(select p.university_id from public.profiles p where p.id=auth.uid())))
));

insert into public.resource_categories(name,slug) values
('Class Notes','class-notes'),('Lecture Slides','lecture-slides'),('PDF Books','pdf-books'),
('Textbooks','textbooks'),('Handouts','handouts'),('Previous Year Questions','previous-year-questions'),
('Question Bank','question-bank'),('Model Tests','model-tests'),('Assignments','assignments'),
('Lab Reports','lab-reports'),('Research Papers','research-papers'),('Thesis','thesis'),
('Tutorials','tutorials'),('Programming Resources','programming-resources'),('Video Lectures','video-lectures'),
('Other Resources','other-resources')
on conflict(slug) do nothing;

commit;
