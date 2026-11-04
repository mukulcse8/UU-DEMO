# CampusConnect — আপডেট প্যাকেজের বাস্তব অবস্থা

এই প্যাকেজটি বিদ্যমান CampusConnect সোর্সের উপর additive update। Login/Signup flow এবং পুরোনো মূল ফিচার/টেবিল মুছে বা rename করা হয়নি।

## এই প্যাকেজে থাকা পরিবর্তন
- Existing authentication এবং verification flow রাখা হয়েছে।
- সব signed-in page-এ unverified account-এর জন্য verification reminder দেখানো হয়; profile heading-এর নিচেও reminder আছে।
- Unverified user-এর University Directory route ও navigation বন্ধ; verified user-এর জন্য খোলা।
- Verified user-এর জন্য Academic Library ও Communities hub যুক্ত।
- Community schema: public/private/hidden type, membership roles, join request, posts/comments/reactions, invitation expiry/use limits, reports, notifications এবং moderation log-এর additive SQL.
- Academic resource-এর category, upload metadata, pending/approved workflow, version/review/comment/favorite/request/notification schema.
- Private Supabase Storage bucket/policies-এর SQL setup.
- `.env.example`, installation guide, deployment guide, test report.

## এখনো অসম্পূর্ণ / এই ZIP-এ wired নয়
নিচের বিষয়গুলোকে সম্পন্ন বলা হচ্ছে না:
- ImageKit, Cloudflare R2 এবং DeepStorage/অন্য ভিডিও host-এর বাস্তব API integration.
- Server-side image/document/video transcoding বা 90% size reduction. 90% কমানো সব ফাইলের ক্ষেত্রে মান/রেজোলিউশন না কমিয়ে নিশ্চিত করা সম্ভব নয়; source ও output size আলাদা করে মাপা এবং ফাইলভেদে compression policy দরকার।
- সম্পূর্ণ Facebook/Instagram-style responsive redesign of every legacy page.
- Full English-default/Bangla language dictionary across all existing screens.
- Complete Connect/Follow UI and student directory actions.
- Full community management dashboard, role changes, invitation acceptance flow, event UI, moderation actions and all realtime notification events.
- Complete Academic Library: all advanced filters, typo-tolerant/Bangla-English semantic search, PDF inline viewer, ratings/helpful votes, comments/replies, collections, download/view analytics, request offers, admin/moderator workflows, copyright workflows.
- Production API routes for rate limiting, malware scanning, duplicate hashing and signed external-storage URLs.
- Supabase migration has not been applied to your live project. RLS/Storage policies need validation against the actual current database before deployment.

## Compatibility / safety
- Migration is additive and does not intentionally drop or rename existing tables/columns.
- Do not expose Supabase service-role key or provider secrets in frontend code.
- Existing login/signup UI code was preserved in the prior source update; do not replace it manually.
- Run the SQL migration only after backing up the Supabase project and reviewing the live schema.

## Verification performed
- TypeScript/TSX syntax transpilation check: passed for `app/page.tsx`, `app/components/ExpansionHub.tsx`, `app/layout.tsx`.
- Full `npm run typecheck`: not verified because dependencies were not installed in this environment.
- Next.js production build: not run.
- Supabase SQL execution, RLS adversarial tests, storage access tests and end-to-end browser tests: not run.
