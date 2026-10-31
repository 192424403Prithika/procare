import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchProperties } from "@/lib/services/propertyService";
import { getSignedUrlForPath } from "@/lib/services/storageService";
import { apiClient } from "@/lib/apiClient";

export interface InspectionImageItem {
  id: string;
  url: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type?: string;
  caption?: string;
  created_at?: string;
}

export interface InspectionReport {
  id: string;
  title?: string;
  property_id: string;
  property_name: string;
  property_address: string;
  property_postal_code: string;
  inspector_id?: string | null;
  inspector_name: string;
  inspector_email?: string;
  inspection_zone: string;
  room_name: string;
  room?: string;
  inspection_date?: string;
  date?: string;
  floor: string;
  inspection_location: string;
  status: "Pending Review" | "Requires Review" | "Completed" | "Approved" | "Flagged for Contractor";
  symptom_tags: string[];
  notes: string;
  ambient_img_url: string;
  ambient_img_path?: string;
  flash_img_url: string;
  flash_img_path?: string;
  images?: InspectionImageItem[];
  image_paths?: string[];
  audio_url: string;
  audio_path?: string;
  audio_duration_seconds?: number;
  audio_file_size?: number;
  risk_level: "critical" | "high" | "moderate" | "low" | "pending";
  risk_score: number;
  ambient_moisture_index?: number | null;
  flash_reflection_score?: number | null;
  acoustic_leak_frequency_hz?: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateInspectionInput {
  property_id: string;
  inspector_id?: string | null;
  inspector_name?: string;
  inspector_email?: string;
  inspection_zone: string;
  room_name: string;
  floor: string;
  inspection_location: string;
  symptom_tags: string[];
  notes: string;
  ambient_img_url: string;
  ambient_img_path?: string;
  flash_img_url: string;
  flash_img_path?: string;
  images?: InspectionImageItem[];
  image_paths?: string[];
  audio_url: string;
  audio_path?: string;
  audio_duration_seconds?: number;
  audio_file_size?: number;
}

export const INITIAL_INSPECTIONS: InspectionReport[] = [
  {
    id: "INSP-2026-0914",
    property_id: "PROP-0914",
    property_name: "Trinity Court Blocks A-C",
    property_address: "42 Chapel Street, Salford",
    property_postal_code: "M3 5LE",
    inspector_id: null,
    inspector_name: "Markus Thorne, MRICS",
    inspector_email: "m.thorne@forensicspec.com",
    inspection_zone: "Bathroom ceiling & external wall",
    room_name: "Flat 14 Master Bathroom",
    floor: "Floor 3",
    inspection_location: "Ceiling-to-gable wall junction behind extractor duct",
    status: "Flagged for Contractor",
    symptom_tags: ["Musty odour", "Damp patches", "Visible mould", "Cold draft"],
    notes: "Thermal bridging detected behind northern gable wall. High moisture condensation and early Aspergillus biofilm growth.",
    ambient_img_url:
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%2319233B'/><circle cx='300' cy='200' r='110' fill='%23223055'/><circle cx='280' cy='180' r='60' fill='%23121929'/><text x='50%25' y='85%25' fill='%239CA3AF' font-family='sans-serif' font-size='15' font-weight='bold' text-anchor='middle'>Ambient Baseline (Diffused Room Light)</text><text x='50%25' y='92%25' fill='%236558F5' font-family='sans-serif' font-size='12' text-anchor='middle'>Trinity Court Flat 14 – Bathroom Gable</text></svg>",
    flash_img_url:
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%23253352'/><circle cx='300' cy='200' r='110' fill='%23384D7C'/><circle cx='280' cy='180' r='60' fill='%2360A5FA' opacity='0.75'/><circle cx='265' cy='165' r='25' fill='%23FFFFFF' opacity='0.9'/><text x='50%25' y='85%25' fill='%23FFFFFF' font-family='sans-serif' font-size='15' font-weight='bold' text-anchor='middle'>Flash Specular Illumination (Moisture Sheen)</text><text x='50%25' y='92%25' fill='%2338BDF8' font-family='sans-serif' font-size='12' text-anchor='middle'>Specular Highlight Area: 64.2% Reflection Index</text></svg>",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    audio_duration_seconds: 10.4,
    audio_file_size: 421800,
    risk_level: "critical",
    risk_score: 88,
    ambient_moisture_index: 76.5,
    flash_reflection_score: 64.2,
    acoustic_leak_frequency_hz: 2840.0,
    created_at: "2026-10-28T14:32:00Z",
    updated_at: "2026-10-28T15:10:00Z",
  },
  {
    id: "INSP-2026-0422",
    property_id: "PROP-0422",
    property_name: "Pendleton Tower Estate",
    property_address: "18 Broad Street, Pendleton",
    property_postal_code: "M6 5BY",
    inspector_id: null,
    inspector_name: "Sarah Jenkins, BEng",
    inspector_email: "s.jenkins@housingtrust.org.uk",
    inspection_zone: "Kitchen riser pipe enclosure",
    room_name: "Unit 8B Kitchen",
    floor: "Floor 8",
    inspection_location: "Vertical service riser chase adjacent to waste stack",
    status: "Pending Review",
    symptom_tags: ["Musty odour", "Spongy surface", "Other observations"],
    notes: "Acoustic hiss detected on riser pipe 4B. Dielectric moisture sensor reads 38% saturation inside cavity.",
    ambient_img_url:
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%231E2436'/><rect x='180' y='50' width='80' height='300' fill='%23333F5D'/><text x='50%25' y='88%25' fill='%239CA3AF' font-family='sans-serif' font-size='14' text-anchor='middle'>Ambient Optical Scan – Riser 4B</text></svg>",
    flash_img_url:
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%2328324A'/><rect x='180' y='50' width='80' height='300' fill='%2343547D'/><ellipse cx='220' cy='220' rx='35' ry='60' fill='%2338BDF8' opacity='0.7'/><text x='50%25' y='88%25' fill='%23FFFFFF' font-family='sans-serif' font-size='14' text-anchor='middle'>Flash Specular Surface Sheen</text></svg>",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    audio_duration_seconds: 12.0,
    audio_file_size: 512000,
    risk_level: "critical",
    risk_score: 84,
    ambient_moisture_index: 82.1,
    flash_reflection_score: 71.0,
    acoustic_leak_frequency_hz: 4200.0,
    created_at: "2026-10-29T10:15:00Z",
    updated_at: "2026-10-29T11:00:00Z",
  },
  {
    id: "INSP-2026-0118",
    property_id: "PROP-0118",
    property_name: "Ancoats Redrow Terraces",
    property_address: "7 Blossom Street, Ancoats",
    property_postal_code: "M4 6AJ",
    inspector_id: null,
    inspector_name: "Markus Thorne, MRICS",
    inspector_email: "m.thorne@forensicspec.com",
    inspection_zone: "Sub-floor void & timber joists",
    room_name: "Ground Floor Entry Corridor",
    floor: "Ground Floor",
    inspection_location: "Subfloor timber plate beneath entryway floorboards",
    status: "Requires Review",
    symptom_tags: ["Musty odour", "Peeling plaster", "Damp patches"],
    notes: "Rising damp detected up to 450mm above skirting. External soil bank exceeds DPC level.",
    ambient_img_url:
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%23222B3E'/><path d='M50 320 Q 300 280 550 320 L 550 400 L 50 400 Z' fill='%23141A28'/><text x='50%25' y='88%25' fill='%239CA3AF' font-family='sans-serif' font-size='14' text-anchor='middle'>Subfloor Timber Plate Ambient Exposure</text></svg>",
    flash_img_url:
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%232D3952'/><path d='M50 320 Q 300 280 550 320 L 550 400 L 50 400 Z' fill='%23415378'/><circle cx='300' cy='310' r='45' fill='%2360A5FA' opacity='0.7'/><text x='50%25' y='88%25' fill='%23FFFFFF' font-family='sans-serif' font-size='14' text-anchor='middle'>Flash Specular Moisture Mapping</text></svg>",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    audio_duration_seconds: 9.8,
    audio_file_size: 388000,
    risk_level: "high",
    risk_score: 71,
    ambient_moisture_index: 68.4,
    flash_reflection_score: 52.8,
    acoustic_leak_frequency_hz: 0,
    created_at: "2026-10-27T09:40:00Z",
    updated_at: "2026-10-27T10:20:00Z",
  },
  {
    id: "INSP-2026-0831",
    property_id: "PROP-0831",
    property_name: "Trafford Gateway Residences",
    property_address: "105 Chester Road, Stretford",
    property_postal_code: "M32 0QW",
    inspector_id: null,
    inspector_name: "Eleanor Vance",
    inspector_email: "e.vance@housingtrust.org.uk",
    inspection_zone: "Living room northern cavity wall",
    room_name: "Apartment 204 Living Room",
    floor: "Floor 2",
    inspection_location: "Double-glazed window reveal sill",
    status: "Completed",
    symptom_tags: ["Cold draft"],
    notes: "Minor draft around gasket seal. Sealant shrinkage noted, but underlying thermal envelope remains dry.",
    ambient_img_url:
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%2319233B'/><rect x='200' y='100' width='200' height='150' fill='%232E3D63'/><text x='50%25' y='85%25' fill='%239CA3AF' font-family='sans-serif' font-size='14' text-anchor='middle'>Window Reveal Gasket Scan</text></svg>",
    flash_img_url:
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%23223055'/><rect x='200' y='100' width='200' height='150' fill='%23384D7C'/><text x='50%25' y='85%25' fill='%23FFFFFF' font-family='sans-serif' font-size='14' text-anchor='middle'>Zero Specular Moisture Sheen Detected</text></svg>",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    audio_duration_seconds: 8.5,
    audio_file_size: 340000,
    risk_level: "moderate",
    risk_score: 42,
    ambient_moisture_index: 28.0,
    flash_reflection_score: 18.5,
    acoustic_leak_frequency_hz: 0,
    created_at: "2026-10-24T11:20:00Z",
    updated_at: "2026-10-24T12:00:00Z",
  },
];

const STORAGE_KEY = "propcare_inspections_store_v2";
let memoryInspectionsStore: InspectionReport[] = [];

function getLocalStore(): InspectionReport[] {
  if (typeof window === "undefined") return memoryInspectionsStore;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return memoryInspectionsStore;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : memoryInspectionsStore;
  } catch {
    return memoryInspectionsStore;
  }
}

