# CampusConnect — Verification Upgrade

This update adds a student verification workflow to the existing Next.js + Supabase MVP while preserving existing users and data.

## New features
- Student ID / enrollment proof upload (JPG, PNG, PDF; maximum 5 MB).
- University-email proof request when the signed-in email domain matches the university domain stored in `universities.domain`.
- Private Supabase Storage bucket for evidence; no public document URLs.
- Admin review screen with signed, short-lived document viewing links.
- Database RPC performs approve/reject decisions and updates the student's status.
- Posts remain blocked until `profiles.student_status = 'verified'`.
- Self-service profile insert/update policies from the starter schema are removed by the migration so users cannot grant themselves verified/admin status.

## Important: this is still an MVP
Messaging, live calls, likes, functional comments, push notifications, moderation tooling, complete national university directory, and production operational controls are not implemented. The admin review feature is functional after the one-time setup below. Do not advertise the app as production-ready until RLS and abuse/security testing are completed.

## Existing project deployment update (no local Node.js required)
1. Extract this ZIP on your computer.
2. Open the extracted `CampusConnect` folder.
3. In your existing **private GitHub repository**, upload/replace the files and folders from inside `CampusConnect` (do not upload the outer folder itself). Keep `package.json` at the repository root.
4. Commit the changes.
5. Vercel should start a new deployment from the connected repository. Keep the existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variables. Do not replace them with a secret/service-role key.
6. Wait for the deployment to finish successfully.

## One-time Supabase upgrade — do not rerun the original schema
After the new Vercel deployment succeeds:
1. Open Supabase → SQL Editor → New query.
2. Open `supabase/verification_upgrade.sql` from this ZIP, copy the complete contents, paste into SQL Editor and click Run.
3. This migration creates the private `verification-documents` bucket, adds storage rules and a secure review function, and removes unsafe self-update/self-insert profile policies. It does not delete existing accounts, profiles, universities, posts, or comments.
4. Do **not** run `schema.sql` or `seed.sql` again. Your existing database already has them.

## Make your own account the first administrator
The administrator screen is hidden until a trusted account has an admin role.
1. In Supabase → Table Editor → `profiles`, confirm your own account exists and note the email you used to log in.
2. Open `docs/MAKE_FIRST_ADMIN.sql`.
3. Replace both instances of `REPLACE-WITH-YOUR-LOGIN-EMAIL` with your exact login email.
4. Run that SQL in Supabase SQL Editor.
5. Check the result: your account should show `role = super_admin`.
6. Sign out of CampusConnect and sign in again, then open **যাচাইকরণ প্রশাসন**.

Only grant `super_admin` to an account you control. Never add a service-role/secret key to Vercel `NEXT_PUBLIC_` variables or browser code.

## Student workflow
1. Student signs up and confirms their email.
2. Student signs in.
3. On the feed page, they can submit a matching university email proof or upload a student ID / enrollment document.
4. An authorized reviewer opens the admin tab, views the proof, then approves or rejects it.
5. Approval sets the profile status to `verified`; rejection sets it to `rejected`.
6. Only verified students can create posts/comments under the database policies.

University email domain matching is only a screening signal, not conclusive proof of current enrollment; an administrator still reviews the request. Keep the Storage bucket private and review documents only when necessary.

## Existing environment variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (a Supabase publishable key is accepted by the Supabase JS client)


## UI / sign-in update
- Logged-out visitors are shown a dedicated login screen; the application itself is gated until sign-in.
- Signup is a separate screen and collects full name, university, university email, phone number and password.
- Student ID verification remains a separate post-signup step. Only verified students see class-group / academic-resource navigation.
- A blue verification check is shown beside the account name when `student_status = verified`.

### One-time database update
After uploading the files, run `supabase/signup_profile_upgrade.sql` once in Supabase SQL Editor to add the phone number field and save signup phone metadata. Do not rerun the original schema or verification migration.


## Expansion update

See `docs/CAMPUSCONNECT_EXPANSION_STATUS_BN.md` and `docs/EXPANSION_INSTALLATION_BN.md` for the exact implemented scope and remaining production work. Apply `supabase/campusconnect_expansion_v1.sql` only on a reviewed staging database first.

## UI language and appearance

The application now opens in English by default. Signed-in users can open **Settings** to switch between English and Bangla, choose Light/Dark/System appearance, and log out. These preferences are saved in the browser. See `docs/UI_LANGUAGE_THEME_UPDATE.md` for implementation and validation notes.


## Vercel loading-screen fix
If the deployed app remains on the loading screen, follow `docs/VERCEL_LOADING_FIX_BN.md`. The startup flow now restores the Supabase session without waiting for the profile query, catches initialization errors, and exits the loading screen after a 12-second timeout with a diagnostic message.
