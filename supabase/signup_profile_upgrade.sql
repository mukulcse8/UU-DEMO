-- CampusConnect profile phone field and signup metadata support.
-- Run once in Supabase SQL Editor after uploading the updated app.
alter table public.profiles add column if not exists phone_number text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, university_id, phone_number, student_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'New student'),
    nullif(new.raw_user_meta_data ->> 'university_id', '')::uuid,
    nullif(new.raw_user_meta_data ->> 'phone_number', ''),
    case when new.email_confirmed_at is not null then 'email_verified' else 'pending' end
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        university_id = coalesce(public.profiles.university_id, excluded.university_id),
        phone_number = coalesce(public.profiles.phone_number, excluded.phone_number);
  return new;
end;
$$;
