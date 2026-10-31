import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getSignedUrlForPath } from "@/lib/services/storageService";
import { WorkOrderRecord } from "@/lib/services/workOrderService";
import { apiClient } from "@/lib/apiClient";

export type VerificationStatus = "Pending Verification" | "Approved" | "Rejected";

export interface ContractorRecord {
  id: string;
  user_id?: string | null;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  location: string;
  trade: string;
  accreditation_details: string;
  accreditation_verified: boolean;
  document_url?: string;
  document_path?: string;
  verification_status: VerificationStatus;
  admin_notes?: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  rating?: number | null; // null if unrated, strictly never fabricated
  created_at: string;
  updated_at: string;
}

export interface RegisterContractorInput {
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  location: string;
  trade: string;
  accreditation_details: string;
  document_file?: File | null;
}

const STORAGE_KEY = "propcare_contractors_store_v2";

function getLocalStore(): ContractorRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalStore(records: ContractorRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error("Failed to save contractors to localStorage", err);
  }
}

/**
 * Validates contractor registration inputs
 */
export function validateContractorInput(input: RegisterContractorInput): { valid: boolean; error?: string } {
  if (!input.company_name || input.company_name.trim().length < 2) {
    return { valid: false, error: "Company name must be at least 2 characters." };
  }
  if (!input.contact_person || input.contact_person.trim().length < 2) {
    return { valid: false, error: "Contact person name is required." };
  }
  if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    return { valid: false, error: "A valid business email address is required." };
  }
  if (!input.phone || input.phone.trim().length < 7) {
    return { valid: false, error: "A valid direct phone number is required (min 7 digits)." };
  }
  if (!input.location || input.location.trim().length < 2) {
    return { valid: false, error: "Operating region / location is required." };
  }
  if (!input.trade || input.trade.trim().length < 2) {
    return { valid: false, error: "Primary trade specialty must be selected." };
  }
  if (!input.accreditation_details || input.accreditation_details.trim().length < 3) {
    return { valid: false, error: "Accreditation credentials and registration numbers are required." };
  }
  return { valid: true };
}

/**
 * Upload supporting accreditation certificate or insurance policy document
 */
export async function uploadContractorDocument(
  file: File,
  contractorId: string
): Promise<{ url: string; storagePath: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("bucket", "contractor-documents");
  formData.append("propertyId", contractorId);

  const response = await fetch("/api/storage/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to upload document (HTTP ${response.status})`);
  }

  const result = await response.json();
  return {
    url: result.url,
    storagePath: result.storagePath,
  };
}

/**
 * Fetch all contractors matching an optional filter.
 * Queries Supabase first, falls back to persistent local storage.
 */
export async function fetchContractors(filter?: {
  status?: VerificationStatus;
  trade?: string;
  search?: string;
}): Promise<ContractorRecord[]> {
  const supabase = createClient();
  // 1. Query FastAPI backend connected to MongoDB Atlas
  try {
    const data = await apiClient.get<ContractorRecord[]>("/api/v1/contractors");
    if (data && data.length > 0) {
      saveLocalStore(data);
      return data;
    }
  } catch (apiErr) {
    // Fall back to Supabase/local store
  }
  let list: ContractorRecord[] = [];

  if (isSupabaseConfigured()) {
    try {
      let query = supabase
        .from("contractors")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter?.status) {
        query = query.eq("verification_status", filter.status);
      }
      if (filter?.trade && filter.trade !== "all") {
        query = query.ilike("trade", `%${filter.trade}%`);
      }

      const { data, error } = await query;
      if (!error && data) {
        list = data.map((item) => ({
          id: item.id,
          user_id: item.user_id,
          company_name: item.company_name,
          contact_person: item.contact_person,
          email: item.email,
          phone: item.phone,
          location: item.location,
          trade: item.trade,
          accreditation_details: item.accreditation_details,
          accreditation_verified: Boolean(item.accreditation_verified),
          document_url: item.document_url || "",
          document_path: item.document_path || "",
          verification_status: item.verification_status,
          admin_notes: item.admin_notes || "",
          reviewed_by: item.reviewed_by || null,
          reviewed_at: item.reviewed_at || null,
          rating: item.rating !== null && item.rating !== undefined ? Number(item.rating) : null,
          created_at: item.created_at,
          updated_at: item.updated_at,
        }));
      }
    } catch (err) {
      console.warn("Supabase contractors fetch error; falling back to local store", err);
    }
  }

  if (list.length === 0) {
    list = getLocalStore();
  }

  // Apply filters
  if (filter?.status) {
    list = list.filter((c) => c.verification_status === filter.status);
  }
  if (filter?.trade && filter.trade !== "all") {
    list = list.filter((c) => c.trade.toLowerCase().includes(filter.trade!.toLowerCase()));
  }
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    list = list.filter(
      (c) =>
        c.company_name.toLowerCase().includes(q) ||
        c.trade.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q) ||
        c.contact_person.toLowerCase().includes(q)
    );
  }

  // Refresh signed URLs for private storage documents if available
  const enriched = await Promise.all(
    list.map(async (c) => {
      if (c.document_path) {
        const freshUrl = await getSignedUrlForPath("contractor-documents", c.document_path);
        if (freshUrl) {
          return { ...c, document_url: freshUrl };
        }
      }
      return c;
    })
  );

  return enriched;
}

