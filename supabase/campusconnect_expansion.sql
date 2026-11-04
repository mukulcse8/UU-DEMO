-- CampusConnect additive expansion migration (2026-11)
-- Run AFTER the existing schema + signup_profile_upgrade.sql + verification_upgrade.sql
-- + social_features_upgrade.sql + social_feed_upgrade.sql.
-- No existing table/column is dropped or renamed.
create extension if not exists pgcrypto;

-- Shared helpers: SECURITY DEFINER avoids recursive profile/member RLS lookups.
create or replace function public.cc_is_verified(p_uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles p where p.id=p_uid and p.student_status='verified');
$$;
revoke all on function public.cc_is_verified(uuid) from public;
grant execute on function public.cc_is_verified(uuid) to authenticated;

create table if not exists public.student_connections (
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','accepted','declined','blocked')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(requester_id,addressee_id), check(requester_id<>addressee_id)
);
create table if not exists public.student_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(follower_id,followed_id), check(follower_id<>followed_id)
);
create index if not exists student_connections_addressee_idx on public.student_connections(addressee_id,status);
create index if not exists student_follows_followed_idx on public.student_follows(followed_id);
alter table public.student_connections enable row level security;
alter table public.student_follows enable row level security;
drop policy if exists cc_connections_read on public.student_connections;
create policy cc_connections_read on public.student_connections for select to authenticated using(requester_id=auth.uid() or addressee_id=auth.uid());
drop policy if exists cc_connections_request on public.student_connections;
create policy cc_connections_request on public.student_connections for insert to authenticated with check(requester_id=auth.uid() and public.cc_is_verified() and public.cc_is_verified(addressee_id));
drop policy if exists cc_connections_update on public.student_connections;
create policy cc_connections_update on public.student_connections for update to authenticated using(addressee_id=auth.uid() or requester_id=auth.uid()) with check(addressee_id=auth.uid() or requester_id=auth.uid());
drop policy if exists cc_connections_delete on public.student_connections;
create policy cc_connections_delete on public.student_connections for delete to authenticated using(requester_id=auth.uid() or addressee_id=auth.uid());
drop policy if exists cc_follows_read on public.student_follows;
create policy cc_follows_read on public.student_follows for select to authenticated using(follower_id=auth.uid() or followed_id=auth.uid());
drop policy if exists cc_follows_add on public.student_follows;
create policy cc_follows_add on public.student_follows for insert to authenticated with check(follower_id=auth.uid() and public.cc_is_verified() and public.cc_is_verified(followed_id));
drop policy if exists cc_follows_remove on public.student_follows;
create policy cc_follows_remove on public.student_follows for delete to authenticated using(follower_id=auth.uid());

