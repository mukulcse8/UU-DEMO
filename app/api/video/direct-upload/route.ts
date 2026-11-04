import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const streamToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;
    if (!supabaseUrl || !anonKey || !accountId || !streamToken) {
      return NextResponse.json({ error: "Video service is not configured. Add the server environment variables." }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("student_status").eq("id", user.id).single();
    if (profileError || profile?.student_status !== "verified") {
      return NextResponse.json({ error: "Verified students only" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const size = Number(body?.size);
    const title = String(body?.title || "").slice(0, 160);
    if (!Number.isFinite(size) || size <= 0 || size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: "Video must be 100 MB or smaller" }, { status: 400 });
    }

    const cfResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${streamToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ maxDurationSeconds: 180, requireSignedURLs: true, meta: { ownerId: user.id, title } }),
      cache: "no-store",
    });
    const result = await cfResponse.json();
    if (!cfResponse.ok || !result?.success || !result?.result?.uid || !result?.result?.uploadURL) {
      return NextResponse.json({ error: "Unable to create secure video upload", details: result?.errors?.[0]?.message }, { status: 502 });
    }

    const { error: insertError } = await supabase.from("user_videos").insert({
      owner_id: user.id, provider: "cloudflare_stream", provider_uid: result.result.uid,
      title, original_size_bytes: size, status: "processing", visibility: "public"
    });
    if (insertError) {
      // The upload URL has not been returned to the browser yet; do not proceed with an untracked upload.
      return NextResponse.json({ error: "Could not create video record", details: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ uploadURL: result.result.uploadURL, videoId: result.result.uid }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unexpected video upload error" }, { status: 500 });
  }
}