function saveLocalStore(records: InspectionReport[]) {
  memoryInspectionsStore = [...records];
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error("Failed to save inspections to localStorage", err);
  }
}

/**
 * Seeds benchmark reference inspections if database/store is empty
 */
export function seedBenchmarkInspectionsIfEmpty(): InspectionReport[] {
  const current = getLocalStore();
  if (current.length === 0) {
    saveLocalStore(INITIAL_INSPECTIONS);
    return INITIAL_INSPECTIONS;
  }
  return current;
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
  const maxSizeBytes = 20 * 1024 * 1024; // 20 MB

  if (!allowedTypes.includes(file.type.toLowerCase()) && !file.name.match(/\.(jpg|jpeg|png|webp|heic)$/i)) {
    return {
      valid: false,
      error: `Invalid image format (${file.type || "unknown"}). Allowed formats: JPEG, PNG, WebP, HEIC.`,
    };
  }

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `Image size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds statutory 20 MB limit.`,
    };
  }

  return { valid: true };
}

/**
 * Validate acoustic audio file
 */
export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = [
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
  const maxSizeBytes = 50 * 1024 * 1024; // 50 MB

  const matchesExtension = Boolean(file.name.match(/\.(wav|mp3|mp4|m4a|webm|ogg|aac)$/i));
  if (!allowedTypes.includes(file.type.toLowerCase()) && !matchesExtension) {
    return {
      valid: false,
      error: `Invalid audio format (${file.type || "unknown"}). Allowed formats: WAV, MP3, M4A, WebM, OGG.`,
    };
  }

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `Audio file size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds 50 MB limit.`,
    };
  }

  return { valid: true };
}

