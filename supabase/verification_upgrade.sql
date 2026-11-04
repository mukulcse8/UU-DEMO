-- CampusConnect verification workflow upgrade.
-- Safe for the existing MVP database: does not drop or recreate user data.
-- Run ONCE in Supabase SQL Editor after deploying the updated app.

-- Private bucket for student evidence. Existing bucket settings are kept private.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verification-documents', 'verification-documents', false, 5242880,
        array['image/jpeg','image/png','application/pdf'])
on conflict (id) do update
set public = false, file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg','image/png','application/pdf'];

-- SECURITY DEFINER helper avoids recursive RLS checks on profiles.
create or replace function public.is_campus_reviewer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('super_admin','university_admin','moderator')
  );
$$;
revoke all on function public.is_campus_reviewer() from public;
grant execute on function public.is_campus_reviewer() to authenticated;

-- Remove broad policies from the starter schema that could allow self-approval.
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can create own profile" on public.profiles;
drop policy if exists "Users can read own verification records" on public.verification_documents;
drop policy if exists "Users can submit own verification records" on public.verification_documents;

-- Users can read their own profile / same-university profiles. Admins can review all profiles.
drop policy if exists "Admins can read profiles for review" on public.profiles;
create policy "Admins can read profiles for review" on public.profiles
for select to authenticated
using (public.is_campus_reviewer());

-- Only the owner may see their submissions; authorized reviewers may see pending submissions.
drop policy if exists "Owner and reviewers can read verification submissions" on public.verification_documents;
create policy "Owner and reviewers can read verification submissions" on public.verification_documents
for select to authenticated
using (
  user_id = auth.uid()
  or public.is_campus_reviewer()
);

drop policy if exists "Students can submit pending verification only" on public.verification_documents;
create policy "Students can submit pending verification only" on public.verification_documents
for insert to authenticated
with check (
  user_id = auth.uid()
  and status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
  and (
    storage_path like (auth.uid()::text || '/%')
    or storage_path like 'email-confirmed:%'
  )
);

-- Private Storage: a student can upload/read only inside their own UID folder.
drop policy if exists "Students upload own verification files" on storage.objects;
create policy "Students upload own verification files" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'verification-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Owners and reviewers read verification files" on storage.objects;
create policy "Owners and reviewers read verification files" on storage.objects
for select to authenticated
using (
  bucket_id = 'verification-documents'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_campus_reviewer()
  )
);

-- The only client-callable approval route. Role and target state are checked in the database.
create or replace function public.review_student_verification(
  p_document_id uuid,
  p_decision text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select role into v_role from public.profiles where id = auth.uid();
  if v_role not in ('super_admin','university_admin','moderator') then
    raise exception 'Not authorized to review student applications';
  end if;

  if p_decision not in ('approved','rejected') then
    raise exception 'Invalid review decision';
  end if;

  select user_id into v_user_id
  from public.verification_documents
  where id = p_document_id and status = 'pending'
  for update;

  if v_user_id is null then
    raise exception 'Pending application not found';
  end if;

  update public.verification_documents
  set status = p_decision, reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_document_id;

  update public.profiles
  set student_status = case when p_decision = 'approved' then 'verified' else 'rejected' end
  where id = v_user_id;
end;
$$;

revoke all on function public.review_student_verification(uuid,text) from public;
revoke all on function public.review_student_verification(uuid,text) from anon;
grant execute on function public.review_student_verification(uuid,text) to authenticated;

-- IMPORTANT: assign the first super_admin manually using the separate
-- docs/MAKE_FIRST_ADMIN.sql template while signed into the trusted SQL Editor.
