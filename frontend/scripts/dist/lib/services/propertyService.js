"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePropertyId = generatePropertyId;
exports.fetchProperties = fetchProperties;
exports.fetchPropertyById = fetchPropertyById;
exports.createProperty = createProperty;
exports.updateProperty = updateProperty;
exports.deleteProperty = deleteProperty;
exports.seedBenchmarkPropertiesIfEmpty = seedBenchmarkPropertiesIfEmpty;
const client_1 = require("@/lib/supabase/client");
const STORAGE_KEY = "propcare_properties_registry_v2";
/**
 * Generate a unique property reference identifier.
 */
function generatePropertyId() {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `PROP-${randomSuffix}`;
}
/**
 * Retrieve persistent property records from browser storage.
 */
function getPersistentProperties() {
    if (typeof window === "undefined")
        return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw)
            return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
/**
 * Save property records to persistent browser storage.
 */
function savePersistentProperties(records) {
    if (typeof window === "undefined")
        return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }
    catch (err) {
        console.error("Failed to save property records to persistent storage", err);
    }
}
/**
 * Fetch all properties from PostgreSQL (Supabase) with persistent cache fallback.
 */
async function fetchProperties() {
    const supabase = (0, client_1.createClient)();
    if ((0, client_1.isSupabaseConfigured)()) {
        try {
            const { data, error } = await supabase
                .from("properties")
                .select("*")
                .order("created_at", { ascending: false });
            if (!error && data) {
                const mapped = data.map((item) => ({
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
                    risk_level: item.risk_level || "low",
                    risk_score: Number(item.risk_score || 20),
                    inspection_status: item.inspection_status || "Scheduled",
                    last_inspected: String(item.last_inspected || "Not yet inspected"),
                    notes: String(item.notes || ""),
                    created_by: item.created_by ? String(item.created_by) : null,
                    created_at: String(item.created_at || new Date().toISOString()),
                    updated_at: String(item.updated_at || new Date().toISOString()),
                }));
                savePersistentProperties(mapped);
                return mapped;
            }
        }
        catch (err) {
            console.warn("Supabase properties query error; falling back to persistent cache", err);
        }
    }
    return getPersistentProperties();
}
/**
 * Fetch a single property by its unique ID.
 */
async function fetchPropertyById(id) {
    const supabase = (0, client_1.createClient)();
    if ((0, client_1.isSupabaseConfigured)()) {
        try {
            const { data, error } = await supabase
                .from("properties")
                .select("*")
                .eq("id", id)
                .single();
            if (!error && data) {
                return {
                    id: String(data.id),
                    property_name: String(data.property_name || ""),
                    address: String(data.address || ""),
                    postal_code: String(data.postal_code || ""),
                    latitude: data.latitude !== null && data.latitude !== undefined ? Number(data.latitude) : null,
                    longitude: data.longitude !== null && data.longitude !== undefined ? Number(data.longitude) : null,
                    building_type: String(data.building_type || "Social Housing"),
                    build_year: Number(data.build_year || 1980),
                    number_of_floors: Number(data.number_of_floors || 3),
                    pipe_type: String(data.pipe_type || "Copper"),
                    roof_membrane_age: Number(data.roof_membrane_age || 5),
                    risk_level: data.risk_level || "low",
                    risk_score: Number(data.risk_score || 20),
                    inspection_status: data.inspection_status || "Scheduled",
                    last_inspected: String(data.last_inspected || "Not yet inspected"),
                    notes: String(data.notes || ""),
                    created_by: data.created_by ? String(data.created_by) : null,
                    created_at: String(data.created_at || new Date().toISOString()),
                    updated_at: String(data.updated_at || new Date().toISOString()),
                };
            }
        }
        catch {
            // Fall back to persistent storage
        }
    }
    const all = getPersistentProperties();
    return all.find((p) => p.id === id) || null;
}
/**
 * Create and persist a new property record in PostgreSQL.
 */