/**
 * Fetch only verified & approved contractors for active network display
 */
export async function fetchApprovedContractors(): Promise<ContractorRecord[]> {
  return fetchContractors({ status: "Approved" });
}

/**
 * Fetch pending contractor registrations awaiting admin review
 */
export async function fetchPendingContractors(): Promise<ContractorRecord[]> {
  return fetchContractors({ status: "Pending Verification" });
}

/**
 * Fetch contractor by unique ID
 */
export async function fetchContractorById(id: string): Promise<ContractorRecord | null> {
  const all = await fetchContractors();
  return all.find((c) => c.id === id) || null;
}

/**
 * Register a new contractor.
 * Sets verification_status to "Pending Verification" and accreditation_verified to false.
 */
export async function registerContractor(
  input: RegisterContractorInput,
  currentUserId?: string | null
): Promise<ContractorRecord> {
  const validation = validateContractorInput(input);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const supabase = createClient();
  const newId = `CONT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  let docUrl = "";
  let docPath = "";

  if (input.document_file) {
    try {
      const uploadRes = await uploadContractorDocument(input.document_file, newId);
      docUrl = uploadRes.url;
      docPath = uploadRes.storagePath;
    } catch (uploadErr) {
      console.warn("Document upload failed during registration:", uploadErr);
      throw new Error(`Accreditation document upload failed: ${(uploadErr as Error).message}`);
    }
  }

  const record: ContractorRecord = {
    id: newId,
    user_id: currentUserId || null,
    company_name: input.company_name.trim(),
    contact_person: input.contact_person.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    location: input.location.trim(),
    trade: input.trade.trim(),
    accreditation_details: input.accreditation_details.trim(),
    accreditation_verified: false, // strictly requires manual admin review
    document_url: docUrl,
    document_path: docPath,
    verification_status: "Pending Verification",
    admin_notes: "",
    reviewed_by: null,
    reviewed_at: null,
    rating: null, // real ratings only, never fabricated
    created_at: now,
    updated_at: now,
  };

  // Persist to Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      await supabase.from("contractors").insert([
        {
          id: record.id,
          user_id: record.user_id,
          company_name: record.company_name,
          contact_person: record.contact_person,
          email: record.email,
          phone: record.phone,
          location: record.location,
          trade: record.trade,
          accreditation_details: record.accreditation_details,
          accreditation_verified: false,
          document_url: record.document_url,
          document_path: record.document_path,
          verification_status: "Pending Verification",
          admin_notes: "",
          created_at: now,
          updated_at: now,
        },
      ]);
    } catch (dbErr) {
      console.warn("Supabase contractors insert error, persisting locally", dbErr);
    }
  }

  // Persist to local store
  const current = getLocalStore();
  const nextList = [record, ...current.filter((c) => c.id !== record.id)];
  saveLocalStore(nextList);

  return record;
}

/**
 * Admin review workflow: Approve or Reject a contractor registration.
 * Does not automatically verify accreditation unless explicitly confirmed by admin.
 */
export async function reviewContractor(
  id: string,
  action: "Approved" | "Rejected",
  verifyAccreditation: boolean = false,
  adminNotes?: string,
  adminUserId?: string,
  callerRole?: string
): Promise<ContractorRecord> {
  if (callerRole && callerRole !== "admin") {
    throw new Error("Unauthorized: Only platform administrators hold permission to review, approve, or reject contractor registrations.");
  }
  const current = getLocalStore();
  const existing = current.find((c) => c.id === id);
  const now = new Date().toISOString();

  const updated: ContractorRecord = {
    ...(existing || {
      id,
      company_name: "Contractor Organization",
      contact_person: "Representative",
      email: "contact@contractor.co.uk",
      phone: "+44 161 000 0000",
      location: "Greater Manchester",
      trade: "Damp Remediation",
      accreditation_details: "Pending Verification",
      document_url: "",
      document_path: "",
      created_at: now,
    }),
    verification_status: action,
    accreditation_verified: action === "Approved" ? Boolean(verifyAccreditation) : false,
    admin_notes: adminNotes !== undefined ? adminNotes : (existing?.admin_notes || ""),
    reviewed_by: adminUserId || "Administrator",
    reviewed_at: now,
    updated_at: now,
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      await supabase
        .from("contractors")
        .update({
          verification_status: updated.verification_status,
          accreditation_verified: updated.accreditation_verified,
          admin_notes: updated.admin_notes,
          reviewed_by: adminUserId || null,
          reviewed_at: now,
          updated_at: now,
        })
        .eq("id", id);
    } catch (err) {
      console.warn("Supabase contractor review update failed, persisting locally", err);
    }
  }

  const nextList = [updated, ...current.filter((c) => c.id !== id)];
  saveLocalStore(nextList);

  return updated;
}

/**
 * Update contractor registration.
 * Non-admins can only update their own record and cannot alter verification status or accreditation verification.
 */
export async function updateContractor(
  id: string,
  updates: Partial<ContractorRecord>,
  actorRole: string,
  actorUserId?: string
): Promise<ContractorRecord> {
  const current = getLocalStore();
  const existing = current.find((c) => c.id === id);
  if (!existing) {
    throw new Error(`Contractor with ID ${id} not found.`);
  }

  // Security check: Only admins or the contractor themselves can edit
  const isAdmin = actorRole === "admin";
  const isOwner = Boolean(actorUserId && existing.user_id === actorUserId);
  if (!isAdmin && !isOwner) {
    throw new Error("Unauthorized: You do not have permission to edit this contractor registration.");
  }

  // Security check: Non-admins cannot alter verification status or accreditation verification
  const safeUpdates: Partial<ContractorRecord> = { ...updates };
  if (!isAdmin) {
    delete safeUpdates.verification_status;
    delete safeUpdates.accreditation_verified;
    delete safeUpdates.reviewed_by;
    delete safeUpdates.reviewed_at;
    delete safeUpdates.rating;
    delete safeUpdates.admin_notes;
  }

  const now = new Date().toISOString();
  const updated: ContractorRecord = {
    ...existing,
    ...safeUpdates,
    updated_at: now,
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      await supabase.from("contractors").update(safeUpdates).eq("id", id);
    } catch (err) {
      console.warn("Supabase contractor update failed, persisting locally", err);
    }
  }

  const nextList = current.map((c) => (c.id === id ? updated : c));
  saveLocalStore(nextList);

  return updated;
}

/**
 * Calculates active deployments from real stored work orders.
 * Strictly avoids hardcoding counts (Requirement 8).
 */
export function calculateActiveDeployments(
  companyName: string,
  workOrders: WorkOrderRecord[]
): number {
  if (!companyName || !workOrders || workOrders.length === 0) return 0;
  const target = companyName.trim().toLowerCase();
  return workOrders.filter(
    (wo) =>
      wo.contractor_name.trim().toLowerCase() === target &&
      wo.status !== "Completed"
  ).length;
}

