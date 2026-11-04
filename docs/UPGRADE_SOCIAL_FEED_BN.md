# CampusConnect — Social Feed Update (বাংলা)

এই আপডেটে আগের লগইন/সাইনআপ UI অপরিবর্তিত রাখা হয়েছে। মূল পরিবর্তন হয়েছে লগইন-পরবর্তী হোম ফিড, পোস্ট ইন্টারঅ্যাকশন এবং মোবাইল/ডেস্কটপ বিন্যাসে।

## এই সংস্করণে
- বাস্তব Supabase `posts` টেবিল থেকে বিশ্ববিদ্যালয়ভিত্তিক ফিড লোড হয়; কৃত্রিম demo পোস্ট আর Like/Comment বাটনে দেখানো হয় না।
- পোস্ট লেখার অনুমতি সব লগইন করা সদস্যের জন্য; নিজের বিশ্ববিদ্যালয়ের প্রোফাইল ছাড়া পোস্ট করা যায় না।
- Like/Unlike `post_likes` টেবিলে সংরক্ষিত হয় এবং রিফ্রেশের পর নিজের Like ও মোট Like পুনরায় লোড হয়।
- মন্তব্য `comments` টেবিলে সংরক্ষিত ও তালিকাভুক্ত হয়।
- Share বাটন লিংক শেয়ার/কপি করে এবং `post_shares`-এ শেয়ার ইভেন্ট লিখে।
- ফিডে পোস্ট, Like ও Comment-এর Realtime পরিবর্তন শোনে (Supabase Realtime সক্রিয় থাকলে)।
- গ্রুপ, ব্যক্তিগত মেসেজ, শিক্ষার্থী ডিরেক্টরি ও যাচাইকরণ প্রশাসন আগের মতোই থাকে; গ্রুপ/DM/ডিরেক্টরি verified-only।
- লগইন পেজের বিদ্যমান নকশা অপরিবর্তিত; শুধু লগইন-পরবর্তী ফিডের UI polish করা হয়েছে।

## GitHub-এ আপডেট
1. `app/page.tsx` এবং `app/globals.css` Replace করুন।
2. `supabase/social_feed_upgrade.sql` নতুন ফাইল হিসেবে যোগ করুন।
3. `docs/UPGRADE_SOCIAL_FEED_BN.md` যোগ করুন।
4. অন্য ফাইল, `.env` এবং বিদ্যমান Supabase ডেটা মুছবেন না।
5. Commit করার পর Vercel Deployment `Ready` হওয়া পর্যন্ত অপেক্ষা করুন।

## Supabase Migration
Supabase → SQL Editor → New Query-তে `supabase/social_feed_upgrade.sql`-এর সম্পূর্ণ কোড একবার চালান। এটি বিদ্যমান পোস্ট, প্রোফাইল, ব্যবহারকারী, verification records, group বা messages মুছে না। এটি সাধারণ feed-এ authenticated members-দের Post/Like/Comment অনুমতি দেয়; academic groups, verified student directory ও direct messages-এর verified-only policy বদলায় না।

## গুরুত্বপূর্ণ
- `Success. No rows returned` এই DDL migration-এর স্বাভাবিক সফল ফলাফল হতে পারে।
- Supabase SQL Editor-এ migration চালানো এবং Vercel build সফল হওয়া আলাদা পরীক্ষা।
- `npm run build` চালিয়ে TypeScript/Next.js build যাচাই করুন। এই প্যাকেজ তৈরির পরিবেশে npm dependency install সম্পন্ন করা যায়নি; তাই Vercel-এর `Ready` status না দেখা পর্যন্ত production build নিশ্চিত বলে ধরে নেবেন না।
- Text post, Like/Unlike, Comment, share link, existing group/DM flows এই সংস্করণে অন্তর্ভুক্ত। Image/video upload, story, video/audio calls, full notification centre, moderation/report queue ও advanced academic resource library এখনো সম্পূর্ণ production feature নয়।