/**
 * Upload file to private storage bucket (inspection-images or acoustic-recordings).
 * Performs validation, saves to private storage, and returns a verified signed URL.
 * Throws immediately if upload fails to guarantee safe failure handling.
 */
export async function uploadInspectionEvidence(
  file: File,
  bucket: "inspection-images" | "acoustic-recordings",
  propertyId: string,
  onProgress?: (percent: number) => void
): Promise<{ url: string; storagePath: string; fileName: string; fileSize: number }> {
  if (onProgress) onProgress(20);

  // Validate format and size before transmitting
  if (bucket === "inspection-images") {
    const val = validateImageFile(file);
    if (!val.valid) throw new Error(val.error || "Invalid photograph format or size.");
  } else {
    const val = validateAudioFile(file);
    if (!val.valid) throw new Error(val.error || "Invalid acoustic file format or size.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("bucket", bucket);
  formData.append("propertyId", propertyId);

  if (onProgress) onProgress(50);

  const endpoint = typeof window !== "undefined"
    ? `${window.location.origin}/api/storage/upload`
    : `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/storage/upload`;

  const res = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error || `Upload failed with status code ${res.status}.`);
  }

  const data = await res.json();
  if (!data.success || !data.signedUrl || !data.storagePath) {
    throw new Error(data.error || "Storage service failed to return signed URL.");
  }

  if (onProgress) onProgress(100);

  return {
    url: data.signedUrl,
    storagePath: data.storagePath,
    fileName: data.fileName || file.name,
    fileSize: data.fileSize || file.size,
  };
}