async function createProperty(input) {
    const supabase = (0, client_1.createClient)();
    const generatedId = generatePropertyId();
    const now = new Date().toISOString();
    // Validate required fields
    if (!input.property_name?.trim()) {
        throw new Error("Property name is required.");
    }
    if (!input.address?.trim()) {
        throw new Error("Full street address is required.");
    }
    if (!input.postal_code?.trim()) {
        throw new Error("Postal code is required.");
    }
    if (!input.build_year || input.build_year < 1800 || input.build_year > new Date().getFullYear()) {
        throw new Error(`Build year must be between 1800 and ${new Date().getFullYear()}.`);
    }
    if (!input.number_of_floors || input.number_of_floors < 1 || input.number_of_floors > 60) {
        throw new Error("Number of floors must be between 1 and 60.");
    }
    const record = {
        id: generatedId,
        property_name: input.property_name.trim(),
        address: input.address.trim(),
        postal_code: input.postal_code.trim().toUpperCase(),
        latitude: input.latitude !== undefined && input.latitude !== null ? Number(input.latitude) : 53.4808,
        longitude: input.longitude !== undefined && input.longitude !== null ? Number(input.longitude) : -2.2426,
        building_type: input.building_type.trim(),
        build_year: Number(input.build_year),
        number_of_floors: Number(input.number_of_floors),
        pipe_type: input.pipe_type.trim() || "Copper",
        roof_membrane_age: Number(input.roof_membrane_age ?? 5),
        risk_level: input.risk_level || "low",
        risk_score: input.risk_score ?? 20,
        inspection_status: input.inspection_status || "Scheduled",
        last_inspected: input.last_inspected || "Not yet inspected",
        notes: input.notes?.trim() || "",
        created_by: input.created_by || null,
        created_at: now,
        updated_at: now,
    };
    if ((0, client_1.isSupabaseConfigured)()) {
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
                },
            ])
                .select()
                .single();
            if (!error && data) {
                const createdFromDb = {
                    ...record,
                    id: String(data.id),
                    created_at: String(data.created_at || now),
                    updated_at: String(data.updated_at || now),
                };
                const existing = getPersistentProperties();
                savePersistentProperties([createdFromDb, ...existing.filter((p) => p.id !== createdFromDb.id)]);
                return createdFromDb;
            }
        }
        catch (err) {
            console.warn("Supabase property insert error, falling back to persistent storage", err);
        }
    }
    // Save to persistent storage
    const existing = getPersistentProperties();
    const updated = [record, ...existing.filter((p) => p.id !== record.id)];
    savePersistentProperties(updated);
    return record;
}
/**
 * Update an existing property in PostgreSQL and persistent storage.
 */
async function updateProperty(id, updates) {
    const supabase = (0, client_1.createClient)();
    const now = new Date().toISOString();
    if ((0, client_1.isSupabaseConfigured)()) {
        try {
            const { data, error } = await supabase
                .from("properties")
                .update({
                ...updates,
                updated_at: now,
            })
                .eq("id", id)
                .select()
                .single();
            if (!error && data) {
                const updatedDb = data;
                const currentLocal = getPersistentProperties().map((p) => p.id === id ? updatedDb : p);
                savePersistentProperties(currentLocal);
                return updatedDb;
            }
        }
        catch (err) {
            console.warn("Supabase property update error, updating persistent storage", err);
        }
    }
    const current = getPersistentProperties();
    let updatedRecord = null;
    const updated = current.map((p) => {
        if (p.id === id) {
            updatedRecord = { ...p, ...updates, updated_at: now };
            return updatedRecord;
        }
        return p;
    });
    if (updatedRecord) {
        savePersistentProperties(updated);
    }
    return updatedRecord;
}
/**
 * Delete a property from PostgreSQL and persistent storage.
 */
async function deleteProperty(id) {
    const supabase = (0, client_1.createClient)();
    if ((0, client_1.isSupabaseConfigured)()) {
        try {
            await supabase.from("properties").delete().eq("id", id);
        }
        catch (err) {
            console.warn("Supabase property delete error", err);
        }
    }
    const current = getPersistentProperties();
    const filtered = current.filter((p) => p.id !== id);
    savePersistentProperties(filtered);
    return true;
}
/**
 * Seed initial benchmark housing portfolio if storage is completely empty.
 */
function seedBenchmarkPropertiesIfEmpty() {
    const existing = getPersistentProperties();
    if (existing.length > 0)
        return existing;
    const benchmark = [
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
            notes: "Thermal bridging detected behind northern gable wall. High likelihood of interstitial condensation.",
            created_at: "2026-10-28T09:15:00Z",
            updated_at: "2026-10-28T09:15:00Z",
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
            notes: "Acoustic hiss detected on riser pipe 4B. Dielectric moisture sensor reads 38% saturation.",
            created_at: "2026-10-29T11:30:00Z",
            updated_at: "2026-10-29T11:30:00Z",
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
            notes: "Sub-floor ventilation grilles obstructed by external landscaping. Rising damp reported.",
            created_at: "2026-09-15T14:20:00Z",
            updated_at: "2026-09-15T14:20:00Z",
        },
        {
            id: "PROP-0831",
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
            notes: "Isolated sealant degradation along second floor sill. No structural penetration.",
            created_at: "2026-10-24T10:00:00Z",
            updated_at: "2026-10-24T10:00:00Z",
        },
    ];
    savePersistentProperties(benchmark);
    return benchmark;
}
