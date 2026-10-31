import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const SIGNING_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || "propcare_nw_secure_storage_token_key_2026";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bucket = searchParams.get("bucket") || "inspection-images";
    const relativePath = searchParams.get("path") || "";
    const expires = parseInt(searchParams.get("expires") || "0", 10);
    const sig = searchParams.get("sig") || "";

    if (!relativePath || !expires || !sig) {
      return new NextResponse("Invalid signed URL parameters", { status: 400 });
    }

    // Security check: Directory traversal prevention
    if (relativePath.includes("..") || relativePath.startsWith("/") || relativePath.startsWith("\\")) {
      return new NextResponse("Illegal storage path traversal attempt", { status: 403 });
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (now > expires) {
      return new NextResponse("Signed URL has expired. Please refresh the inspection page to obtain a newly signed token.", { status: 403 });
    }

    // Verify HMAC-SHA256 signature
    const dataToSign = `${bucket}:${relativePath}:${expires}`;
    const expectedSig = crypto
      .createHmac("sha256", SIGNING_SECRET)
      .update(dataToSign)
      .digest("hex");

    if (sig !== expectedSig) {
      return new NextResponse("Signature verification failed. Access denied to private storage artifact.", { status: 403 });
    }

    // Resolve file from storage directory
    const filePath = path.join(process.cwd(), "public", "uploads", "storage", bucket, relativePath);

    if (!fs.existsSync(filePath)) {
      return new NextResponse("Requested evidence file not found on storage substrate.", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();

    let contentType = "application/octet-stream";
    if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".webp") contentType = "image/webp";
    else if (ext === ".wav") contentType = "audio/wav";
    else if (ext === ".mp3") contentType = "audio/mpeg";
    else if (ext === ".m4a") contentType = "audio/mp4";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600, immutable",
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (err: unknown) {
    console.error("Signed URL resolver failure:", err);
    return new NextResponse("Failed to resolve signed storage artifact.", { status: 500 });
  }
}

