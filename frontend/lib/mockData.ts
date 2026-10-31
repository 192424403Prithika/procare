export interface Property {
  id: string;
  name: string;
  address: string;
  postcode: string;
  borough: string;
  buildingType: string;
  constructionYear: number;
  totalUnits: number;
  riskLevel: "critical" | "high" | "moderate" | "low";
  riskScore: number;
  inspectionStatus: "Overdue" | "Pending Review" | "Inspected" | "Scheduled";
  lastInspected: string;
  awaabDeadline?: string;
  openWorkOrders: number;
  dewPointMargin: number; // °C difference
  notes: string;
}

export interface Inspection {
  id: string;
  propertyId: string;
  propertyName: string;
  zone: string;
  inspectorName: string;
  date: string;
  symptoms: string[];
  ambientMoistureIndex: number; // 0-100
  flashReflectionScore: number; // 0-100
  acousticLeakFrequencyHz: number;
  overallRisk: "critical" | "high" | "moderate" | "low";
  status: "Flagged for Contractor" | "Pending Review" | "Approved";
  notes: string;
}

export interface WorkOrder {
  id: string;
  propertyId: string;
  propertyName: string;
  zone: string;
  issueDescription: string;
  tradeType: "Damp Remediation" | "Thermal Insulation" | "Plumbing & Drainage" | "Acoustic Leak Detection" | "Mechanical Ventilation";
  assignedContractor: string;
  priority: "Emergency 24h" | "Urgent 7d" | "Standard 14d";
  status: "Pending Dispatch" | "In Progress" | "Awaiting Signoff" | "Completed";
  createdDate: string;
  deadlineDate: string;
  costEstimate: string;
  completionEvidence?: string;
}

export interface Contractor {
  id: string;
  name: string;
  trade: string;
  rating: number;
  activeJobs: number;
  phone: string;
  email: string;
  accreditation: string;
  availability: "Available Now" | "On Site" | "Capacity Full";
  location: string;
}

export const sampleProperties: Property[] = [
  {
    id: "PROP-0914",
    name: "Trinity Court Blocks A-C",
    address: "42 Chapel Street, Salford",
    postcode: "M3 5LE",
    borough: "Salford",
    buildingType: "Multi-Storey Social Housing (1974 Brick Cavity)",
    constructionYear: 1974,
    totalUnits: 36,
    riskLevel: "critical",
    riskScore: 89,
    inspectionStatus: "Pending Review",
    lastInspected: "2026-10-28",
    awaabDeadline: "18h remaining (Statutory 24h)",
    openWorkOrders: 3,
    dewPointMargin: 0.8,
    notes: "Thermal bridging detected behind northern gable wall. High likelihood of interstitial condensation.",
  },
  {
    id: "PROP-0422",
    name: "Pendleton Tower Estate",
    address: "18 Broad Street, Pendleton",
    postcode: "M6 5BY",
    borough: "Salford",
    buildingType: "High-Rise Residential (1968 Reinforced Concrete)",
    constructionYear: 1968,
    totalUnits: 72,
    riskLevel: "critical",
    riskScore: 84,
    inspectionStatus: "Pending Review",
    lastInspected: "2026-10-29",
    awaabDeadline: "22h remaining (Statutory 24h)",
    openWorkOrders: 2,
    dewPointMargin: 1.1,
    notes: "Acoustic hiss detected on riser pipe 4B. Dielectric moisture sensor reads 38% saturation.",
  },
  {
    id: "PROP-0118",
    name: "Ancoats Redrow Terraces",
    address: "7 Blossom Street, Ancoats",
    postcode: "M4 6AJ",
    borough: "Manchester",
    buildingType: "Victorian Solid Brick Conversion",
    constructionYear: 1898,
    totalUnits: 12,
    riskLevel: "high",
    riskScore: 71,
    inspectionStatus: "Overdue",
    lastInspected: "2026-09-15",
    awaabDeadline: "Statutory SLA breached",
    openWorkOrders: 1,
    dewPointMargin: 2.3,
    notes: "Sub-floor ventilation grilles obstructed by external landscaping. Rising damp reported.",
  },
  {
    id: "PROP-0831",
    name: "Trafford Gateway Residences",
    address: "105 Chester Road, Stretford",
    postcode: "M32 0QW",
    borough: "Trafford",
    buildingType: "Modern Steel Frame (2012 Low-Rise)",
    constructionYear: 2012,
    totalUnits: 24,
    riskLevel: "moderate",
    riskScore: 46,
    inspectionStatus: "Inspected",
    lastInspected: "2026-10-24",
    openWorkOrders: 1,
    dewPointMargin: 4.8,
    notes: "Isolated sealant degradation along second floor sill. No structural penetration.",
  },
  {
    id: "PROP-0552",
    name: "Hulme Crescent Mews",
    address: "14 Stretford Road, Hulme",
    postcode: "M15 5GQ",
    borough: "Manchester",
    buildingType: "Community Housing (1994 Timber Frame)",
    constructionYear: 1994,
    totalUnits: 18,
    riskLevel: "low",
    riskScore: 18,
    inspectionStatus: "Inspected",
    lastInspected: "2026-10-20",
    openWorkOrders: 0,
    dewPointMargin: 7.2,
    notes: "Active MVHR systems verified. Excellent internal airflow and zero thermal anomalies.",
  },
  {
    id: "PROP-0677",
    name: "Bolton Moorhead Court",
    address: "89 Deansgate, Bolton",
    postcode: "BL1 1HQ",
    borough: "Bolton",
    buildingType: "Inter-war Cavity Brick (1938)",
    constructionYear: 1938,
    totalUnits: 20,
    riskLevel: "moderate",
    riskScore: 52,
    inspectionStatus: "Scheduled",
    lastInspected: "2026-08-11",
    openWorkOrders: 1,
    dewPointMargin: 3.5,
    notes: "Scheduled for quarterly acoustic scan and ambient dew-point recalculation.",
  },
];

