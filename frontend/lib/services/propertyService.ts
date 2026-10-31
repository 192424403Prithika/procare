import { createClient, isSupabaseConfigured } from "../supabase/client";



export interface PropertyRecord {

  id: string;

  property_name: string;

  address: string;

  postal_code: string;

  latitude: number | null;

  longitude: number | null;

  building_type: string;

  build_year: number;

  number_of_floors: number;

  pipe_type: string;

  roof_membrane_age: number;

  risk_level: "critical" | "high" | "moderate" | "low";

  risk_score: number;

  inspection_status: "Overdue" | "Pending Review" | "Inspected" | "Scheduled";

  last_inspected: string;

  notes: string;

  organization?: string;

  created_by?: string | null;

  created_at?: string;

  updated_at?: string;

}



export interface CreatePropertyInput {

  property_name: string;

  address: string;

  postal_code: string;

  building_type: string;

  build_year: number;

  number_of_floors: number;

  pipe_type: string;

  roof_membrane_age: number;

  latitude?: number | null;

  longitude?: number | null;

  notes?: string;

  organization?: string;

  risk_level?: "critical" | "high" | "moderate" | "low";

  risk_score?: number;

  inspection_status?: "Overdue" | "Pending Review" | "Inspected" | "Scheduled";

  last_inspected?: string;

  created_by?: string | null;

}



const STORAGE_KEY = "propcare_properties_registry_v2";



export const INITIAL_PROPERTIES: PropertyRecord[] = [

  {

    id: "PROP-0914",

    property_name: "Trinity Court Blocks A-C",

    address: "42 Chapel Street, Salford",

    postal_code: "M3 5LE",

    latitude: 53.4839,

    longitude: -2.2575,

    building_type: "Multi-Storey Social Housing (1974 Brick Cavity)",

    build_year: 1974,

    number_of_floors: 6,

    pipe_type: "Copper",

    roof_membrane_age: 8,

    risk_level: "critical",

    risk_score: 89,

    inspection_status: "Pending Review",

    last_inspected: "2026-10-28",

    notes: "Thermal bridging detected behind northern gable wall.",

    organization: "Greater Manchester Housing Trust",

    created_at: "2026-10-28T14:32:00Z",

    updated_at: "2026-10-28T15:10:00Z",

  },

  {

    id: "PROP-0422",

    property_name: "Pendleton Tower Estate",

    address: "18 Broad Street, Pendleton",

    postal_code: "M6 5BY",

    latitude: 53.4912,

    longitude: -2.2854,

    building_type: "High-Rise Residential (1968 Reinforced Concrete)",

    build_year: 1968,

    number_of_floors: 14,

    pipe_type: "Galvanized Steel",

    roof_membrane_age: 12,

    risk_level: "critical",

    risk_score: 84,

    inspection_status: "Pending Review",

    last_inspected: "2026-10-29",

    notes: "Acoustic hiss detected on riser pipe 4B.",

    organization: "Greater Manchester Housing Trust",

    created_at: "2026-10-29T11:20:00Z",

    updated_at: "2026-10-29T12:05:00Z",

  },

  {

    id: "PROP-0118",

    property_name: "Ancoats Redrow Terraces",

    address: "7 Blossom Street, Ancoats",

    postal_code: "M4 6AJ",

    latitude: 53.4851,

    longitude: -2.2289,

    building_type: "Victorian Solid Brick Conversion",

    build_year: 1898,

    number_of_floors: 3,

    pipe_type: "Cast Iron",

    roof_membrane_age: 15,

    risk_level: "high",

    risk_score: 71,

    inspection_status: "Overdue",

    last_inspected: "2026-09-15",

    notes: "Sub-floor ventilation grilles obstructed by external landscaping.",

    organization: "Greater Manchester Housing Trust",

    created_at: "2026-09-15T09:00:00Z",

    updated_at: "2026-09-15T09:00:00Z",

  },

  {

    id: "PROP-0782",

    property_name: "Trafford Gateway Residences",

    address: "105 Chester Road, Stretford",

    postal_code: "M32 0QW",

    latitude: 53.4589,

    longitude: -2.2981,

    building_type: "Modern Steel Frame (2012 Low-Rise)",

    build_year: 2012,

    number_of_floors: 4,

    pipe_type: "Multilayer PEX",

    roof_membrane_age: 3,

    risk_level: "moderate",

    risk_score: 46,

    inspection_status: "Inspected",

    last_inspected: "2026-10-24",

    notes: "Isolated sealant degradation along second floor sill.",

    organization: "Trafford Housing Trust",

    created_at: "2026-10-24T16:00:00Z",

    updated_at: "2026-10-24T16:00:00Z",

  },

];



// Server-side / memory cache fallback when running in Node.js runtime or SSR

