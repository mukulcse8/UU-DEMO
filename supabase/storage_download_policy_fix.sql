-- CampusConnect storage download policy correction
-- Run once in Supabase SQL Editor after campusconnect_expansion.sql.
-- Keeps academic-resources private while allowing downloads of approved resources
-- only when their visibility permits access to the signed-in student.

drop policy if exists cc_academic_read_own_folder on storage.objects;
drop policy if exists cc_academic_read_authorized_resource on storage.objects;

create policy cc_academic_read_authorized_resource
on storage.objects for select to authenticated
using (
  bucket_id = 'academic-resources'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1
      from public.academic_resources r
      where r.file_key = storage.objects.name
        and r.status = 'approved'
        and r.deleted_at is null
        and (
          r.visibility = 'public'
          or (
            r.visibility = 'university'
            and r.university_id = (
              select p.university_id from public.profiles p where p.id = auth.uid()
            )
          )
        )
    )
  )
);

-- Existing upload/delete policies remain restricted to the owner's UID folder.
