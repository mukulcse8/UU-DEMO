# Expansion Setup (বাংলা)

1. আগে মূল Supabase project/database backup নিন।
2. আলাদা Supabase Staging Project-এ বর্তমান `supabase/schema.sql`, `signup_profile_upgrade.sql`, `verification_upgrade.sql`, `social_features_upgrade.sql`, `social_feed_upgrade.sql` ইতিমধ্যে কীভাবে প্রয়োগ হয়েছে তা যাচাই করুন। পুরোনো SQL অন্ধভাবে আবার চালাবেন না।
3. Staging-এ schema compatibility যাচাই করে `supabase/campusconnect_expansion_v1.sql` চালান। Migration-টি additive; তবু live DB-তে চালানোর আগে DBA review আবশ্যক।
4. Supabase Storage-এ `campus-private` private bucket migration তৈরি করে। Storage policies-ও migration-এ আছে।
5. `.env.example` কপি করে local `.env.local` তৈরি করুন এবং Supabase URL/anon key বসান। Secret GitHub-এ commit করবেন না।
6. `npm install`, `npm run typecheck`, `npm run build` চালান। এই build environment-এ npm install timeout হওয়ায় build result যাচাই করা যায়নি।
7. Staging-এ verified student এবং unverified student—দুই ধরনের test account দিয়ে RLS ও upload/download পরীক্ষা করুন।
8. সব regression/security test পাস না করা পর্যন্ত production project-এ deploy করবেন না।

## Current resource upload behavior
- Verified student ছাড়া নতুন Resource upload করতে পারে না।
- Browser-side 10 MB limit ও MIME allowlist আছে।
- File `campus-private` private bucket-এ UID folder-এর অধীনে upload হয়।
- Resource status `pending`; approved resource-ই library list-এ আসে।
- Owner নিজের resource soft-delete করতে পারে।
- Approved resource download authenticated Storage RLS দ্বারা নিয়ন্ত্রিত।

## সতর্কতা
এই build-এ R2/ImageKit/Video streaming/FFmpeg pipeline, complete community moderation/invitations, full bilingual translation, realtime notification producers এবং complete resource workflow এখনো wired হয়নি। Environment variables placeholders থাকা মানে integration সম্পন্ন নয়।
