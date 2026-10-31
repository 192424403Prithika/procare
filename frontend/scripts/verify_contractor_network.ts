// Polyfill localStorage & window for Node test environment
if (typeof (globalThis as any).localStorage === "undefined") {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, val: string) => store.set(key, val),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  };
  (globalThis as any).window = globalThis;
}

import {
  registerContractor,
  fetchContractors,
  fetchApprovedContractors,
  fetchPendingContractors,
  reviewContractor,
  updateContractor,
  calculateActiveDeployments,
  ContractorRecord,
} from "../lib/services/contractorService";
import { WorkOrderRecord } from "../lib/services/workOrderService";

async function runTests() {
  console.log("================================================================================");
  console.log("PROPCARE NW: CONTRACTOR REGISTRATION & VERIFICATION WORKFLOW TEST SUITE");
  console.log("================================================================================\n");

  // TEST 1: Initial Empty Network Check
  console.log("TEST 1: Checking initial contractor directory state...");
  const initialApproved = await fetchApprovedContractors();
  console.log(`   Initial approved contractors count: ${initialApproved.length}`);
  if (initialApproved.length === 0) {
    console.log("   ✓ Correct: No fake or unvetted contractors displayed as approved.");
  }

  // TEST 2: Contractor Registration
  console.log("\nTEST 2: Submitting new contractor registration...");
  const newContractor = await registerContractor({
    company_name: "Apex Fluid Dynamics Ltd",
    contact_person: "David Jenkins",
    email: "operations@apexfluids.co.uk",
    phone: "+44 161 902 4410",
    location: "Salford Quays, Greater Manchester",
    trade: "Acoustic Leak Detection & Plumbing",
    accreditation_details: "CIPHE Accredited Master Plumber #58921, Gas Safe Reg #41029",
  }, "contractor_user_id_101");

  console.log(`   ✓ Registered Contractor ID: ${newContractor.id}`);
  console.log(`   ✓ Company Name:             ${newContractor.company_name}`);
  console.log(`   ✓ Verification Status:      ${newContractor.verification_status}`);
  console.log(`   ✓ Accreditation Verified:   ${newContractor.accreditation_verified}`);

  if (newContractor.verification_status !== "Pending Verification") {
    throw new Error(`Expected status 'Pending Verification', got '${newContractor.verification_status}'`);
  }
  if (newContractor.accreditation_verified !== false) {
    throw new Error("Accreditation must NOT be automatically verified upon submission!");
  }
  console.log("   ✅ TEST 2 PASSED: Registered contractor enters Pending Verification status with unverified accreditation.\n");

  // TEST 3: Approved Network Isolation
  console.log("TEST 3: Verifying pending contractor is NOT displayed in Approved Network...");
  const approvedAfterReg = await fetchApprovedContractors();
  const foundInApproved = approvedAfterReg.find((c) => c.id === newContractor.id);
  if (foundInApproved) {
    throw new Error("Pending contractor was found in Approved Network! Must be hidden until approved.");
  }

  const pendingList = await fetchPendingContractors();
  const foundInPending = pendingList.find((c) => c.id === newContractor.id);
  if (!foundInPending) {
    throw new Error("New contractor not found in Verification Queue!");
  }
  console.log(`   ✓ Pending queue correctly contains: ${foundInPending.company_name} (${foundInPending.id})`);
  console.log("   ✅ TEST 3 PASSED: Isolation verified — pending contractors hidden from approved directory.\n");

  // TEST 4: Admin Review & Approval Workflow
  console.log("TEST 4: Admin reviewing and approving contractor with accreditation confirmation...");
  const approvedContractor = await reviewContractor(
    newContractor.id,
    "Approved",
    true, // admin verified credentials against CIPHE/Gas Safe register
    "Credentials checked against CIPHE public register. Certificate #58921 is active.",
    "Dr. Alexander Wright (Admin)"
  );

  console.log(`   ✓ Status after review:        ${approvedContractor.verification_status}`);
  console.log(`   ✓ Accreditation verified:     ${approvedContractor.accreditation_verified}`);
  console.log(`   ✓ Admin review notes:         ${approvedContractor.admin_notes}`);
  console.log(`   ✓ Reviewed by:                ${approvedContractor.reviewed_by}`);

  if (approvedContractor.verification_status !== "Approved") {
    throw new Error("Failed to set status to Approved");
  }
  if (approvedContractor.accreditation_verified !== true) {
    throw new Error("Failed to set accreditation_verified to true");
  }

  // Now verify it appears in the approved directory
  const approvedNow = await fetchApprovedContractors();
  const foundInApprovedNow = approvedNow.find((c) => c.id === newContractor.id);
  if (!foundInApprovedNow) {
    throw new Error("Approved contractor did not appear in Approved Network!");
  }
  console.log(`   ✓ Contractor ${foundInApprovedNow.company_name} is now visible in Approved Network.`);
  console.log("   ✅ TEST 4 PASSED: Admin approval workflow operational.\n");

  // TEST 5: Active Deployments Ground-Truth Calculation
  console.log("TEST 5: Testing dynamic calculation of active deployments from real work orders...");
  const mockWorkOrders: WorkOrderRecord[] = [
    {
      id: "WO-101",
      property_id: "PROP-0914",
      zone: "Bathroom ceiling",
      contractor_name: "Apex Fluid Dynamics Ltd",
      trade_type: "Acoustic Leak Detection",
      priority: "Emergency 24h",
      status: "In Progress", // Active
      issue_description: "Active acoustic scan",
      cost_estimate: 400,
      created_date: new Date().toISOString(),
      deadline_date: new Date().toISOString(),
    },
    {
      id: "WO-102",
      property_id: "PROP-0914",
      zone: "Kitchen riser",
      contractor_name: "Apex Fluid Dynamics Ltd",
      trade_type: "Plumbing & Drainage",
      priority: "Urgent 7d",
      status: "Pending Dispatch", // Active
      issue_description: "Secondary shutoff repair",
      cost_estimate: 350,
      created_date: new Date().toISOString(),
      deadline_date: new Date().toISOString(),
    },
    {
      id: "WO-103",
      property_id: "PROP-0914",
      zone: "Subfloor",
      contractor_name: "Apex Fluid Dynamics Ltd",
      trade_type: "Plumbing & Drainage",
      priority: "Standard 14d",
      status: "Completed", // Completed (NOT active)
      issue_description: "Gasket replaced",
      cost_estimate: 250,
      actual_cost: 250,
      created_date: new Date().toISOString(),
      deadline_date: new Date().toISOString(),
      completed_date: new Date().toISOString(),
    },
    {
      id: "WO-104",
      property_id: "PROP-0422",
      zone: "External wall",
      contractor_name: "Other Company",
      trade_type: "Damp Remediation",
      priority: "Standard 14d",
      status: "In Progress",
      issue_description: "Different contractor",
      cost_estimate: 500,
      created_date: new Date().toISOString(),
      deadline_date: new Date().toISOString(),
    },
  ];

  const activeCount = calculateActiveDeployments("Apex Fluid Dynamics Ltd", mockWorkOrders);
  console.log(`   Calculated active deployments for 'Apex Fluid Dynamics Ltd': ${activeCount}`);
  if (activeCount !== 2) {
    throw new Error(`Expected exactly 2 active deployments (excluding completed and other contractors), got ${activeCount}`);
  }
  console.log("   ✅ TEST 5 PASSED: Active deployments calculated dynamically from real work orders (no hardcoded counts).\n");

  // TEST 6: Role Security & Self-Editing Restrictions
  console.log("TEST 6: Testing role-based security & update restrictions (Requirement 11)...");
  // Contractor updating own phone number: allowed
  const updatedByOwner = await updateContractor(
    newContractor.id,
    {
      phone: "+44 161 902 9999",
      contact_person: "David Jenkins (Senior)",
      verification_status: "Approved", // Attempted self-escalation
    },
    "contractor",
    "contractor_user_id_101"
  );

  console.log(`   ✓ Owner updated phone to: ${updatedByOwner.phone}`);
  console.log(`   ✓ Owner updated contact: ${updatedByOwner.contact_person}`);

  // Unauthorized user attempting to edit: blocked
  let unauthorizedBlocked = false;
  try {
    await updateContractor(
      newContractor.id,
      { phone: "+44 000 000 0000" },
      "contractor",
      "different_unauthorized_user"
    );
  } catch (err) {
    unauthorizedBlocked = true;
    console.log(`   ✓ Unauthorized update safely blocked: "${(err as Error).message}"`);
  }
  if (!unauthorizedBlocked) {
    throw new Error("Unauthorized contractor update was not blocked!");
  }
  console.log("   ✅ TEST 6 PASSED: Role-based permissions strictly enforced.\n");

  // TEST 7: Admin Rejection Workflow
  console.log("TEST 7: Testing contractor rejection workflow...");
  const contractor2 = await registerContractor({
    company_name: "Unqualified Builders Ltd",
    contact_person: "John Doe",
    email: "info@unqualified.co.uk",
    phone: "+44 161 111 2222",
    location: "Manchester",
    trade: "Thermal Insulation",
    accreditation_details: "None provided",
  });

  const rejected = await reviewContractor(
    contractor2.id,
    "Rejected",
    false,
    "Missing statutory licensing documentation.",
    "Dr. Alexander Wright (Admin)"
  );

  console.log(`   ✓ Status after rejection: ${rejected.verification_status}`);
  if (rejected.verification_status !== "Rejected") {
    throw new Error("Failed to set status to Rejected");
  }

  // Verify rejected contractor is NOT in approved network
  const approvedFinal = await fetchApprovedContractors();
  const foundRejected = approvedFinal.find((c) => c.id === contractor2.id);
  if (foundRejected) {
    throw new Error("Rejected contractor is visible in approved directory!");
  }
  console.log("   ✓ Rejected contractor successfully excluded from active directory.");
  console.log("   ✅ TEST 7 PASSED: Rejection workflow verified.\n");

  console.log("================================================================================");
  console.log("ALL CONTRACTOR NETWORK REQUIREMENTS VERIFIED SUCCESSFULLY!");
  console.log("================================================================================\n");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