-- Community system: membership state and role are authoritative in PostgreSQL.
create table if not exists public.communities (
 id uuid primary key default gen_random_uuid(), name text not null check(char_length(name) between 2 and 120),
 slug text unique, description text not null default '', cover_image_key text, logo_image_key text,
 category text not null default 'General', university_id uuid references public.universities(id), department text,
 community_type text not null default 'public' check(community_type in ('public','private','hidden')),
 rules text not null default '', max_members integer check(max_members is null or max_members>0),
 join_approval_required boolean not null default false,
 invitation_permission text not null default 'admin_only' check(invitation_permission in ('admin_only','all_members')),
 created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 is_archived boolean not null default false
);
create table if not exists public.community_members (
 community_id uuid not null references public.communities(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 role text not null default 'member' check(role in ('owner','admin','moderator','member')),
 status text not null default 'active' check(status in ('active','banned','left')),
 joined_at timestamptz not null default now(), primary key(community_id,user_id)
);
create or replace function public.cc_is_community_member(p_community uuid, p_uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.community_members m where m.community_id=p_community and m.user_id=p_uid and m.status='active');
$$;
revoke all on function public.cc_is_community_member(uuid,uuid) from public;
grant execute on function public.cc_is_community_member(uuid,uuid) to authenticated;

create table if not exists public.community_join_requests (
 id uuid primary key default gen_random_uuid(), community_id uuid not null references public.communities(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 message text, status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled')),
 reviewed_by uuid references public.profiles(id), reviewed_at timestamptz, created_at timestamptz not null default now(),
 unique(community_id,user_id,id)
);
create unique index if not exists community_one_pending_request on public.community_join_requests(community_id,user_id) where status='pending';
create table if not exists public.community_posts (
 id uuid primary key default gen_random_uuid(), community_id uuid not null references public.communities(id) on delete cascade,
 author_id uuid not null references public.profiles(id), body text not null check(char_length(body) between 1 and 10000),
 media_keys jsonb not null default '[]'::jsonb, is_announcement boolean not null default false,
 is_pinned boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.community_comments (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references public.community_posts(id) on delete cascade,
 author_id uuid not null references public.profiles(id), parent_id uuid references public.community_comments(id) on delete cascade,
 body text not null check(char_length(body) between 1 and 5000), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.community_reactions (
 post_id uuid not null references public.community_posts(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 reaction text not null default 'like' check(reaction in ('like','love','care','haha','wow','sad')),
 created_at timestamptz not null default now(), primary key(post_id,user_id)
);
create table if not exists public.community_invitations (
 id uuid primary key default gen_random_uuid(), community_id uuid not null references public.communities(id) on delete cascade,
 token_hash text not null unique, created_by uuid not null references public.profiles(id), expires_at timestamptz not null,
 max_uses integer not null default 1 check(max_uses>0), uses_count integer not null default 0 check(uses_count>=0),
 created_at timestamptz not null default now(), revoked_at timestamptz
);
create table if not exists public.community_reports (
 id uuid primary key default gen_random_uuid(), community_id uuid not null references public.communities(id) on delete cascade,
 reporter_id uuid not null references public.profiles(id), target_type text not null check(target_type in ('post','comment','member','community')),
 target_id uuid not null, reason text not null, status text not null default 'open' check(status in ('open','reviewing','resolved','dismissed')),
 assigned_to uuid references public.profiles(id), created_at timestamptz not null default now(), resolved_at timestamptz
);
create table if not exists public.community_notifications (
 id uuid primary key default gen_random_uuid(), community_id uuid references public.communities(id) on delete cascade,
 recipient_id uuid not null references public.profiles(id) on delete cascade, actor_id uuid references public.profiles(id),
 event_type text not null, payload jsonb not null default '{}'::jsonb, read_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.community_moderation_logs (
 id uuid primary key default gen_random_uuid(), community_id uuid not null references public.communities(id) on delete cascade,
 actor_id uuid not null references public.profiles(id), target_type text, target_id uuid, action text not null,
 details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists community_search_idx on public.communities using gin(to_tsvector('simple',name||' '||description)) where is_archived=false;
create index if not exists community_posts_feed_idx on public.community_posts(community_id,created_at desc) where deleted_at is null;
create index if not exists community_members_user_idx on public.community_members(user_id,status);
create index if not exists community_requests_admin_idx on public.community_join_requests(community_id,status,created_at desc);
create index if not exists community_notifications_user_idx on public.community_notifications(recipient_id,created_at desc);

-- Ownership row is created atomically with a community via this RPC.
create or replace function public.create_campus_community(p_name text,p_description text,p_category text,p_university_id uuid,p_department text,p_type text,p_rules text,p_max_members integer,p_join_approval boolean,p_invitation_permission text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 if auth.uid() is null or not public.cc_is_verified() then raise exception 'Verified student required'; end if;
 if p_university_id is not null and not exists(select 1 from public.profiles where id=auth.uid() and university_id=p_university_id) then raise exception 'University mismatch'; end if;
 insert into public.communities(name,description,category,university_id,department,community_type,rules,max_members,join_approval_required,invitation_permission,created_by)
 values(p_name,p_description,p_category,p_university_id,p_department,p_type,p_rules,p_max_members,p_join_approval,p_invitation_permission,auth.uid()) returning id into v_id;
 insert into public.community_members(community_id,user_id,role) values(v_id,auth.uid(),'owner');
 return v_id;
end $$;
revoke all on function public.create_campus_community(text,text,text,uuid,text,text,text,integer,boolean,text) from public;
grant execute on function public.create_campus_community(text,text,text,uuid,text,text,text,integer,boolean,text) to authenticated;

-- RLS for community objects. Private/hidden rows and media are never visible to non-members.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['communities','community_members','community_join_requests','community_posts','community_comments','community_reactions','community_invitations','community_reports','community_notifications','community_moderation_logs'] LOOP
  EXECUTE format('alter table public.%I enable row level security',t);
 END LOOP;
END $$;
drop policy if exists cc_communities_read on public.communities;
create policy cc_communities_read on public.communities for select to authenticated using (
 is_archived=false and (community_type='public' or public.cc_is_community_member(id) or created_by=auth.uid())
);
drop policy if exists cc_communities_create on public.communities;
create policy cc_communities_create on public.communities for insert to authenticated with check(false); -- creation only through checked RPC

drop policy if exists cc_members_read on public.community_members;
create policy cc_members_read on public.community_members for select to authenticated using(public.cc_is_community_member(community_members.community_id) or exists(select 1 from public.communities c where c.id=community_members.community_id and c.community_type='public'));
drop policy if exists cc_members_join_public on public.community_members;
create policy cc_members_join_public on public.community_members for insert to authenticated with check(user_id=auth.uid() and role='member' and status='active' and public.cc_is_verified() and exists(select 1 from public.communities c where c.id=community_members.community_id and c.community_type='public' and not c.join_approval_required));
drop policy if exists cc_members_self_leave on public.community_members;
create policy cc_members_self_leave on public.community_members for delete to authenticated using(user_id=auth.uid() and role<>'owner');
drop policy if exists cc_requests_read on public.community_join_requests;
create policy cc_requests_read on public.community_join_requests for select to authenticated using(user_id=auth.uid() or exists(select 1 from public.community_members m where m.community_id=community_join_requests.community_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin','moderator')));
drop policy if exists cc_requests_insert on public.community_join_requests;
create policy cc_requests_insert on public.community_join_requests for insert to authenticated with check(user_id=auth.uid() and public.cc_is_verified() and not public.cc_is_community_member(community_join_requests.community_id) and exists(select 1 from public.communities c where c.id=community_join_requests.community_id and c.community_type in ('private','hidden')));
drop policy if exists cc_requests_cancel on public.community_join_requests;
create policy cc_requests_cancel on public.community_join_requests for update to authenticated using(user_id=auth.uid() and status='pending') with check(user_id=auth.uid() and status='cancelled');
drop policy if exists cc_posts_read on public.community_posts;
create policy cc_posts_read on public.community_posts for select to authenticated using(deleted_at is null and public.cc_is_community_member(community_posts.community_id));
drop policy if exists cc_posts_create on public.community_posts;
create policy cc_posts_create on public.community_posts for insert to authenticated with check(author_id=auth.uid() and public.cc_is_verified() and public.cc_is_community_member(community_posts.community_id));
drop policy if exists cc_posts_owner_edit on public.community_posts;
create policy cc_posts_owner_edit on public.community_posts for update to authenticated using(author_id=auth.uid() or exists(select 1 from public.community_members m where m.community_id=community_posts.community_id and m.user_id=auth.uid() and m.role in ('owner','admin','moderator'))) with check(author_id=auth.uid() or exists(select 1 from public.community_members m where m.community_id=community_posts.community_id and m.user_id=auth.uid() and m.role in ('owner','admin','moderator')));
drop policy if exists cc_posts_owner_delete on public.community_posts;
create policy cc_posts_owner_delete on public.community_posts for delete to authenticated using(author_id=auth.uid() or exists(select 1 from public.community_members m where m.community_id=community_posts.community_id and m.user_id=auth.uid() and m.role in ('owner','admin','moderator')));
drop policy if exists cc_comments_member_read on public.community_comments;
create policy cc_comments_member_read on public.community_comments for select to authenticated using(exists(select 1 from public.community_posts p where p.id=community_comments.post_id and public.cc_is_community_member(p.community_id)));
drop policy if exists cc_comments_member_insert on public.community_comments;
create policy cc_comments_member_insert on public.community_comments for insert to authenticated with check(author_id=auth.uid() and exists(select 1 from public.community_posts p where p.id=community_comments.post_id and public.cc_is_community_member(p.community_id)));
drop policy if exists cc_reactions_member on public.community_reactions;
create policy cc_reactions_member on public.community_reactions for all to authenticated using(exists(select 1 from public.community_posts p where p.id=community_reactions.post_id and public.cc_is_community_member(p.community_id))) with check(user_id=auth.uid() and exists(select 1 from public.community_posts p where p.id=community_reactions.post_id and public.cc_is_community_member(p.community_id)));
drop policy if exists cc_invites_admin on public.community_invitations;
create policy cc_invites_admin on public.community_invitations for all to authenticated using(exists(select 1 from public.community_members m where m.community_id=community_invitations.community_id and m.user_id=auth.uid() and m.role in ('owner','admin'))) with check(created_by=auth.uid() and exists(select 1 from public.community_members m where m.community_id=community_invitations.community_id and m.user_id=auth.uid() and m.role in ('owner','admin')));
drop policy if exists cc_reports_read on public.community_reports;
create policy cc_reports_read on public.community_reports for select to authenticated using(reporter_id=auth.uid() or exists(select 1 from public.community_members m where m.community_id=community_reports.community_id and m.user_id=auth.uid() and m.role in ('owner','admin','moderator')));
drop policy if exists cc_reports_create on public.community_reports;
create policy cc_reports_create on public.community_reports for insert to authenticated with check(reporter_id=auth.uid() and public.cc_is_community_member(community_reports.community_id));
drop policy if exists cc_notifications_owner on public.community_notifications;
create policy cc_notifications_owner on public.community_notifications for all to authenticated using(recipient_id=auth.uid()) with check(recipient_id=auth.uid());
drop policy if exists cc_logs_admin_read on public.community_moderation_logs;
create policy cc_logs_admin_read on public.community_moderation_logs for select to authenticated using(exists(select 1 from public.community_members m where m.community_id=community_moderation_logs.community_id and m.user_id=auth.uid() and m.role in ('owner','admin')));

-- Academic resource library
create table if not exists public.resource_categories(id uuid primary key default gen_random_uuid(),name text not null unique,slug text not null unique,created_by uuid references public.profiles(id),is_active boolean not null default true,created_at timestamptz not null default now());
insert into public.resource_categories(name,slug) values
('Class Notes','class-notes'),('Lecture Slides','lecture-slides'),('PDF Books','pdf-books'),('Textbooks','textbooks'),('Handouts','handouts'),('Previous Year Questions','previous-year-questions'),('Question Bank','question-bank'),('Model Tests','model-tests'),('Exam Suggestions','exam-suggestions'),('Assignments','assignments'),('Lab Reports','lab-reports'),('Lab Manuals','lab-manuals'),('Research Papers','research-papers'),('Case Studies','case-studies'),('Project Reports','project-reports'),('Thesis','thesis'),('Tutorials','tutorials'),('Programming Resources','programming-resources'),('Video Lectures','video-lectures'),('Online Courses','online-courses'),('Study Guides','study-guides'),('Reference Materials','reference-materials'),('Other Resources','other-resources') on conflict(slug) do nothing;
create table if not exists public.academic_resources(
 id uuid primary key default gen_random_uuid(), title text not null check(char_length(title) between 3 and 240), description text not null default '',
 uploader_id uuid not null references public.profiles(id), university_id uuid references public.universities(id), faculty text, department text, batch text, semester text, academic_year text,
 course_code text, course_name text, course_teacher text, category_id uuid references public.resource_categories(id), resource_type text not null default 'document',
 file_provider text, file_key text, file_name text, file_mime text, file_size_bytes bigint check(file_size_bytes is null or file_size_bytes between 1 and 10485760), cover_key text,
 external_url text, source_reference text, language text not null default 'en', tags text[] not null default '{}', short_notes text,
 visibility text not null default 'public' check(visibility in ('public','university','private')), status text not null default 'pending' check(status in ('pending','approved','rejected','correction_requested','archived')),
 rejection_reason text, reviewed_by uuid references public.profiles(id), reviewed_at timestamptz, version_label text not null default '1.0', view_count bigint not null default 0, download_count bigint not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.resource_files(id uuid primary key default gen_random_uuid(),resource_id uuid not null references public.academic_resources(id) on delete cascade,provider text not null,object_key text not null,original_name text not null,mime_type text not null,size_bytes bigint not null,optimized_size_bytes bigint,checksum_sha256 text,created_at timestamptz not null default now());
create table if not exists public.resource_reviews(id uuid primary key default gen_random_uuid(),resource_id uuid not null references public.academic_resources(id) on delete cascade,user_id uuid not null references public.profiles(id) on delete cascade,rating int not null check(rating between 1 and 5),review text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(resource_id,user_id));
create table if not exists public.resource_comments(id uuid primary key default gen_random_uuid(),resource_id uuid not null references public.academic_resources(id) on delete cascade,user_id uuid not null references public.profiles(id) on delete cascade,parent_id uuid references public.resource_comments(id) on delete cascade,body text not null check(char_length(body) between 1 and 3000),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.resource_reactions(resource_id uuid not null references public.academic_resources(id) on delete cascade,user_id uuid not null references public.profiles(id) on delete cascade,reaction text not null check(reaction in ('helpful','like','useful')),created_at timestamptz not null default now(),primary key(resource_id,user_id));
create table if not exists public.resource_favorites(resource_id uuid not null references public.academic_resources(id) on delete cascade,user_id uuid not null references public.profiles(id) on delete cascade,created_at timestamptz not null default now(),primary key(resource_id,user_id));
create table if not exists public.resource_downloads(id uuid primary key default gen_random_uuid(),resource_id uuid not null references public.academic_resources(id) on delete cascade,user_id uuid references public.profiles(id) on delete set null,created_at timestamptz not null default now());
create table if not exists public.resource_requests(id uuid primary key default gen_random_uuid(),creator_id uuid not null references public.profiles(id) on delete cascade,title text not null,course_code text,department text,semester text,resource_type text,description text,priority text not null default 'normal' check(priority in ('low','normal','high')),status text not null default 'open' check(status in ('open','in_progress','fulfilled','rejected','closed')),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.resource_request_offers(id uuid primary key default gen_random_uuid(),request_id uuid not null references public.resource_requests(id) on delete cascade,resource_id uuid references public.academic_resources(id) on delete set null,offered_by uuid not null references public.profiles(id),message text,created_at timestamptz not null default now());
create table if not exists public.resource_reports(id uuid primary key default gen_random_uuid(),resource_id uuid not null references public.academic_resources(id) on delete cascade,reporter_id uuid not null references public.profiles(id),reason text not null,status text not null default 'open' check(status in ('open','reviewing','resolved','dismissed')),created_at timestamptz not null default now());
create table if not exists public.resource_versions(id uuid primary key default gen_random_uuid(),resource_id uuid not null references public.academic_resources(id) on delete cascade,version_label text not null,change_description text,provider text not null,object_key text not null,uploaded_by uuid not null references public.profiles(id),created_at timestamptz not null default now(),unique(resource_id,version_label));
create table if not exists public.resource_collections(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,name text not null,created_at timestamptz not null default now());
create table if not exists public.resource_collection_items(collection_id uuid not null references public.resource_collections(id) on delete cascade,resource_id uuid not null references public.academic_resources(id) on delete cascade,created_at timestamptz not null default now(),primary key(collection_id,resource_id));
create table if not exists public.resource_notifications(id uuid primary key default gen_random_uuid(),recipient_id uuid not null references public.profiles(id) on delete cascade,resource_id uuid references public.academic_resources(id) on delete cascade,event_type text not null,payload jsonb not null default '{}',read_at timestamptz,created_at timestamptz not null default now());
create index if not exists academic_resources_search_idx on public.academic_resources using gin(to_tsvector('simple',coalesce(title,'')||' '||coalesce(description,'')||' '||coalesce(course_code,'')||' '||coalesce(course_name,''))) where status='approved' and deleted_at is null;
create index if not exists academic_resources_facets_idx on public.academic_resources(university_id,department,semester,category_id,status,created_at desc);
create index if not exists academic_resources_popular_idx on public.academic_resources(download_count desc,view_count desc) where status='approved';
create index if not exists resource_notifications_user_idx on public.resource_notifications(recipient_id,created_at desc);

DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['resource_categories','academic_resources','resource_files','resource_reviews','resource_comments','resource_reactions','resource_favorites','resource_downloads','resource_requests','resource_request_offers','resource_reports','resource_versions','resource_collections','resource_collection_items','resource_notifications'] LOOP EXECUTE format('alter table public.%I enable row level security',t); END LOOP; END $$;
drop policy if exists cc_resource_categories_read on public.resource_categories;
create policy cc_resource_categories_read on public.resource_categories for select to authenticated using(is_active);
drop policy if exists cc_resource_categories_admin on public.resource_categories;
create policy cc_resource_categories_admin on public.resource_categories for all to authenticated using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('super_admin','university_admin','moderator'))) with check(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('super_admin','university_admin','moderator')));
drop policy if exists cc_resources_read on public.academic_resources;
create policy cc_resources_read on public.academic_resources for select to authenticated using(deleted_at is null and (status='approved' and (visibility='public' or (visibility='university' and university_id=(select university_id from public.profiles where id=auth.uid())))) or uploader_id=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('super_admin','university_admin','moderator')));
drop policy if exists cc_resources_upload on public.academic_resources;
create policy cc_resources_upload on public.academic_resources for insert to authenticated with check(uploader_id=auth.uid() and public.cc_is_verified() and status='pending' and reviewed_by is null and reviewed_at is null and (file_size_bytes is null or file_size_bytes<=10485760));
drop policy if exists cc_resources_owner_update on public.academic_resources;
create policy cc_resources_owner_update on public.academic_resources for update to authenticated using(uploader_id=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('super_admin','university_admin','moderator'))) with check(uploader_id=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('super_admin','university_admin','moderator')));
drop policy if exists cc_resources_owner_delete on public.academic_resources;
create policy cc_resources_owner_delete on public.academic_resources for delete to authenticated using(uploader_id=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('super_admin','university_admin','moderator')));
drop policy if exists cc_resource_reviews_read on public.resource_reviews;
create policy cc_resource_reviews_read on public.resource_reviews for select to authenticated using(exists(select 1 from public.academic_resources r where r.id=resource_id and r.status='approved'));
drop policy if exists cc_resource_reviews_write on public.resource_reviews;
create policy cc_resource_reviews_write on public.resource_reviews for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and public.cc_is_verified() and exists(select 1 from public.academic_resources r where r.id=resource_id and r.status='approved'));
drop policy if exists cc_resource_comments_read on public.resource_comments;
create policy cc_resource_comments_read on public.resource_comments for select to authenticated using(exists(select 1 from public.academic_resources r where r.id=resource_id and r.status='approved'));
drop policy if exists cc_resource_comments_write on public.resource_comments;
create policy cc_resource_comments_write on public.resource_comments for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and public.cc_is_verified() and exists(select 1 from public.academic_resources r where r.id=resource_id and r.status='approved'));
drop policy if exists cc_resource_reactions_write on public.resource_reactions;
create policy cc_resource_reactions_write on public.resource_reactions for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and public.cc_is_verified() and exists(select 1 from public.academic_resources r where r.id=resource_id and r.status='approved'));
drop policy if exists cc_resource_favorites_owner on public.resource_favorites;
create policy cc_resource_favorites_owner on public.resource_favorites for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and exists(select 1 from public.academic_resources r where r.id=resource_id and r.status='approved'));
drop policy if exists cc_resource_requests_owner_read on public.resource_requests;
create policy cc_resource_requests_owner_read on public.resource_requests for select to authenticated using(creator_id=auth.uid() or status='open' or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('super_admin','university_admin','moderator')));
drop policy if exists cc_resource_requests_verified_create on public.resource_requests;
create policy cc_resource_requests_verified_create on public.resource_requests for insert to authenticated with check(creator_id=auth.uid() and public.cc_is_verified());
drop policy if exists cc_resource_requests_owner_update on public.resource_requests;
create policy cc_resource_requests_owner_update on public.resource_requests for update to authenticated using(creator_id=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('super_admin','university_admin','moderator')));
drop policy if exists cc_resource_reports_read on public.resource_reports;
create policy cc_resource_reports_read on public.resource_reports for select to authenticated using(reporter_id=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('super_admin','university_admin','moderator')));
drop policy if exists cc_resource_reports_create on public.resource_reports;
create policy cc_resource_reports_create on public.resource_reports for insert to authenticated with check(reporter_id=auth.uid());
-- Owner-only private collections and notifications.
drop policy if exists cc_collections_owner on public.resource_collections;
create policy cc_collections_owner on public.resource_collections for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists cc_collection_items_owner on public.resource_collection_items;
create policy cc_collection_items_owner on public.resource_collection_items for all to authenticated using(exists(select 1 from public.resource_collections c where c.id=collection_id and c.user_id=auth.uid())) with check(exists(select 1 from public.resource_collections c where c.id=collection_id and c.user_id=auth.uid()));
drop policy if exists cc_resource_notifications_owner on public.resource_notifications;
create policy cc_resource_notifications_owner on public.resource_notifications for all to authenticated using(recipient_id=auth.uid()) with check(recipient_id=auth.uid());

