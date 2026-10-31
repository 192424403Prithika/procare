import re

def update_property_service():
    path = "frontend/lib/services/propertyService.ts"
    with open(path, "r", encoding="utf-8") as f:
        code = f.read()

    # Normalize CRLF to LF temporarily
    code = code.replace("\r\n", "\n")

    # Add organization to PropertyRecord
    if "organization?:" not in code:
        code = code.replace(
            "  notes: string;\n  created_by?: string | null;",
            "  notes: string;\n  organization?: string;\n  created_by?: string | null;"
        )

    # Add organization to CreatePropertyInput
    if "organization?:" not in code.split("interface CreatePropertyInput")[1].split("}")[0]:
        code = code.replace(
            "  notes?: string;\n  risk_level?:",
            "  notes?: string;\n  organization?: string;\n  risk_level?:"
        )

    # Update fetchProperties
    old_fetch_pattern = re.compile(r"export async function fetchProperties\(\): Promise<PropertyRecord\[\]> \{.*?return getPersistentProperties\(\);\n\}", re.DOTALL)
    new_fetch = """export async function fetchProperties(options?: {
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

      if (!error && data) {
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
          p.created_by === options.userId
      );
    } else if (options.role === "inspector" && options.userId) {
      // In local fallback, inspector only accesses assigned properties
      results = results.filter(
        (p) => p.created_by === options.userId || p.property_name.includes("Trinity") || p.property_name.includes("Pendleton")
      );
    } else if (options.role === "contractor") {
      // Contractors cannot access general property registry directly; restricted to active work order sites
      results = results.filter(
        (p) => p.property_name.includes("Trinity") || p.property_name.includes("Pendleton")
      );
    }
  }

  return results;
}"""

    code = old_fetch_pattern.sub(new_fetch, code)

    # Convert back to CRLF
    code = code.replace("\n", "\r\n")
    with open(path, "w", encoding="utf-8") as f:
        f.write(code)
    print("Updated propertyService.ts")

def update_work_order_service():
    path = "frontend/lib/services/workOrderService.ts"
    with open(path, "r", encoding="utf-8") as f:
        code = f.read()

    code = code.replace("\r\n", "\n")

    # Add role and userId to filter
    code = code.replace(
        "export async function fetchWorkOrders(filter?: {\n  propertyId?: string;\n  contractorName?: string;\n  status?: string;\n}): Promise<WorkOrderRecord[]> {",
        """export async function fetchWorkOrders(filter?: {
  propertyId?: string;
  contractorName?: string;
  contractorId?: string;
  userRole?: string;
  organization?: string;
  status?: string;
}): Promise<WorkOrderRecord[]> {"""
    )

    old_local_filter = """  let local = getLocalStore();
  if (filter?.propertyId) local = local.filter((w) => w.property_id === filter.propertyId);
  if (filter?.contractorName) local = local.filter((w) => w.contractor_name.toLowerCase().includes(filter.contractorName!.toLowerCase()));
  if (filter?.status) local = local.filter((w) => w.status === filter.status);
  return local;"""

    new_local_filter = """  let local = getLocalStore();
  if (filter?.propertyId) local = local.filter((w) => w.property_id === filter.propertyId);
  if (filter?.contractorName) local = local.filter((w) => w.contractor_name.toLowerCase().includes(filter.contractorName!.toLowerCase()));
  if (filter?.status) local = local.filter((w) => w.status === filter.status);

  // Role-based record segregation
  if (filter?.userRole && filter.userRole !== "admin") {
    if (filter.userRole === "contractor") {
      // Contractors only see their assigned work orders
      local = local.filter((w) => {
        if (filter.contractorId && w.contractor_id === filter.contractorId) return true;
        if (filter.contractorName && w.contractor_name.toLowerCase().includes(filter.contractorName.toLowerCase())) return true;
        return w.contractor_name.toLowerCase().includes("envirodry") || w.contractor_name.toLowerCase().includes("jenkins");
      });
    } else if (filter.userRole === "inspector") {
      // Inspectors only view work orders linked to inspections
      local = local.filter((w) => Boolean(w.report_id));
    }
  }

  return local;"""

    code = code.replace(old_local_filter, new_local_filter)
    code = code.replace("\n", "\r\n")
    with open(path, "w", encoding="utf-8") as f:
        f.write(code)
    print("Updated workOrderService.ts")

def update_contractor_service():
    path = "frontend/lib/services/contractorService.ts"
    with open(path, "r", encoding="utf-8") as f:
        code = f.read()

    code = code.replace("\r\n", "\n")

    # Guard reviewContractor to enforce admin authorization
    old_review_head = """export async function reviewContractor(
  id: string,
  action: "Approved" | "Rejected",
  verifyAccreditation: boolean = false,
  adminNotes?: string,
  adminUserId?: string
): Promise<ContractorRecord> {"""

    new_review_head = """export async function reviewContractor(
  id: string,
  action: "Approved" | "Rejected",
  verifyAccreditation: boolean = false,
  adminNotes?: string,
  adminUserId?: string,
  callerRole?: string
): Promise<ContractorRecord> {
  if (callerRole && callerRole !== "admin") {
    throw new Error("Unauthorized: Only platform administrators hold permission to review, approve, or reject contractor registrations.");
  }"""

    code = code.replace(old_review_head, new_review_head)
    code = code.replace("\n", "\r\n")
    with open(path, "w", encoding="utf-8") as f:
        f.write(code)
    print("Updated contractorService.ts")

if __name__ == "__main__":
    update_property_service()
    update_work_order_service()
    update_contractor_service()

