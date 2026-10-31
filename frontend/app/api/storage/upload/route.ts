import { NextRequest, NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const SIGNING_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || "propcare_nw_secure_storage_token_key_2026";
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_DOC_SIZE = 20 * 1024 * 1024; // 20 MB

const ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
];

const ALLOWED_DOC_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const ALLOWED_AUDIO_MIMES = [
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/webm",
  "audio/ogg",
  "audio/aac",
];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bucket = (formData.get("bucket") as string) || "inspection-images";
    const propertyId = (formData.get("propertyId") as string) || "PROP-GENERAL";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file was uploaded in request payload." },
        { status: 400 }
      );
    }

    const mimeType = file.type.toLowerCase();
    const fileName = file.name || "evidence_capture";
    const ext = fileName.split(".").pop()?.toLowerCase() || (bucket === "acoustic-recordings" ? "wav" : "jpg");

    // 1. Validate File Types & Sizes
    if (bucket === "inspection-images") {
      const isValidImage =
        ALLOWED_IMAGE_MIMES.includes(mimeType) ||
        Boolean(fileName.match(/\.(jpg|jpeg|png|webp|heic)$/i));

      if (!isValidImage) {
        return NextResponse.json(
          {
            success: false,
            error: `Unsupported image format (${mimeType || ext}). Only JPEG, JPG, PNG, and WebP photographs are permitted.`,
          },
          { status: 415 }
        );
      }

      if (file.size > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          {
            success: false,
            error: `Image file size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds statutory 20 MB limit.`,
          },
          { status: 413 }
        );
      }
    } else if (bucket === "acoustic-recordings") {
      const isValidAudio =
        ALLOWED_AUDIO_MIMES.includes(mimeType) ||
        Boolean(fileName.match(/\.(wav|mp3|mp4|m4a|webm|ogg|aac)$/i));

      if (!isValidAudio) {
        return NextResponse.json(
          {
            success: false,
            error: `Unsupported acoustic format (${mimeType || ext}). Supported formats: WAV, MP3, M4A, WebM, OGG.`,
          },
          { status: 415 }
        );
      }

      if (file.size > MAX_AUDIO_SIZE) {
        return NextResponse.json(
          {
            success: false,
            error: `Audio file size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds 50 MB limit.`,
          },
          { status: 413 }
        );
      }
    } else if (bucket === "contractor-documents") {
      const isValidDoc =
        ALLOWED_DOC_MIMES.includes(mimeType) ||
        Boolean(fileName.match(/\.(pdf|jpg|jpeg|png|webp)$/i));

      if (!isValidDoc) {
        return NextResponse.json(
          {
            success: false,
            error: `Unsupported document format (${mimeType || ext}). Only PDF, JPEG, PNG, and WebP certificates are permitted.`,
          },
          { status: 415 }
        );
      }

      if (file.size > MAX_DOC_SIZE) {
        return NextResponse.json(
          {
            success: false,
            error: `Document file size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds 20 MB limit.`,
          },
          { status: 413 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: `Invalid storage bucket: ${bucket}. Allowed buckets: inspection-images, acoustic-recordings, contractor-documents.` },
        { status: 400 }
      );
    }

    const cleanPropId = propertyId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(4).toString("hex");
    const sanitizedFileName = `${cleanPropId}_${timestamp}_${randomSuffix}.${ext}`;
    const storagePath = `${cleanPropId}/${sanitizedFileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Upload to Supabase Storage if configured
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from(bucket)
          .upload(storagePath, buffer, {
            contentType: mimeType || (bucket === "acoustic-recordings" ? "audio/wav" : "image/jpeg"),
            upsert: false,
            cacheControl: "3600",
          });

        if (!uploadErr && uploadData?.path) {
          // Generate secure 24-hour signed URL from private bucket
          const { data: signedData, error: signedErr } = await supabase.storage
            .from(bucket)
            .createSignedUrl(uploadData.path, 86400);

          if (!signedErr && signedData?.signedUrl) {
            return NextResponse.json({
              success: true,
              bucket,
              storagePath: uploadData.path,
              signedUrl: signedData.signedUrl,
              fileName,
              fileSize: file.size,
              mimeType,
            });
          }
        }
      } catch (supabaseErr) {
        console.warn("Supabase Storage upload threw, falling back to disk storage:", supabaseErr);
      }
    }

    // 3. Fallback / Local Storage: Write original binary file to storage disk
    // Save under public/uploads/storage/<bucket>/<cleanPropId>/
    const targetDir = path.join(process.cwd(), "public", "uploads", "storage", bucket, cleanPropId);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetFilePath = path.join(targetDir, sanitizedFileName);
    fs.writeFileSync(targetFilePath, buffer);

    // Generate cryptographic signed URL valid for 24 hours
    const expires = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
    const relativePath = `${cleanPropId}/${sanitizedFileName}`;
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

    return NextResponse.json({
      success: true,
      bucket,
      storagePath,
      signedUrl,
      fileName,
      fileSize: file.size,
      mimeType,
    });
  } catch (err: unknown) {
    console.error("Storage upload handler failed:", err);
    const msg = err instanceof Error ? err.message : "Internal storage failure.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

