import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const SIGNING_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || "propcare_nw_secure_storage_token_key_2026";

/**
 * Generates a secure, time-limited signed URL for a private storage artifact.
 * Works with Supabase Storage when configured, or internal HMAC-signed URLs.
 */
export async function getSignedUrlForPath(
  bucket: "inspection-images" | "acoustic-recordings" | "contractor-documents",
  storagePath: string,
  expiresInSeconds: number = 86400
): Promise<string> {
  if (!storagePath) return "";

  // 1. If Supabase is configured, request fresh signed URL
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, expiresInSeconds);

      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
    } catch (err) {
      console.warn("Supabase createSignedUrl error; falling back to internal signed URL resolver", err);
    }
  }

  // 2. Client-side browser vs Node server check
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // If on server side, we can compute the HMAC signature directly
  if (typeof window === "undefined") {
    try {
      // Dynamic import to avoid bundling crypto in client
      const crypto = await import("crypto");
      const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
      const dataToSign = `${bucket}:${storagePath}:${expires}`;
      const signature = crypto
        .createHmac("sha256", SIGNING_SECRET)
        .update(dataToSign)
        .digest("hex");

      return `${baseUrl}/api/storage/signed?bucket=${encodeURIComponent(
        bucket
      )}&path=${encodeURIComponent(storagePath)}&expires=${expires}&sig=${signature}`;
    } catch {
      // Fallback
    }
  }

  // In browser: call the lightweight signing API route or return existing URL
  return `${baseUrl}/api/storage/signed-token?bucket=${encodeURIComponent(
    bucket
  )}&path=${encodeURIComponent(storagePath)}`;
}