/**
 * Fetch all inspections with optional role-based filtering
 */
export async function fetchInspections(userRole?: string, userId?: string): Promise<InspectionReport[]> {
  // 1. Query FastAPI backend connected to MongoDB Atlas
  try {
    const data = await apiClient.get<any>("/api/v1/inspections");
    const items = Array.isArray(data) ? data : (data?.items || []);
    if (items && items.length > 0) {
      saveLocalStore(items);
      return items;
    }
  } catch (apiErr) {
    // Fall back to Supabase/local store
  }

  const supabase = createClient();

  if (isSupabaseConfigured()) {
    try {
      let query = supabase
        .from("pathology_reports")
        .select(`
          *,
          properties:property_id (
            property_name,
            address,
            postal_code
          )
        `)
        .order("created_at", { ascending: false });

      // Apply role-based filtering
      if (userRole === "inspector" && userId) {
        query = query.or(`inspector_id.eq.${userId},inspector_id.is.null`);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        const mapped: InspectionReport[] = data.map((item: Record<string, unknown>) => {
          const rawImages = Array.isArray(item.images_metadata) ? (item.images_metadata as InspectionImageItem[]) : [];
          const ambientUrl = (item.ambient_img_url as string) || "";
          const flashUrl = (item.flash_img_url as string) || "";
          
          if (rawImages.length === 0) {
            if (ambientUrl) {
              rawImages.push({
                id: `${item.id}-ambient`,
                url: ambientUrl,
                storage_path: (item.ambient_img_path as string) || "",
                file_name: "Primary Inspection Photo",
                file_size: 1540000,
                caption: "Primary ambient capture",
              });
            }
            if (flashUrl) {
              rawImages.push({
                id: `${item.id}-flash`,
                url: flashUrl,
                storage_path: (item.flash_img_path as string) || "",
                file_name: "Flash Specular Photo",
                file_size: 1620000,
                caption: "Specular flash capture",
              });
            }
          }

          return {
            id: String(item.id),
            property_id: String(item.property_id),
            property_name: (item.properties as Record<string, unknown>)?.property_name as string || "Unknown Property",
            property_address: (item.properties as Record<string, unknown>)?.address as string || "",
            property_postal_code: (item.properties as Record<string, unknown>)?.postal_code as string || "",
            inspector_id: item.inspector_id as string | null,
            inspector_name: (item.inspector_name as string) || "Assigned Surveyor",
            inspector_email: (item.inspector_email as string) || "",
            inspection_zone: item.inspection_zone as string,
            room_name: (item.room_name as string) || "",
            floor: (item.floor as string) || "Ground Floor",
            inspection_location: (item.inspection_location as string) || "",
            status: item.status as InspectionReport["status"],
            symptom_tags: Array.isArray(item.symptom_tags) ? (item.symptom_tags as string[]) : [],
            notes: (item.notes as string) || "",
            ambient_img_url: ambientUrl,
            ambient_img_path: item.ambient_img_path as string | undefined,
            flash_img_url: flashUrl,
            flash_img_path: item.flash_img_path as string | undefined,
            images: rawImages,
            image_paths: Array.isArray(item.image_paths) ? (item.image_paths as string[]) : undefined,
            audio_url: (item.audio_url as string) || "",
            audio_path: item.audio_path as string | undefined,
            audio_duration_seconds: item.audio_duration_seconds ? Number(item.audio_duration_seconds) : undefined,
            audio_file_size: item.audio_file_size ? Number(item.audio_file_size) : undefined,
            risk_level: (item.risk_level as InspectionReport["risk_level"]) || "pending",
            risk_score: (item.risk_score as number) || 0,
            ambient_moisture_index: item.ambient_moisture_index !== null && item.ambient_moisture_index !== undefined ? Number(item.ambient_moisture_index) : null,
            flash_reflection_score: item.flash_reflection_score !== null && item.flash_reflection_score !== undefined ? Number(item.flash_reflection_score) : null,
            acoustic_leak_frequency_hz: item.acoustic_leak_frequency_hz !== null && item.acoustic_leak_frequency_hz !== undefined ? Number(item.acoustic_leak_frequency_hz) : null,
            created_at: item.created_at as string,
            updated_at: item.updated_at as string,
          };
        });

        saveLocalStore(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn("Supabase inspections query error; returning persistent cache", err);
    }
  }

  return getLocalStore();
}

/**
 * Fetch a single inspection by its ID
 */
export async function fetchInspectionById(id: string): Promise<InspectionReport | null> {
  const supabase = createClient();

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("pathology_reports")
        .select(`
          *,
          properties:property_id (
            property_name,
            address,
            postal_code,
            building_type,
            build_year,
            risk_level,
            risk_score
          )
        `)
        .eq("id", id)
        .single();

      if (!error && data) {
        // If private storage paths exist, attempt to generate fresh signed URLs
        let ambientUrl = data.ambient_img_url;
        let flashUrl = data.flash_img_url;
        let audioUrl = data.audio_url;

        if (data.ambient_img_path) {
          const { data: sData } = await supabase.storage
            .from("inspection-images")
            .createSignedUrl(data.ambient_img_path, 86400);
          if (sData?.signedUrl) ambientUrl = sData.signedUrl;
        }

        if (data.flash_img_path) {
          const { data: sData } = await supabase.storage
            .from("inspection-images")
            .createSignedUrl(data.flash_img_path, 86400);
          if (sData?.signedUrl) flashUrl = sData.signedUrl;
        }

        if (data.audio_path) {
          const { data: sData } = await supabase.storage
            .from("acoustic-recordings")
            .createSignedUrl(data.audio_path, 86400);
          if (sData?.signedUrl) audioUrl = sData.signedUrl;
        }

        // Retrieve images metadata or synthesize from ambient / flash
        const allImgs: InspectionImageItem[] = Array.isArray(data.images_metadata)
          ? [...(data.images_metadata as InspectionImageItem[])]
          : [];

        // Refresh signed URLs for all images in Supabase Storage
        for (const img of allImgs) {
          if (img.storage_path) {
            const { data: sData } = await supabase.storage
              .from("inspection-images")
              .createSignedUrl(img.storage_path, 86400);
            if (sData?.signedUrl) img.url = sData.signedUrl;
          }
        }

        if (allImgs.length === 0) {
          if (ambientUrl) {
            allImgs.push({
              id: `${data.id}-img-0`,
              url: ambientUrl,
              storage_path: data.ambient_img_path || "",
              file_name: "Ambient Primary Photo",
              file_size: 1540000,
              caption: "Primary ambient reference capture",
            });
          }
          if (flashUrl) {
            allImgs.push({
              id: `${data.id}-img-1`,
              url: flashUrl,
              storage_path: data.flash_img_path || "",
              file_name: "Flash Specular Photo",
              file_size: 1620000,
              caption: "Specular reflection capture",
            });
          }
        }

        return {
          id: data.id,
          property_id: data.property_id,
          property_name: data.properties?.property_name || "Unknown Property",
          property_address: data.properties?.address || "",
          property_postal_code: data.properties?.postal_code || "",
          inspector_id: data.inspector_id,
          inspector_name: data.inspector_name || "Surveyor",
          inspector_email: data.inspector_email || "",
          inspection_zone: data.inspection_zone,
          room_name: data.room_name || "",
          floor: data.floor || "Ground Floor",
          inspection_location: data.inspection_location || "",
          status: data.status,
          symptom_tags: Array.isArray(data.symptom_tags) ? data.symptom_tags : [],
          notes: data.notes || "",
          ambient_img_url: ambientUrl || "",
          ambient_img_path: data.ambient_img_path,
          flash_img_url: flashUrl || "",
          flash_img_path: data.flash_img_path,
          images: allImgs,
          image_paths: Array.isArray(data.image_paths) ? data.image_paths : allImgs.map((i) => i.storage_path).filter(Boolean),
          audio_url: audioUrl || "",
          audio_path: data.audio_path,
          audio_duration_seconds: data.audio_duration_seconds ? Number(data.audio_duration_seconds) : undefined,
          audio_file_size: data.audio_file_size ? Number(data.audio_file_size) : undefined,
          risk_level: data.risk_level || "pending",
          risk_score: data.risk_score || 0,
          ambient_moisture_index: data.ambient_moisture_index !== null ? Number(data.ambient_moisture_index) : null,
          flash_reflection_score: data.flash_reflection_score !== null ? Number(data.flash_reflection_score) : null,
          acoustic_leak_frequency_hz: data.acoustic_leak_frequency_hz !== null ? Number(data.acoustic_leak_frequency_hz) : null,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
      }
    } catch {
      // Fallback to local store
    }
  }

  const all = getLocalStore();
  const found = all.find((i) => i.id === id) || null;
  if (found) {
    if (found.ambient_img_path) {
      const freshAmbient = await getSignedUrlForPath("inspection-images", found.ambient_img_path);
      if (freshAmbient) found.ambient_img_url = freshAmbient;
    }
    if (found.flash_img_path) {
      const freshFlash = await getSignedUrlForPath("inspection-images", found.flash_img_path);
      if (freshFlash) found.flash_img_url = freshFlash;
    }
    if (found.audio_path) {
      const freshAudio = await getSignedUrlForPath("acoustic-recordings", found.audio_path);
      if (freshAudio) found.audio_url = freshAudio;
    }
    if (found.images && Array.isArray(found.images) && found.images.length > 0) {
      for (const img of found.images) {
        if (img.storage_path) {
          const freshUrl = await getSignedUrlForPath("inspection-images", img.storage_path);
          if (freshUrl) img.url = freshUrl;
        }
      }
    } else {
      const syn: InspectionImageItem[] = [];
      if (found.ambient_img_url) {
        syn.push({
          id: `${found.id}-ambient`,
          url: found.ambient_img_url,
          storage_path: found.ambient_img_path || "",
          file_name: "Primary Inspection Photo",
          file_size: 1540000,
          caption: "Primary ambient baseline photo",
        });
      }
      if (found.flash_img_url) {
        syn.push({
          id: `${found.id}-flash`,
          url: found.flash_img_url,
          storage_path: found.flash_img_path || "",
          file_name: "Flash Specular Photo",
          file_size: 1620000,
          caption: "Specular reflection capture",
        });
      }
      found.images = syn;
    }
  }
  return found;
}

/**
 * Create a new inspection record in Supabase or persistent local store
 */
/**
 * Fetch all inspections linked to a specific property ID
 */
export async function fetchInspectionsByPropertyId(propertyId: string): Promise<InspectionReport[]> {
  const all = await fetchInspections();
  return all.filter((i) => i.property_id === propertyId);
}

export async function createInspection(
  input: CreateInspectionInput
): Promise<InspectionReport> {
  // 1. Try FastAPI backend first
  try {
    const created = await apiClient.post<InspectionReport>("/api/v1/inspections", {
      property_id: input.property_id,
      inspector_id: input.inspector_id,
      inspector_name: input.inspector_name,
      inspection_zone: input.inspection_zone,
      room_name: input.room_name,
      floor: input.floor,
      inspection_location: input.inspection_location,
      symptom_tags: input.symptom_tags,
      notes: input.notes,
      ambient_img_path: input.ambient_img_path,
      flash_img_path: input.flash_img_path,
      audio_path: input.audio_path,
    });
    if (created && created.id) {
      const all = getLocalStore();
      saveLocalStore([created, ...all]);
      return created;
    }
  } catch (apiErr) {
    // Fall back to Supabase/local store
  }

  const supabase = createClient();
  const now = new Date().toISOString();
  const newId = `INSP-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  // Find property name and details
  const properties = await fetchProperties();
  const property = properties.find((p) => p.id === input.property_id);
  const propertyName = property?.property_name || "Authorized Property";
  const propertyAddress = property?.address || "";
  const propertyPostalCode = property?.postal_code || "";

  // Compute initial risk estimation based on reported symptoms
  let computedRisk: "critical" | "high" | "moderate" | "low" | "pending" = "pending";
  let computedScore = 30;

  if (input.symptom_tags.includes("Visible mould") || input.symptom_tags.includes("Spongy surface")) {
    computedRisk = "critical";
    computedScore = 85;
  } else if (input.symptom_tags.includes("Damp patches") || input.symptom_tags.includes("Peeling plaster")) {
    computedRisk = "high";
    computedScore = 70;
  } else if (input.symptom_tags.includes("Musty odour") || input.symptom_tags.includes("Cold draft")) {
    computedRisk = "moderate";
    computedScore = 48;
  } else if (input.symptom_tags.length > 0) {
    computedRisk = "low";
    computedScore = 25;
  }

  // Derive primary and secondary image paths and URLs
  const primaryImgUrl = input.images?.[0]?.url || input.ambient_img_url || "";
  const primaryImgPath = input.images?.[0]?.storage_path || input.ambient_img_path || "";
  const secondaryImgUrl = input.images?.[1]?.url || input.flash_img_url || "";
  const secondaryImgPath = input.images?.[1]?.storage_path || input.flash_img_path || "";

  const allImages: InspectionImageItem[] = input.images && input.images.length > 0 
    ? [...input.images] 
    : [];

  if (allImages.length === 0 && primaryImgUrl) {
    allImages.push({
      id: `img-${Date.now()}-0`,
      url: primaryImgUrl,
      storage_path: primaryImgPath,
      file_name: "Inspection Photo 1",
      file_size: 1540000,
      caption: "Primary ambient baseline capture",
    });
    if (secondaryImgUrl) {
      allImages.push({
        id: `img-${Date.now()}-1`,
        url: secondaryImgUrl,
        storage_path: secondaryImgPath,
        file_name: "Inspection Photo 2",
        file_size: 1620000,
        caption: "Secondary specular capture",
      });
    }
  }

  const allImagePaths: string[] = input.image_paths && input.image_paths.length > 0
    ? input.image_paths
    : allImages.map((i) => i.storage_path).filter(Boolean);

  const record: InspectionReport = {
    id: newId,
    property_id: input.property_id,
    property_name: propertyName,
    property_address: propertyAddress,
    property_postal_code: propertyPostalCode,
    inspector_id: input.inspector_id || null,
    inspector_name: input.inspector_name || "Markus Thorne, MRICS",
    inspector_email: input.inspector_email || "m.thorne@forensicspec.com",
    inspection_zone: input.inspection_zone,
    room_name: input.room_name,
    floor: input.floor,
    inspection_location: input.inspection_location,
    status: "Pending Review",
    symptom_tags: input.symptom_tags,
    notes: input.notes,
    ambient_img_url: primaryImgUrl,
    ambient_img_path: primaryImgPath,
    flash_img_url: secondaryImgUrl,
    flash_img_path: secondaryImgPath,
    images: allImages,
    image_paths: allImagePaths,
    audio_url: input.audio_url,
    audio_path: input.audio_path,
    audio_duration_seconds: input.audio_duration_seconds || 10.0,
    audio_file_size: input.audio_file_size || 400000,
    risk_level: computedRisk,
    risk_score: computedScore,
    ambient_moisture_index: null, // Ready for subsequent OpenCV analysis
    flash_reflection_score: null,
    acoustic_leak_frequency_hz: null,
    created_at: now,
    updated_at: now,
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("pathology_reports")
        .insert([
          {
            property_id: input.property_id,
            inspector_id: input.inspector_id || null,
            inspection_zone: input.inspection_zone,
            room_name: input.room_name,
            floor: input.floor,
            inspection_location: input.inspection_location,
            status: "Pending Review",
            symptom_tags: input.symptom_tags,
            notes: input.notes,
            ambient_img_url: primaryImgUrl,
            ambient_img_path: primaryImgPath,
            flash_img_url: secondaryImgUrl,
            flash_img_path: secondaryImgPath,
            audio_url: input.audio_url,
            audio_path: input.audio_path || "",
            audio_duration_seconds: input.audio_duration_seconds || 10.0,
            audio_file_size: input.audio_file_size || 400000,
            risk_level: computedRisk,
            risk_score: computedScore,
            ...(allImagePaths.length > 0 ? { image_paths: allImagePaths } : {}),
            ...(allImages.length > 0 ? { images_metadata: allImages } : {}),
          },
        ])
        .select()
        .single();

      if (!error && data) {
        const createdFromSupabase: InspectionReport = {
          ...record,
          id: data.id,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };

        const currentLocal = getLocalStore();
        saveLocalStore([createdFromSupabase, ...currentLocal]);
        return createdFromSupabase;
      }
    } catch (err) {
      console.warn("Supabase pathology_reports insert error; storing in persistent local store", err);
    }
  }

  // Save to persistent browser storage
  const current = getLocalStore();
  saveLocalStore([record, ...current]);
  return record;
}

export interface UpdateInspectionEvidenceInput {
  ambient_img_url?: string;
  ambient_img_path?: string;
  flash_img_url?: string;
  flash_img_path?: string;
  audio_url?: string;
  audio_path?: string;
  audio_duration_seconds?: number;
  audio_file_size?: number;
}

/**
 * Updates evidence for an existing inspection record
 * Only updates once the replacement upload succeeds!
 */
export async function updateInspectionEvidence(
  id: string,
  evidence: UpdateInspectionEvidenceInput
): Promise<InspectionReport> {
  const supabase = createClient();
  const now = new Date().toISOString();

  // Fetch current inspection
  const existing = await fetchInspectionById(id);
  if (!existing) {
    throw new Error(`Inspection ${id} not found.`);
  }

  const updatedRecord: InspectionReport = {
    ...existing,
    ambient_img_url: evidence.ambient_img_url !== undefined ? evidence.ambient_img_url : existing.ambient_img_url,
    ambient_img_path: evidence.ambient_img_path !== undefined ? evidence.ambient_img_path : existing.ambient_img_path,
    flash_img_url: evidence.flash_img_url !== undefined ? evidence.flash_img_url : existing.flash_img_url,
    flash_img_path: evidence.flash_img_path !== undefined ? evidence.flash_img_path : existing.flash_img_path,
    audio_url: evidence.audio_url !== undefined ? evidence.audio_url : existing.audio_url,
    audio_path: evidence.audio_path !== undefined ? evidence.audio_path : existing.audio_path,
    audio_duration_seconds:
      evidence.audio_duration_seconds !== undefined
        ? evidence.audio_duration_seconds
        : existing.audio_duration_seconds,
    audio_file_size:
      evidence.audio_file_size !== undefined ? evidence.audio_file_size : existing.audio_file_size,
    updated_at: now,
  };

  if (isSupabaseConfigured()) {
    try {
      const payload: Record<string, unknown> = {
        updated_at: now,
      };
      if (evidence.ambient_img_url !== undefined) payload.ambient_img_url = evidence.ambient_img_url;
      if (evidence.ambient_img_path !== undefined) payload.ambient_img_path = evidence.ambient_img_path;
      if (evidence.flash_img_url !== undefined) payload.flash_img_url = evidence.flash_img_url;
      if (evidence.flash_img_path !== undefined) payload.flash_img_path = evidence.flash_img_path;
      if (evidence.audio_url !== undefined) payload.audio_url = evidence.audio_url;
      if (evidence.audio_path !== undefined) payload.audio_path = evidence.audio_path;
      if (evidence.audio_duration_seconds !== undefined) payload.audio_duration_seconds = evidence.audio_duration_seconds;
      if (evidence.audio_file_size !== undefined) payload.audio_file_size = evidence.audio_file_size;

      const { data, error } = await supabase
        .from("pathology_reports")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (!error && data) {
        // Save to local cache as well
        const current = getLocalStore();
        const updated = current.map((i) => (i.id === id ? updatedRecord : i));
        saveLocalStore(updated);
        return updatedRecord;
      }
    } catch (err) {
      console.warn("Supabase evidence update failed, updating persistent local store", err);
    }
  }

  // Update persistent browser store
  const current = getLocalStore();
  const updated = current.map((i) => (i.id === id ? updatedRecord : i));
  saveLocalStore(updated);
  return updatedRecord;
}
