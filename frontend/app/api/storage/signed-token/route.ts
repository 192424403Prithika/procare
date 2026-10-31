import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const SIGNING_SECRET = process.env.PROPCARE_STORAGE_SECRET || "propcare_nw_secure_storage_token_key_2026";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bucket = searchParams.get("bucket") || "inspection-images";
    const relativePath = searchParams.get("path") || "";

    if (!relativePath) {
      return NextResponse.json({ success: false, error: "Missing storage path" }, { status: 400 });
    }

    const expires = Math.floor(Date.now() / 1000) + 86400; // 24 hours
    const dataToSign = `${bucket}:${relativePath}:${expires}`;
    const signature = crypto
      .createHmac("sha256", SIGNING_SECRET)
      .update(dataToSign)
      .digest("hex");

    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const signedUrl = `${protocol}://${host}/api/storage/signed?bucket=${encodeURIComponent(
      bucket
    )}&path=${encodeURIComponent(relativePath)}&expires=${expires}&sig=${signature}`;

    return NextResponse.json({ success: true, signedUrl });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error creating signed token";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