-- Storage bucket for genuinely private resource files. Public approved files are served
-- through a trusted API / signed URLs; never toggle this bucket public.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('academic-resources','academic-resources',false,10485760,array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists cc_academic_upload_own_folder on storage.objects;
create policy cc_academic_upload_own_folder on storage.objects for insert to authenticated with check(bucket_id='academic-resources' and (storage.foldername(name))[1]=auth.uid()::text and public.cc_is_verified());
drop policy if exists cc_academic_read_own_folder on storage.objects;
create policy cc_academic_read_own_folder on storage.objects for select to authenticated using(bucket_id='academic-resources' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists cc_academic_delete_own_folder on storage.objects;
create policy cc_academic_delete_own_folder on storage.objects for delete to authenticated using(bucket_id='academic-resources' and (storage.foldername(name))[1]=auth.uid()::text);

-- Cloudflare Stream video records; actual video bytes are hosted by Stream, not Supabase.
create table if not exists public.user_videos(
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
 provider text not null default 'cloudflare_stream', provider_uid text unique, playback_id text, title text not null default '',
 duration_seconds numeric, width integer, height integer, original_size_bytes bigint check(original_size_bytes is null or original_size_bytes<=104857600),
 status text not null default 'processing' check(status in ('processing','ready','error','deleted')),
 visibility text not null default 'public' check(visibility in ('public','university','private')), created_at timestamptz not null default now(), deleted_at timestamptz
);
create index if not exists user_videos_feed_idx on public.user_videos(created_at desc) where status='ready' and deleted_at is null;
alter table public.user_videos enable row level security;
drop policy if exists cc_videos_read on public.user_videos;
create policy cc_videos_read on public.user_videos for select to authenticated using(deleted_at is null and (owner_id=auth.uid() or (status='ready' and visibility='public')));
drop policy if exists cc_videos_owner_insert on public.user_videos;
create policy cc_videos_owner_insert on public.user_videos for insert to authenticated with check(owner_id=auth.uid() and public.cc_is_verified() and provider='cloudflare_stream' and status='processing' and playback_id is null and original_size_bytes<=104857600);
drop policy if exists cc_videos_owner_update on public.user_videos;
create policy cc_videos_owner_update on public.user_videos for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
drop policy if exists cc_videos_owner_delete on public.user_videos;
create policy cc_videos_owner_delete on public.user_videos for delete to authenticated using(owner_id=auth.uid());

-- NOTE: approve/reject actions for resources and private-community membership should be
-- exposed through server-validated RPCs in the next API/UI layer; never grant users
-- direct ability to set status='approved' or grant themselves privileged member roles.

-- Privileged state transitions: never allow an uploader to self-approve.
create or replace function public.cc_review_academic_resource(p_resource_id uuid,p_decision text,p_reason text default null)
returns void language plpgsql security definer set search_path=public as $$
declare v_role text;
begin
 select role into v_role from public.profiles where id=auth.uid();
 if v_role not in ('super_admin','university_admin','moderator') then raise exception 'Not authorized'; end if;
 if p_decision not in ('approved','rejected','correction_requested') then raise exception 'Invalid decision'; end if;
 update public.academic_resources set status=p_decision,rejection_reason=p_reason,reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now()
 where id=p_resource_id and status in ('pending','correction_requested');
 if not found then raise exception 'Resource is not awaiting review'; end if;
 insert into public.resource_notifications(recipient_id,resource_id,event_type,payload)
 select uploader_id,id,'review_'||p_decision,jsonb_build_object('reason',p_reason) from public.academic_resources where id=p_resource_id;
end $$;
revoke all on function public.cc_review_academic_resource(uuid,text,text) from public;
grant execute on function public.cc_review_academic_resource(uuid,text,text) to authenticated;

create or replace function public.cc_review_community_join_request(p_request_id uuid,p_decision text)
returns void language plpgsql security definer set search_path=public as $$
declare v_community uuid; v_user uuid; v_limit integer; v_count integer;
begin
 if p_decision not in ('approved','rejected') then raise exception 'Invalid decision'; end if;
 select r.community_id,r.user_id,c.max_members into v_community,v_user,v_limit
 from public.community_join_requests r join public.communities c on c.id=r.community_id
 join public.community_members m on m.community_id=c.id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin','moderator')
 where r.id=p_request_id and r.status='pending' for update of r;
 if v_community is null then raise exception 'Request not found or not authorized'; end if;
 if p_decision='approved' then
  select count(*) into v_count from public.community_members where community_id=v_community and status='active';
  if v_limit is not null and v_count>=v_limit then raise exception 'Community member limit reached'; end if;
  insert into public.community_members(community_id,user_id,role,status) values(v_community,v_user,'member','active') on conflict(community_id,user_id) do update set status='active',role='member',joined_at=now();
 end if;
 update public.community_join_requests set status=p_decision,reviewed_by=auth.uid(),reviewed_at=now() where id=p_request_id;
 insert into public.community_notifications(community_id,recipient_id,actor_id,event_type,payload)
 values(v_community,v_user,auth.uid(),'join_request_'||p_decision,jsonb_build_object('request_id',p_request_id));
end $$;
revoke all on function public.cc_review_community_join_request(uuid,text) from public;
grant execute on function public.cc_review_community_join_request(uuid,text) to authenticated;

create or replace function public.cc_change_community_role(p_community_id uuid,p_target_user uuid,p_new_role text)
returns void language plpgsql security definer set search_path=public as $$
declare v_actor_role text;
begin
 if p_new_role not in ('admin','moderator','member','owner') then raise exception 'Invalid role'; end if;
 select role into v_actor_role from public.community_members where community_id=p_community_id and user_id=auth.uid() and status='active';
 if v_actor_role is null then raise exception 'Not a community member'; end if;
 if v_actor_role='owner' then
   if p_new_role='owner' then
     update public.community_members set role='admin' where community_id=p_community_id and user_id=auth.uid();
   end if;
 elsif v_actor_role='admin' then
   if p_new_role='owner' or p_target_user=auth.uid() then raise exception 'Owner-only action'; end if;
 else raise exception 'Owner or admin required'; end if;
 update public.community_members set role=p_new_role where community_id=p_community_id and user_id=p_target_user and status='active';
 if not found then raise exception 'Target member not found'; end if;
 insert into public.community_notifications(community_id,recipient_id,actor_id,event_type,payload)
 values(p_community_id,p_target_user,auth.uid(),'role_changed',jsonb_build_object('role',p_new_role));
end $$;
revoke all on function public.cc_change_community_role(uuid,uuid,text) from public;
grant execute on function public.cc_change_community_role(uuid,uuid,text) to authenticated;

-- Resource owner can edit descriptive metadata, but cannot change review state or ownership.
revoke update on public.academic_resources from authenticated;
grant update(title,description,faculty,department,batch,semester,academic_year,course_code,course_name,course_teacher,category_id,resource_type,cover_key,external_url,source_reference,language,tags,short_notes,visibility,updated_at,deleted_at)
on public.academic_resources to authenticated;
-- Review metadata/status updates are performed only through SECURITY DEFINER RPC.

-- Profile privacy: phone_number is intentionally not selectable by other students.
-- Email addresses remain in auth.users and are never exposed through the public profile table.
revoke select on public.profiles from authenticated;
grant select(id,full_name,university_id,student_status,role,avatar_url,department,batch,created_at)
on public.profiles to authenticated;

-- Public community content is readable by all signed-in users; only active members can interact.
drop policy if exists cc_posts_read on public.community_posts;
create policy cc_posts_read on public.community_posts for select to authenticated using(
 deleted_at is null and exists(select 1 from public.communities c where c.id=community_posts.community_id and (c.community_type='public' or public.cc_is_community_member(c.id)))
);
drop policy if exists cc_comments_member_read on public.community_comments;
create policy cc_comments_member_read on public.community_comments for select to authenticated using(
 exists(select 1 from public.community_posts p join public.communities c on c.id=p.community_id where p.id=community_comments.post_id and (c.community_type='public' or public.cc_is_community_member(c.id)))
);

-- Resource object metadata and version history are visible only to the owner or approved readers.
drop policy if exists cc_resource_files_read on public.resource_files;
create policy cc_resource_files_read on public.resource_files for select to authenticated using(
 exists(select 1 from public.academic_resources r where r.id=resource_files.resource_id and (r.uploader_id=auth.uid() or (r.status='approved' and (r.visibility='public' or (r.visibility='university' and r.university_id=(select university_id from public.profiles where id=auth.uid()))))))
);
drop policy if exists cc_resource_files_insert on public.resource_files;
create policy cc_resource_files_insert on public.resource_files for insert to authenticated with check(
 exists(select 1 from public.academic_resources r where r.id=resource_files.resource_id and r.uploader_id=auth.uid() and r.status='pending')
);
drop policy if exists cc_resource_files_delete on public.resource_files;
create policy cc_resource_files_delete on public.resource_files for delete to authenticated using(
 exists(select 1 from public.academic_resources r where r.id=resource_files.resource_id and r.uploader_id=auth.uid())
);
drop policy if exists cc_resource_versions_read on public.resource_versions;
create policy cc_resource_versions_read on public.resource_versions for select to authenticated using(
 exists(select 1 from public.academic_resources r where r.id=resource_versions.resource_id and (r.uploader_id=auth.uid() or r.status='approved'))
);
drop policy if exists cc_resource_versions_insert on public.resource_versions;
create policy cc_resource_versions_insert on public.resource_versions for insert to authenticated with check(
 uploaded_by=auth.uid() and exists(select 1 from public.academic_resources r where r.id=resource_versions.resource_id and r.uploader_id=auth.uid())
);
drop policy if exists cc_resource_downloads_create on public.resource_downloads;
create policy cc_resource_downloads_create on public.resource_downloads for insert to authenticated with check(
 user_id=auth.uid() and exists(select 1 from public.academic_resources r where r.id=resource_downloads.resource_id and r.status='approved' and (r.visibility='public' or r.university_id=(select university_id from public.profiles where id=auth.uid())))
);
drop policy if exists cc_resource_downloads_owner_read on public.resource_downloads;
create policy cc_resource_downloads_owner_read on public.resource_downloads for select to authenticated using(
 user_id=auth.uid() or exists(select 1 from public.academic_resources r where r.id=resource_downloads.resource_id and r.uploader_id=auth.uid())
);
drop policy if exists cc_request_offers_read on public.resource_request_offers;
create policy cc_request_offers_read on public.resource_request_offers for select to authenticated using(
 offered_by=auth.uid() or exists(select 1 from public.resource_requests q where q.id=resource_request_offers.request_id and q.creator_id=auth.uid())
);
drop policy if exists cc_request_offers_create on public.resource_request_offers;
create policy cc_request_offers_create on public.resource_request_offers for insert to authenticated with check(offered_by=auth.uid() and public.cc_is_verified());

-- The request insert rule supports duplicate prevention at the database layer via normalized title/course.
create unique index if not exists resource_requests_dedupe_idx
on public.resource_requests(creator_id,lower(trim(title)),coalesce(course_code,''),coalesce(semester,''))
where status in ('open','in_progress');

-- Prevent clients from marking an uploaded video ready or changing provider identifiers.
revoke update on public.user_videos from authenticated;
grant update(title,visibility) on public.user_videos to authenticated;
-- Join-request owners may only cancel their own pending request; review is RPC-only.
revoke update on public.community_join_requests from authenticated;
grant update(status) on public.community_join_requests to authenticated;
