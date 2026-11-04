insert into public.universities (name, short_name, domain) values
('ঢাকা বিশ্ববিদ্যালয়','ঢাবি','du.ac.bd'),
('বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয়','বুয়েট','buet.ac.bd'),
('জাহাঙ্গীরনগর বিশ্ববিদ্যালয়','জাবি','juniv.edu'),
('রাজশাহী বিশ্ববিদ্যালয়','রাবি','ru.ac.bd'),
('চট্টগ্রাম বিশ্ববিদ্যালয়','চবি','cu.ac.bd'),
('খুলনা বিশ্ববিদ্যালয়','খুবি','ku.ac.bd'),
('জগন্নাথ বিশ্ববিদ্যালয়','জবি','jnu.ac.bd'),
('নর্থ সাউথ বিশ্ববিদ্যালয়','NSU','northsouth.edu'),
('ব্র্যাক বিশ্ববিদ্যালয়','BRACU','bracu.ac.bd'),
('ইন্ডিপেনডেন্ট ইউনিভার্সিটি, বাংলাদেশ','IUB','iub.edu.bd')
on conflict (name) do nothing;
-- This is a starter list only, not a complete national university registry.