export const sampleInspections: Inspection[] = [
  {
    id: "INSP-2026-102",
    propertyId: "PROP-0914",
    propertyName: "Trinity Court Blocks A-C",
    zone: "Unit 14 - Bathroom Wall & Ceiling",
    inspectorName: "Markus Thorne, MRICS",
    date: "2026-10-28",
    symptoms: ["Musty odour", "Damp patches", "Peeling plaster", "Visible mould"],
    ambientMoistureIndex: 82,
    flashReflectionScore: 78,
    acousticLeakFrequencyHz: 1240,
    overallRisk: "critical",
    status: "Flagged for Contractor",
    notes: "OpenCV flash attenuation analysis indicates high sub-surface water pooling. Micro-acoustic FFT peaked at 1.24 kHz, characteristic of pressurized pipe pinhole leak.",
  },
  {
    id: "INSP-2026-098",
    propertyId: "PROP-0422",
    propertyName: "Pendleton Tower Estate",
    zone: "Floor 4 Service Riser Shaft",
    inspectorName: "Sarah Jenkins, CEng",
    date: "2026-10-29",
    symptoms: ["Spongy surface", "Musty odour"],
    ambientMoistureIndex: 76,
    flashReflectionScore: 71,
    acousticLeakFrequencyHz: 980,
    overallRisk: "critical",
    status: "Pending Review",
    notes: "Riser sleeve shows continuous acoustic resonance. Acoustic FFT peak observed at 980Hz with 18dB elevation above ambient floor noise.",
  },
  {
    id: "INSP-2026-084",
    propertyId: "PROP-0118",
    propertyName: "Ancoats Redrow Terraces",
    zone: "Ground Floor Front Lounge Skirting",
    inspectorName: "Markus Thorne, MRICS",
    date: "2026-09-15",
    symptoms: ["Cold draft", "Damp patches"],
    ambientMoistureIndex: 64,
    flashReflectionScore: 42,
    acousticLeakFrequencyHz: 0,
    overallRisk: "high",
    status: "Approved",
    notes: "No pipe acoustic signal detected. Moisture primarily driven by hygroscopic salt migration through solid masonry.",
  },
  {
    id: "INSP-2026-071",
    propertyId: "PROP-0831",
    propertyName: "Trafford Gateway Residences",
    zone: "Window reveal - Apt 2B",
    inspectorName: "Liam O'Connor",
    date: "2026-10-24",
    symptoms: ["Peeling plaster"],
    ambientMoistureIndex: 45,
    flashReflectionScore: 38,
    acousticLeakFrequencyHz: 0,
    overallRisk: "moderate",
    status: "Approved",
    notes: "Minor thermal bridge on aluminium frame rebate. Rectified with internal silicone re-application.",
  },
];