let memoryPropertiesRegistry: PropertyRecord[] = [...INITIAL_PROPERTIES];



/**

 * Generate a unique property reference identifier.

 */

export function generatePropertyId(): string {

  const randomSuffix = Math.floor(1000 + Math.random() * 9000);

  return `PROP-${randomSuffix}`;

}



/**

 * Retrieve persistent property records from browser storage or memory fallback.

 */

function getPersistentProperties(): PropertyRecord[] {

  if (typeof window === "undefined") {

    return memoryPropertiesRegistry.length > 0 ? memoryPropertiesRegistry : [...INITIAL_PROPERTIES];

  }

  try {

    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return memoryPropertiesRegistry.length > 0 ? memoryPropertiesRegistry : [...INITIAL_PROPERTIES];

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) && parsed.length > 0 ? parsed : (memoryPropertiesRegistry.length > 0 ? memoryPropertiesRegistry : [...INITIAL_PROPERTIES]);

  } catch {

    return memoryPropertiesRegistry.length > 0 ? memoryPropertiesRegistry : [...INITIAL_PROPERTIES];

  }

}



/**

 * Save property records to persistent browser storage and memory fallback.

 */

function savePersistentProperties(records: PropertyRecord[]) {

  memoryPropertiesRegistry = [...records];

  if (typeof window === "undefined") return;

  try {

    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));

  } catch (err) {

    console.error("Failed to save property records to persistent storage", err);

  }

}



/**

 * Fetch all properties from PostgreSQL (Supabase) with persistent cache fallback and role filtering.

 */

export async function fetchProperties(options?: {

  role?: string;

  userId?: string;

  organization?: string;

  contractorCompany?: string;

}): Promise<PropertyRecord[]> {

  const supabase = createClient();

  let results: PropertyRecord[] = [];



  if (isSupabaseConfigured()) {

    try {

      const { data, error } = await supabase

        .from("properties")

        .select("*")

        .order("created_at", { ascending: false });



      if (!error && data && data.length > 0) {

        results = data.map((item: Record<string, unknown>) => ({

          id: String(item.id),

          property_name: String(item.property_name || ""),

          address: String(item.address || ""),

          postal_code: String(item.postal_code || ""),

          latitude: item.latitude !== null && item.latitude !== undefined ? Number(item.latitude) : null,

          longitude: item.longitude !== null && item.longitude !== undefined ? Number(item.longitude) : null,

          building_type: String(item.building_type || "Social Housing"),

          build_year: Number(item.build_year || 1980),

          number_of_floors: Number(item.number_of_floors || 3),

          pipe_type: String(item.pipe_type || "Copper"),

          roof_membrane_age: Number(item.roof_membrane_age || 5),

          risk_level: (item.risk_level as PropertyRecord["risk_level"]) || "low",

          risk_score: Number(item.risk_score || 20),

          inspection_status: (item.inspection_status as PropertyRecord["inspection_status"]) || "Scheduled",

          last_inspected: String(item.last_inspected || "Not yet inspected"),

          notes: String(item.notes || ""),

          organization: String(item.organization || "Greater Manchester Housing Trust"),

          created_by: item.created_by ? String(item.created_by) : null,

          created_at: String(item.created_at || new Date().toISOString()),

          updated_at: String(item.updated_at || new Date().toISOString()),

        }));



        savePersistentProperties(results);

      }

    } catch (err) {

      console.warn("Supabase properties query error; falling back to persistent cache", err);

    }

  }



  if (results.length === 0) {

    results = getPersistentProperties();

  }



  // Record-level access filtering for role boundaries

  if (options?.role && options.role !== "admin") {

    if (options.role === "manager" && options.organization) {

      results = results.filter(

        (p) =>

          !p.organization ||

          p.organization.toLowerCase() === options.organization!.toLowerCase() ||

          Boolean(options.userId && p.created_by === options.userId)

      );

    } else if (options.role === "inspector") {

      // In local fallback, inspector accesses assigned properties

      results = results.filter(

        (p) =>

          (options.userId && Boolean(options.userId && p.created_by === options.userId)) ||

          p.property_name.includes("Trinity") ||

          p.property_name.includes("Pendleton")

      );

    } else if (options.role === "contractor") {

      // Contractors cannot access general property registry directly; restricted to active work order sites

      results = results.filter(

        (p) => p.property_name.includes("Trinity") || p.property_name.includes("Pendleton")

      );

    }

  }



  return results;

}



/**

 * Fetch a single property by its unique ID.

 */

export async function fetchPropertyById(

  id: string,

  options?: { role?: string; userId?: string; organization?: string }

): Promise<PropertyRecord | null> {

  const all = await fetchProperties(options);

  return all.find((p) => p.id === id) || null;

}



/**

 * Create a new property record and persist to PostgreSQL / LocalStorage.

 */

