-- Run this ONCE in Supabase SQL Editor as the project owner.
-- Replace the email below with the exact email of YOUR trusted CampusConnect account.
-- Do not expose this SQL or grant super_admin to an untrusted account.
update public.profiles
set role = 'super_admin'
where id = (
  select id from auth.users
  where lower(email) = lower('REPLACE-WITH-YOUR-LOGIN-EMAIL')
)
and exists (
  select 1 from auth.users
  where lower(email) = lower('REPLACE-WITH-YOUR-LOGIN-EMAIL')
);

-- Verify that exactly your account has the role:
select p.full_name, u.email, p.role
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) = lower('REPLACE-WITH-YOUR-LOGIN-EMAIL');
