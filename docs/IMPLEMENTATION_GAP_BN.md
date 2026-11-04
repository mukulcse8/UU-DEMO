# পূর্ণ চাহিদা বনাম বর্তমান বাস্তবায়ন

এই ফাইলটি ইচ্ছাকৃতভাবে রাখা হয়েছে যাতে অসম্পূর্ণ ফিচারকে সম্পন্ন বলে ভুল না হয়।

| ক্ষেত্র | বর্তমান অবস্থা |
|---|---|
| Login / Signup | Existing flow রাখা হয়েছে |
| Verification reminder | Signed-in pages-এ; profile heading-এও |
| Verified-only University Directory | Navigation ও route gate |
| Student search | Existing verified-only entry point; Connect/Follow সম্পূর্ণ নয় |
| Community | Basic discovery/create/join request UI; পূর্ণ role/moderation workflow বাকি |
| Academic Library | Basic upload, pending review, approved listing/download, own resource delete |
| Academic schema | Additive schema আছে; পূর্ণ feature coverage নয় |
| ImageKit / R2 / Video host | Environment placeholders only; integration বাকি |
| Compression/transcoding | Implemented নয় |
| English default + Bangla switch | সম্পূর্ণ implement করা হয়নি |
| Realtime notifications | Schema আছে; পূর্ণ event wiring বাকি |
| Production verification | Build, DB migration ও E2E tests বাকি |

## প্রয়োজনীয় পরবর্তী বাস্তব কাজ
1. Supabase live schema-এর সঙ্গে migration diff করে staging project-এ apply করা।
2. Community ও resource-এর প্রতিটি action-এর server-side authorization এবং RLS negative tests।
3. Storage provider adapter + signed upload/download APIs implement করা।
4. Media processing worker/queue এবং output-size/quality measurement implement করা।
5. UI modules-কে সম্পূর্ণ workflow অনুযায়ী তৈরি ও legacy flows-এর regression tests চালানো।
6. English/Bangla message dictionary সব page-এ প্রয়োগ করা।