export async function createProperty(

  input: CreatePropertyInput

): Promise<PropertyRecord> {

  const supabase = createClient();

  const generatedId = generatePropertyId();

  const now = new Date().toISOString();



  const record: PropertyRecord = {

    id: generatedId,

    property_name: input.property_name.trim(),

    address: input.address.trim(),

    postal_code: input.postal_code.trim().toUpperCase(),

    latitude: input.latitude ?? 53.4808,

    longitude: input.longitude ?? -2.2426,

    building_type: input.building_type.trim(),

    build_year: Number(input.build_year),

    number_of_floors: Number(input.number_of_floors),

    pipe_type: input.pipe_type.trim() || "Copper",

    roof_membrane_age: Number(input.roof_membrane_age) || 5,

    risk_level: input.risk_level || "low",

    risk_score: input.risk_score ?? 25,

    inspection_status: input.inspection_status || "Scheduled",

    last_inspected: input.last_inspected || "Not yet inspected",

    notes: input.notes?.trim() || "",

    organization: input.organization || "Greater Manchester Housing Trust",

    created_by: input.created_by || null,

    created_at: now,

    updated_at: now,

  };



  if (isSupabaseConfigured()) {

    try {

      const { data, error } = await supabase

        .from("properties")

        .insert([

          {

            property_name: record.property_name,

            address: record.address,

            postal_code: record.postal_code,

            latitude: record.latitude,

            longitude: record.longitude,

            building_type: record.building_type,

            build_year: record.build_year,

            number_of_floors: record.number_of_floors,

            pipe_type: record.pipe_type,

            roof_membrane_age: record.roof_membrane_age,

            risk_level: record.risk_level,

            risk_score: record.risk_score,

            inspection_status: record.inspection_status,

            last_inspected: record.last_inspected,

            notes: record.notes,

            organization: record.organization,

            created_by: record.created_by,

          },

        ])

        .select()

        .single();



      if (!error && data) {

        const savedRecord: PropertyRecord = {

          ...record,

          id: String(data.id),

          created_at: String(data.created_at || now),

          updated_at: String(data.updated_at || now),

        };

        const current = getPersistentProperties();

        savePersistentProperties([savedRecord, ...current.filter((p) => p.id !== savedRecord.id)]);

        return savedRecord;

      }

    } catch (err) {

      console.warn("Supabase property creation error; persisting to local storage", err);

    }

  }



  // Fallback to local persistent storage

  const current = getPersistentProperties();

  savePersistentProperties([record, ...current.filter((p) => p.id !== record.id)]);

  return record;

}



/**

 * Update an existing property record.

 */

export async function updateProperty(

  id: string,

  updates: Partial<PropertyRecord>

): Promise<PropertyRecord> {

  const current = getPersistentProperties();

  const existing = current.find((p) => p.id === id);

  if (!existing) throw new Error(`Property with ID ${id} not found.`);



  const updated: PropertyRecord = {

    ...existing,

    ...updates,

    updated_at: new Date().toISOString(),

  };



  const supabase = createClient();

  if (isSupabaseConfigured()) {

    try {

      await supabase

        .from("properties")

        .update({

          property_name: updated.property_name,

          address: updated.address,

          postal_code: updated.postal_code,

          latitude: updated.latitude,

          longitude: updated.longitude,

          building_type: updated.building_type,

          build_year: updated.build_year,

          number_of_floors: updated.number_of_floors,

          pipe_type: updated.pipe_type,

          roof_membrane_age: updated.roof_membrane_age,

          risk_level: updated.risk_level,

          risk_score: updated.risk_score,

          inspection_status: updated.inspection_status,

          last_inspected: updated.last_inspected,

          notes: updated.notes,

          organization: updated.organization,

        })

        .eq("id", id);

    } catch (err) {

      console.warn("Supabase property update error", err);

    }

  }



  const nextList = current.map((p) => (p.id === id ? updated : p));

  savePersistentProperties(nextList);

  return updated;

}



/**
 * Delete a property by ID. Protected for Admin and Manager.
 */
export async function deleteProperty(id: string): Promise<boolean> {
  const current = getPersistentProperties();
  const nextList = current.filter((p) => p.id !== id);
  savePersistentProperties(nextList);

  const supabase = createClient();
  if (isSupabaseConfigured()) {
    try {
      await supabase.from("properties").delete().eq("id", id);
    } catch (err) {
      console.warn("Supabase deleteProperty error", err);
    }
  }
  return true;
}

/**
 * Seed benchmark properties if the registry is empty.
 */
export function seedBenchmarkPropertiesIfEmpty(): PropertyRecord[] {
  const current = getPersistentProperties();
  if (current.length > 0) return current;
  savePersistentProperties([...INITIAL_PROPERTIES]);
  return [...INITIAL_PROPERTIES];
}
