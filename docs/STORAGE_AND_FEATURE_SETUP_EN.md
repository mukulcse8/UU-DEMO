# CampusConnect expansion setup (English)

## Video provider decision
The DeepStorage API dependency has been replaced with **Cloudflare Stream**. It supports direct creator uploads, server-side API credentials, transcoding and adaptive playback. It is not an unlimited/free storage service: current published pricing is based on minutes stored and delivered. See https://developers.cloudflare.com/stream/pricing/ .

The new route `POST /api/video/direct-upload` verifies the Supabase bearer session and `profiles.student_status = verified`, enforces a 100 MB declared upload limit, creates the Cloudflare Stream direct-upload URL server-side, and creates an ownership row before returning the URL. The browser must upload directly to the returned URL; never send the Stream API token to the browser. The route does not yet implement the client Reels uploader or provider webhook that marks videos `ready`; those are required before public release.

## Compression policy
- Images: ImageKit delivery transformations (WebP/AVIF, quality auto, responsive width) should be used. Do not overwrite originals unless the product owner explicitly chooses destructive optimization.
- Documents: R2 object storage; optimize PDF/Office assets where a safe server-side optimizer is available. Do not promise 90% savings for every file.
- Videos: Cloudflare Stream performs transcoding and adaptive delivery. Resolution is retained where supported, but bitrate/codec changes mean the output is not byte-identical. A 90% byte reduction is not guaranteed; compare actual source and delivered rendition sizes where available.
- Maximum accepted source file size: 10 MiB for academic resource documents; 100 MiB for user videos. Server-side validation must check actual bytes, MIME, extension and ownership, not only browser metadata.

## Apply database migration
Run existing migrations in the order already documented in `README.md`, then run `supabase/campusconnect_expansion.sql` in Supabase SQL Editor. This is additive and does not drop/rename old tables or columns. Review the SQL in a staging project first. This migration creates the community, student connection, academic resource and video metadata tables, indexes, initial RLS and a private `academic-resources` bucket.

Important: the SQL migration is the data/security foundation, not a completed frontend. Community approval/role-change RPCs, invitation token redemption, moderator workflows, resource approval RPCs, signed R2 URLs, ImageKit signing, Cloudflare webhooks and full UI wiring still need to be implemented and tested before production use. Direct table writes cannot be used to approve a resource or elevate a community role.

## Environment variables
Copy `.env.example` values into Vercel Project → Settings → Environment Variables. Never commit real values. Keep all provider credentials server-side (no `NEXT_PUBLIC_` prefix). Existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` remain public client configuration only.

## File ownership
Resource owner edit/delete is enforced by RLS on `academic_resources` and owner-folder policies for the Supabase private bucket. R2/ImageKit objects must additionally be modified through server routes that verify `uploader_id`/`owner_id` against the authenticated user. Do not issue public permanent URLs for private resources.

## Deployment status
A successful Next.js build and a live Supabase staging test are required. Provider API credentials are not included in the source archive and live provider operations cannot be verified without credentials.
