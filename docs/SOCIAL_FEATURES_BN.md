# CampusConnect Social Features Update

## What changed
- Dashboard keeps its existing visual identity and responsive layout.
- Added profile shortcut and editable profile details.
- Added verified-student directory, university groups, group chat, and direct messages.
- Added post likes, comments, and native share / link-copy action.
- Verification-only navigation stays hidden until `profiles.student_status = 'verified'`.

## Required Supabase migration
1. Open Supabase > SQL Editor.
2. Open `supabase/social_features_upgrade.sql` from this project.
3. Copy all SQL and run it once.
4. Wait for successful completion.

Do not rerun the original schema or delete existing tables/data.

## GitHub update
Replace the existing `app/page.tsx` and `app/globals.css`, and add `supabase/social_features_upgrade.sql` plus this documentation file. Keep the existing `package.json`, `lib`, `app/layout.tsx`, environment settings, and all existing Supabase data.

## Important limitations
- Post image/file attachments, push notifications, audio/video calls, and a full admin moderation console are not part of this update.
- Direct and group messages are stored in Supabase; this first implementation loads message history when a conversation is opened. Realtime message delivery and read receipts can be added in a later update.
- The app still requires Supabase Realtime and RLS configuration to be tested before public launch.
