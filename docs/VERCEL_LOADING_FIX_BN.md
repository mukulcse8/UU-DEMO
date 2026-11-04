# Vercel-এ শুধু Loading দেখালে করণীয়

এই আপডেটে অ্যাপের startup/auth initialization পরিবর্তন করা হয়েছে:

- Supabase `getUser()`-এর বদলে দ্রুত session restore-এর জন্য `getSession()` ব্যবহার করা হয়েছে।
- Profile query শেষ না হওয়া পর্যন্ত পুরো অ্যাপকে loading screen-এ আটকে রাখা হয় না।
- Supabase startup request ১২ সেকেন্ডেও উত্তর না দিলে loading screen সরিয়ে ব্যবহারযোগ্য error message দেখানো হয়।
- Network/auth initialization error catch করা হয়, ফলে unhandled rejection-এর কারণে অনন্ত loading হওয়ার ঝুঁকি কমে।
- Supabase environment variables না থাকলে সেটি স্পষ্টভাবে জানানো হয়।

## Vercel Environment Variables

Vercel Dashboard → Project → Settings → Environment Variables-এ নিচের দুটি variable যোগ করো:

- `NEXT_PUBLIC_SUPABASE_URL` = Supabase Project Settings → API → Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Supabase Project Settings → API Keys → anon/public key (legacy project হলে anon key)

দুটি variable-ই Production, Preview এবং Development environment-এ প্রয়োজন অনুযায়ী নির্বাচন করো। Save করার পর Deployments থেকে নতুন Deployment করো (Redeploy)। Environment Variable পরিবর্তন পুরোনো deployment-এ প্রয়োগ হয় না।

## Supabase Auth URL Configuration

Supabase Dashboard → Authentication → URL Configuration:

- Site URL: তোমার Vercel production domain, যেমন `https://your-project.vercel.app`
- Redirect URLs: `https://your-project.vercel.app/**`
- Custom domain থাকলে সেটিও Redirect URLs-এ যোগ করো।

## যদি এখনও Loading বা error থাকে

Vercel → Project → Deployments → সর্বশেষ deployment → Build Logs এবং Runtime Logs থেকে প্রথম লাল error line কপি করো। Browser-এ F12 → Console এবং Network → `auth/v1` request-এর status-ও দেখো। `401` হলে key/URL বা Auth configuration, `404` হলে URL, `Failed to fetch` হলে URL/DNS/network/CORS configuration পরীক্ষা করতে হবে।

নোট: এই source patch startup-এর অনন্ত loading আটকায়; কিন্তু ভুল Supabase URL/key, Supabase project pause, ভুল database schema/RLS বা deployment build error নিজে থেকে ঠিক করতে পারে না।
