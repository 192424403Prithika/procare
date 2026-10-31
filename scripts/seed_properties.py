with open("frontend/lib/services/propertyService.ts", "r", encoding="utf-8") as f:
    code = f.read()

code = code.replace("\r\n", "\n")

old_seed = """// Server-side / memory cache fallback when running in Node.js runtime or SSR
let memoryPropertiesRegistry: PropertyRecord[] = [];"""

new_seed = """export const INITIAL_PROPERTIES: PropertyRecord[] = [
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
let memoryPropertiesRegistry: PropertyRecord[] = [...INITIAL_PROPERTIES];"""

code = code.replace(old_seed, new_seed)
code = code.replace("\n", "\r\n")
with open("frontend/lib/services/propertyService.ts", "w", encoding="utf-8") as f:
    f.write(code)
print("Seeded INITIAL_PROPERTIES successfully")

