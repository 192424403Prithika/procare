import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchPropertyById } from "@/lib/services/propertyService";
import { fetchInspections } from "@/lib/services/inspectionService";
import { fetchWorkOrders } from "@/lib/services/workOrderService";

export interface BuildingZoneRecord {
  id: string;
  property_id: string;
  zone_code: string;
  zone_name: string;
  floor_number: number;
  floor_label: string;
  zone_type: "bathroom" | "kitchen" | "riser_shaft" | "subfloor" | "roof_envelope" | "external_wall" | "communal";
  risk_level: "critical" | "high" | "moderate" | "low";
  moisture_index: number; // 0 - 100
  acoustic_freq_hz: number; // e.g. 1240 Hz
  active_work_orders: number;
  latest_inspection_id?: string;
  inspection_notes?: string;
  photo_url?: string;
  x: number; // percentage in SVG coordinate space (0-100)
  y: number;
  width: number;
  height: number;
}

const STORAGE_KEY = "propcare_building_zones_store_v1";

export const INITIAL_BUILDING_ZONES: BuildingZoneRecord[] = [
  // Trinity Court Blocks A-C (PROP-0914)
  {
    id: "ZONE-TC-ROOF",
    property_id: "PROP-0914",
    zone_code: "ROOF-ENVELOPE",
    zone_name: "Roof Waterproofing Membrane & Parapet Copings",
    floor_number: 4,
    floor_label: "Roof Level",
    zone_type: "roof_envelope",
    risk_level: "moderate",
    moisture_index: 28.0,
    acoustic_freq_hz: 0,
    active_work_orders: 0,
    inspection_notes: "Bitumen felt intact with isolated joint shrinkage along parapet.",
    x: 10,
    y: 8,
    width: 80,
    height: 14,
  },
  {
    id: "ZONE-TC-FL3-BATH14",
    property_id: "PROP-0914",
    zone_code: "FL03-BATH-14",
    zone_name: "Unit 14 Master Bathroom & Northern Gable Wall",
    floor_number: 3,
    floor_label: "Floor 3",
    zone_type: "bathroom",
    risk_level: "critical",
    moisture_index: 88.0,
    acoustic_freq_hz: 1240.0,
    active_work_orders: 1,
    latest_inspection_id: "INSP-2026-0914",
    inspection_notes: "Thermal bridging detected. OpenCV flash attenuation delta 12.8%. Active pipe hiss at 1.24 kHz.",
    photo_url: "/test_flash.jpg",
    x: 15,
    y: 26,
    width: 32,
    height: 18,
  },
  {
    id: "ZONE-TC-FL3-LIV14",
    property_id: "PROP-0914",
    zone_code: "FL03-LIV-14",
    zone_name: "Unit 14 Living Area & Window Jamb",
    floor_number: 3,
    floor_label: "Floor 3",
    zone_type: "communal",
    risk_level: "moderate",
    moisture_index: 34.0,
    acoustic_freq_hz: 0,
    active_work_orders: 0,
    inspection_notes: "Minor condensation along double-glazed sill reveal.",
    x: 52,
    y: 26,
    width: 33,
    height: 18,
  },
  {
    id: "ZONE-TC-FL2-RISER",
    property_id: "PROP-0914",
    zone_code: "FL02-RISER-CORE",
    zone_name: "Central Service Riser Stack Chase (Shaft 2)",
    floor_number: 2,
    floor_label: "Floor 2",
    zone_type: "riser_shaft",
    risk_level: "high",
    moisture_index: 68.0,
    acoustic_freq_hz: 980.0,
    active_work_orders: 1,
    inspection_notes: "Moisture migration descending from Floor 3 bathroom stack.",
    x: 42,
    y: 48,
    width: 16,
    height: 18,
  },
  {
    id: "ZONE-TC-FL2-FLAT10",
    property_id: "PROP-0914",
    zone_code: "FL02-UNIT-10",
    zone_name: "Unit 10 Kitchen & Utility Duct",
    floor_number: 2,
    floor_label: "Floor 2",
    zone_type: "kitchen",
    risk_level: "low",
    moisture_index: 22.0,
    acoustic_freq_hz: 0,
    active_work_orders: 0,
    inspection_notes: "Mechanical extract fan operating at standard flow rate.",
    x: 62,
    y: 48,
    width: 24,
    height: 18,
  },
  {
    id: "ZONE-TC-FL1-ENTRANCE",
    property_id: "PROP-0914",
    zone_code: "FL01-COMMUNAL",
    zone_name: "Ground Floor Communal Foyer & Plant Room",
    floor_number: 1,
    floor_label: "Floor 1",
    zone_type: "communal",
    risk_level: "low",
    moisture_index: 18.0,
    acoustic_freq_hz: 0,
    active_work_orders: 0,
    inspection_notes: "Heating manifolds and booster pump seals in good order.",
    x: 15,
    y: 70,
    width: 35,
    height: 18,
  },
  {
    id: "ZONE-TC-SUBFLOOR",
    property_id: "PROP-0914",
    zone_code: "SUB-BASEMENT",
    zone_name: "Sub-Floor Void & Telescopic Vent Grilles",
    floor_number: 0,
    floor_label: "Sub-Floor Void",
    zone_type: "subfloor",
    risk_level: "moderate",
    moisture_index: 48.0,
    acoustic_freq_hz: 0,
    active_work_orders: 0,
    inspection_notes: "Airbrick clearance verified. Slight soil dampness near gable footings.",
    x: 10,
    y: 90,
    width: 80,
    height: 8,
  },
];