export const sampleWorkOrders: WorkOrder[] = [
  {
    id: "WO-8821",
    propertyId: "PROP-0914",
    propertyName: "Trinity Court Blocks A-C",
    zone: "Unit 14 - Bathroom Wall Riser",
    issueDescription: "Pressurized supply line pinhole leak detected via FFT acoustics (1.24 kHz). Severe sub-surface moisture anomaly.",
    tradeType: "Plumbing & Drainage",
    assignedContractor: "Apex Fluid Dynamics Ltd",
    priority: "Emergency 24h",
    status: "In Progress",
    createdDate: "2026-10-28",
    deadlineDate: "2026-10-29 (18h)",
    costEstimate: "£420.00",
  },
  {
    id: "WO-8819",
    propertyId: "PROP-0422",
    propertyName: "Pendleton Tower Estate",
    zone: "Floor 4 Service Riser Shaft",
    issueDescription: "Acoustic resonance at 980Hz and dielectric reading 38%. Moisture extraction and line isolation required.",
    tradeType: "Damp Remediation",
    assignedContractor: "EnviroDry Remediation UK",
    priority: "Emergency 24h",
    status: "Pending Dispatch",
    createdDate: "2026-10-29",
    deadlineDate: "2026-10-30 (22h)",
    costEstimate: "£850.00",
  },
  {
    id: "WO-8794",
    propertyId: "PROP-0118",
    propertyName: "Ancoats Redrow Terraces",
    zone: "Sub-floor void & Airbricks",
    issueDescription: "Obstructed terracotta sub-floor ventilators causing cavity condensation and rising moisture.",
    tradeType: "Thermal Insulation",
    assignedContractor: "NorthWest Cavity & Vent Ltd",
    priority: "Urgent 7d",
    status: "In Progress",
    createdDate: "2026-10-25",
    deadlineDate: "2026-11-01",
    costEstimate: "£640.00",
  },
  {
    id: "WO-8762",
    propertyId: "PROP-0831",
    propertyName: "Trafford Gateway Residences",
    zone: "Apt 2B window jamb",
    issueDescription: "Sealant failure remediation and thermal mastic application.",
    tradeType: "Damp Remediation",
    assignedContractor: "EnviroDry Remediation UK",
    priority: "Standard 14d",
    status: "Completed",
    createdDate: "2026-10-18",
    deadlineDate: "2026-11-01",
    costEstimate: "£210.00",
    completionEvidence: "Signoff certificate #ES-9921 signed by Lead Inspector.",
  },
];

export const sampleContractors: Contractor[] = [
  {
    id: "CONT-01",
    name: "EnviroDry Remediation UK",
    trade: "Damp & Mould Remediation",
    rating: 4.9,
    activeJobs: 4,
    phone: "+44 (0) 161 829 3011",
    email: "dispatch@envirodry-remediation.com",
    accreditation: "PCA (Property Care Association) & PAS 2035",
    availability: "Available Now",
    location: "Salford Quays, Manchester",
  },
  {
    id: "CONT-02",
    name: "Apex Fluid Dynamics Ltd",
    trade: "Acoustic Leak Detection & Plumbing",
    rating: 4.8,
    activeJobs: 3,
    phone: "+44 (0) 161 902 4410",
    email: "operations@apexfluids.co.uk",
    accreditation: "CIPHE & Gas Safe Registered",
    availability: "On Site",
    location: "Trafford Park, Greater Manchester",
  },
  {
    id: "CONT-03",
    name: "NorthWest Cavity & Vent Ltd",
    trade: "Thermal Envelope & MVHR Ventilation",
    rating: 4.7,
    activeJobs: 5,
    phone: "+44 (0) 161 744 1920",
    email: "quotes@nwcavityvent.co.uk",
    accreditation: "TrustMark & BBA Certified",
    availability: "Available Now",
    location: "Bolton, Greater Manchester",
  },
  {
    id: "CONT-04",
    name: "Vanguard Forensic Drying",
    trade: "Commercial Dehumidification & Structural Drying",
    rating: 4.95,
    activeJobs: 2,
    phone: "+44 (0) 161 633 8811",
    email: "emergency@vanguard-drying.co.uk",
    accreditation: "BDMA (British Damage Management Association)",
    availability: "Available Now",
    location: "Ancoats, Central Manchester",
  },
];
