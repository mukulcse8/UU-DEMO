# CampusConnect আপডেট — ধাপে ধাপে

১. ZIP Extract করুন।
২. `CampusConnect` ফোল্ডারের ভেতরের সব ফাইল ও ফোল্ডার আগের GitHub repository-তে আপলোড করে পুরোনো ফাইল replace করুন। `package.json` repository root-এ থাকতে হবে।
৩. Commit করুন এবং Vercel deployment সফল হওয়া পর্যন্ত অপেক্ষা করুন।
৪. Supabase → SQL Editor → New query খুলে `supabase/verification_upgrade.sql`-এর সম্পূর্ণ SQL একবার Run করুন।
৫. `schema.sql` বা `seed.sql` আবার চালাবেন না।
৬. `docs/MAKE_FIRST_ADMIN.sql`-এ নিজের লগইন ইমেইল বসিয়ে Supabase SQL Editor-এ Run করুন।
৭. CampusConnect থেকে sign out করে আবার sign in করুন। এরপর বাম মেনুতে **যাচাইকরণ প্রশাসন** দেখা যাবে।
৮. শিক্ষার্থী লগইন করে পরিচয়পত্র অথবা বিশ্ববিদ্যালয়ের মিল থাকা নিশ্চিত ইমেইল দিয়ে আবেদন করতে পারবে।

এই আপডেট বর্তমান profiles, auth users, universities, posts বা comments মুছে না। SQL migration সফল হওয়ার আগে নতুন verification workflow কাজ করবে না।
