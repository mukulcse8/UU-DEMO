-- CampusConnect MVP schema. Run in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.universities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  short_name text not null,
  domain text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  university_id uuid references public.universities(id),
  student_status text not null default 'pending'
    check (student_status in ('pending','email_verified','document_submitted','verified','rejected')),
  role text not null default 'student'
    check (role in ('student','moderator','university_admin','super_admin')),
  avatar_url text,
  department text,
  batch text,
  created_at timestamptz not null default now()
);

create table if not exists public.verification_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  document_type text not null check (document_type in ('student_id','enrollment_letter','other')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  university_id uuid not null references public.universities(id),
  content text not null check (char_length(content) between 1 and 5000),
  visibility text not null default 'university' check (visibility in ('university','public')),
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists posts_university_created_idx on public.posts(university_id, created_at desc);
create index if not exists comments_post_created_idx on public.comments(post_id, created_at);

alter table public.universities enable row level security;
alter table public.profiles enable row level security;
alter table public.verification_documents enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;

create policy "Active universities are readable" on public.universities
for select using (is_active = true);

create policy "Users can read own profile and same-university profiles"
on public.profiles for select to authenticated
using (id = auth.uid() or university_id = (select p.university_id from public.profiles p where p.id = auth.uid()));

create policy "Users can create own profile"
on public.profiles for insert to authenticated
with check (id = auth.uid());

create policy "Users can update own profile"
on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

create policy "Users can read own verification records"
on public.verification_documents for select to authenticated
using (user_id = auth.uid());

create policy "Users can submit own verification records"
on public.verification_documents for insert to authenticated
with check (user_id = auth.uid());

create policy "Authenticated users can read university feed"
on public.posts for select to authenticated
using (
  visibility = 'public'
  or university_id = (select p.university_id from public.profiles p where p.id = auth.uid())
);

create policy "Verified students can create posts"
on public.posts for insert to authenticated
with check (
  author_id = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid()
    and p.university_id = posts.university_id and p.student_status = 'verified')
);

create policy "Authors can delete own posts"
on public.posts for delete to authenticated using (author_id = auth.uid());

create policy "Comments readable when parent post readable"
on public.comments for select to authenticated
using (exists (select 1 from public.posts p where p.id = comments.post_id));

create policy "Verified students can comment"
on public.comments for insert to authenticated
with check (author_id = auth.uid() and exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.student_status = 'verified'
));

-- Create the storage bucket manually in Supabase Storage:
-- Bucket name: verification-documents; Private: ON.
-- Never expose student ID files through public URLs.


-- Automatically create a pending student profile after Supabase Auth signup.
-- university_id must be a real UUID from public.universities.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, university_id, student_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'New student'),
    nullif(new.raw_user_meta_data ->> 'university_id', '')::uuid,
    case when new.email_confirmed_at is not null then 'email_verified' else 'pending' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