function getLocalStore(): BuildingZoneRecord[] {
  if (typeof window === "undefined") return INITIAL_BUILDING_ZONES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_BUILDING_ZONES));
      return INITIAL_BUILDING_ZONES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_BUILDING_ZONES;
  } catch {
    return INITIAL_BUILDING_ZONES;
  }
}

import { apiClient } from "@/lib/apiClient";

export async function fetchBuildingZonesByPropertyId(
  propertyId: string
): Promise<BuildingZoneRecord[]> {
  try {
    const data = await apiClient.get<BuildingZoneRecord[]>(
      `/api/v1/digital-twin/properties/${propertyId}/zones`
    );
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.warn("Backend digital twin fetch failed, using local store:", err);
  }

  const all = getLocalStore();
  const matched = all.filter((z) => z.property_id === propertyId);
  if (matched.length > 0) return matched;

  // Generate generic template zones for other properties
  return [
    {
      id: `ZONE-${propertyId}-ROOF`,
      property_id: propertyId,
      zone_code: "ROOF-01",
      zone_name: "Roof Weathering Envelope",
      floor_number: 3,
      floor_label: "Roof Level",
      zone_type: "roof_envelope",
      risk_level: "low",
      moisture_index: 15,
      acoustic_freq_hz: 0,
      active_work_orders: 0,
      x: 10,
      y: 10,
      width: 80,
      height: 15,
    },
    {
      id: `ZONE-${propertyId}-UPPER`,
      property_id: propertyId,
      zone_code: "UPPER-UNITS",
      zone_name: "Upper Level Residential Units",
      floor_number: 2,
      floor_label: "Floor 2",
      zone_type: "bathroom",
      risk_level: "moderate",
      moisture_index: 42,
      acoustic_freq_hz: 0,
      active_work_orders: 1,
      x: 15,
      y: 35,
      width: 70,
      height: 22,
    },
    {
      id: `ZONE-${propertyId}-GROUND`,
      property_id: propertyId,
      zone_code: "GROUND-COMMUNAL",
      zone_name: "Ground Floor Foyer & Access Corridor",
      floor_number: 1,
      floor_label: "Ground Floor",
      zone_type: "communal",
      risk_level: "low",
      moisture_index: 20,
      acoustic_freq_hz: 0,
      active_work_orders: 0,
      x: 15,
      y: 65,
      width: 70,
      height: 22,
    },
  ];
}

export async function addZoneAnnotation(
  propertyId: string,
  annotation: {
    zone_id?: string;
    defect_type: string;
    finding_note: string;
    risk_level: string;
    x: number;
    y: number;
    photo_url?: string;
  }
) {
  try {
    return await apiClient.post(`/api/v1/digital-twin/properties/${propertyId}/annotate`, annotation);
  } catch (err) {
    console.warn("Failed to save annotation to backend:", err);
    return null;
  }
}

export async function fetchZoneAnnotations(propertyId: string) {
  try {
    return await apiClient.get<any[]>(`/api/v1/digital-twin/properties/${propertyId}/annotations`);
  } catch (err) {
    return [];
  }
}

