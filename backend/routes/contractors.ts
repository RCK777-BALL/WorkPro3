/*
 * SPDX-License-Identifier: MIT
 */

import { Router, type Request } from "express";

import { requireAuth } from "../middleware/authMiddleware";
import type { AuthedRequest } from "../types/http";

interface Credential {
  id: string;
  type: string;
  expiresOn: string;
  documentUrl: string;
  status: "active" | "expired";
}

interface OnboardingRequirement {
  id: string;
  title: string;
  completed: boolean;
}

interface ApprovalFlow {
  safety: boolean;
  insurance: boolean;
  operations: boolean;
}

interface Assignment {
  workOrderId: string;
  assignedAt: string;
  assignedBy: string;
  status: "assigned" | "rejected";
  reason?: string;
}

interface AuditLog {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  details?: string;
}

interface ContractorProfile {
  id: string;
  name: string;
  role: string;
  vendorId: string;
  onboarding: {
    status: "pending" | "in_progress" | "completed";
    requirements: OnboardingRequirement[];
  };
  approvals: ApprovalFlow;
  credentials: Credential[];
  assignmentHistory: Assignment[];
  auditLogs: AuditLog[];
  tenantId?: string;
}

const vendorContacts: Record<
  string,
  { name: string; contactName: string; phone: string; email: string }
> = {
  "VEN-001": {
    name: "Northwind Safety",
    contactName: "Jamie Ortega",
    phone: "(312) 555-1020",
    email: "jorgeta@northwind.com",
  },
  "VEN-002": {
    name: "Summit Industrial Partners",
    contactName: "Colleen Matthews",
    phone: "(720) 555-2299",
    email: "cmatthews@summitpartners.com",
  },
  "VEN-003": {
    name: "Metro Automation",
    contactName: "Ray Malik",
    phone: "(917) 555-9932",
    email: "rmalik@metroauto.com",
  },
};

const resolveActor = (req: Request): string => {
  const authed = req as unknown as AuthedRequest;
  const email = authed.user?.email;
  return typeof email === "string" && email.trim() ? email : "system";
};

const baseContractors: ContractorProfile[] = [
  {
    id: "CTR-1001",
    name: "Nova Mechanical",
    role: "HVAC Technician",
    vendorId: "VEN-001",
    onboarding: {
      status: "completed",
      requirements: [
        { id: "nda", title: "NDA Signed", completed: true },
        { id: "orientation", title: "Site Orientation", completed: true },
      ],
    },
    approvals: { safety: true, insurance: true, operations: true },
    credentials: [
      {
        id: "cred-1",
        type: "Liability Insurance",
        expiresOn: "2025-01-15",
        documentUrl: "/docs/liability-1001.pdf",
        status: "active",
      },
      {
        id: "cred-2",
        type: "OSHA 30",
        expiresOn: "2023-12-31",
        documentUrl: "/docs/osha30-1001.pdf",
        status: "expired",
      },
    ],
    assignmentHistory: [
      {
        workOrderId: "WO-4432",
        assignedAt: "2024-06-12T14:00:00.000Z",
        assignedBy: "system",
        status: "assigned",
      },
    ],
    auditLogs: [
      {
        id: "audit-1",
        action: "profile.created",
        actor: "system",
        timestamp: "2024-05-01T10:00:00.000Z",
        details: "Imported from vendor sync",
      },
    ],
  },
  {
    id: "CTR-2001",
    name: "Atlas Services",
    role: "Millwright",
    vendorId: "VEN-002",
    onboarding: {
      status: "in_progress",
      requirements: [
        { id: "safety-briefing", title: "Safety Briefing", completed: true },
        { id: "site-orientation", title: "Site Orientation", completed: false },
      ],
    },
    approvals: { safety: true, insurance: false, operations: true },
    credentials: [
      {
        id: "cred-3",
        type: "Workers Comp",
        expiresOn: "2025-04-01",
        documentUrl: "/docs/wc-2001.pdf",
        status: "active",
      },
    ],
    assignmentHistory: [],
    auditLogs: [
      {
        id: "audit-2",
        action: "onboarding.started",
        actor: "system",
        timestamp: "2024-07-08T12:00:00.000Z",
        details: "Requirements assigned",
      },
    ],
  },
  {
    id: "CTR-3001",
    name: "Precision Contractors",
    role: "Electrical",
    vendorId: "VEN-003",
    onboarding: {
      status: "completed",
      requirements: [
        { id: "drug-screen", title: "Drug Screen", completed: true },
        { id: "badge-photo", title: "Badge Photo", completed: true },
      ],
    },
    approvals: { safety: false, insurance: true, operations: true },
    credentials: [
      {
        id: "cred-4",
        type: "State Electrical License",
        expiresOn: "2025-07-30",
        documentUrl: "/docs/electrical-3001.pdf",
        status: "active",
      },
    ],
    assignmentHistory: [
      {
        workOrderId: "WO-4000",
        assignedAt: "2024-09-14T09:30:00.000Z",
        assignedBy: "scheduler.bot",
        status: "assigned",
      },
    ],
    auditLogs: [
      {
        id: "audit-3",
        action: "approval.pending",
        actor: "system",
        timestamp: "2024-09-10T08:00:00.000Z",
        details: "Awaiting safety approval",
      },
    ],
  },
];

let contractors: ContractorProfile[] = baseContractors.map((profile) =>
  JSON.parse(JSON.stringify(profile)),
);

const refreshCredentialStatus = (credential: Credential): Credential => {
  const isExpired = new Date(credential.expiresOn).getTime() < Date.now();
  return { ...credential, status: isExpired ? "expired" : "active" };
};

const findContractor = (id: string): ContractorProfile | undefined =>
  contractors.find((profile) => profile.id === id);

const evaluateEligibility = (profile: ContractorProfile) => {
  const refreshedCredentials = profile.credentials.map(refreshCredentialStatus);
  profile.credentials = refreshedCredentials;

  const blockers: string[] = [];
  const warnings: string[] = [];

  const incompleteRequirements = profile.onboarding.requirements.filter((req) => !req.completed);
  if (profile.onboarding.status !== "completed") {
    blockers.push("Onboarding incomplete");
  }
  if (incompleteRequirements.length > 0) {
    blockers.push(
      `Missing requirements: ${incompleteRequirements.map((req) => req.title).join(", ")}`,
    );
  }

  (Object.entries(profile.approvals) as Array<[keyof ApprovalFlow, boolean]>).forEach(
    ([stage, approved]) => {
      if (!approved) {
        blockers.push(`${stage} approval pending`);
      }
    },
  );

  refreshedCredentials.forEach((credential) => {
    const expires = new Date(credential.expiresOn).getTime();
    if (credential.status === "expired" || expires < Date.now()) {
      blockers.push(`Expired credential: ${credential.type}`);
    } else {
      const thirtyDays = 1000 * 60 * 60 * 24 * 30;
      if (expires - Date.now() < thirtyDays) {
        warnings.push(`${credential.type} expires soon`);
      }
    }
  });

  return {
    eligible: blockers.length === 0,
    blockers,
    warnings,
  };
};

const addAuditLog = (profile: ContractorProfile, entry: Omit<AuditLog, "id" | "timestamp">) => {
  profile.auditLogs.unshift({
    id: `audit-${profile.auditLogs.length + 1}`,
    timestamp: new Date().toISOString(),
    ...entry,
  });
};

export const resetContractorState = () => {
  contractors = baseContractors.map((profile) => JSON.parse(JSON.stringify(profile)));
};

const router = Router();

router.use(requireAuth);

router.get("/roster", (_req, res) => {
  const data = contractors.map((contractor) => {
    const eligibility = evaluateEligibility(contractor);
    return {
      id: contractor.id,
      name: contractor.name,
      role: contractor.role,
      vendor: vendorContacts[contractor.vendorId] ?? null,
      onboarding: contractor.onboarding,
      approvals: contractor.approvals,
      credentials: contractor.credentials,
      assignmentHistory: contractor.assignmentHistory,
      eligibility,
    };
  });

  res.json({ success: true, data });
});

router.get("/:id", (req, res) => {
  const contractor = findContractor(req.params.id);
  if (!contractor) {
    res.status(404).json({ message: "Contractor not found" });
    return;
  }

  const eligibility = evaluateEligibility(contractor);
  const vendor = vendorContacts[contractor.vendorId];

  res.json({
    success: true,
    data: {
      ...contractor,
      vendor,
      eligibility,
    },
  });
});

router.post("/:id/onboarding", (req, res) => {
  const contractor = findContractor(req.params.id);
  if (!contractor) {
    res.status(404).json({ message: "Contractor not found" });
    return;
  }

  const { requirementId } = req.body as { requirementId?: string };
  if (!requirementId) {
    res.status(400).json({ message: "requirementId is required" });
    return;
  }

  const requirement = contractor.onboarding.requirements.find((reqItem) => reqItem.id === requirementId);
  if (!requirement) {
    res.status(404).json({ message: "Requirement not found" });
    return;
  }

  requirement.completed = true;
  const remaining = contractor.onboarding.requirements.filter((item) => !item.completed);
  contractor.onboarding.status = remaining.length === 0 ? "completed" : "in_progress";

  addAuditLog(contractor, {
    action: "onboarding.completed",
    actor: resolveActor(req),
    details: `Requirement ${requirement.title} marked complete`,
  });

  res.json({
    success: true,
    data: contractor.onboarding,
  });
});

router.post("/:id/approve", (req, res) => {
  const contractor = findContractor(req.params.id);
  if (!contractor) {
    res.status(404).json({ message: "Contractor not found" });
    return;
  }

  const { stage, approver } = req.body as { stage?: keyof ApprovalFlow; approver?: string };

  if (!stage || !contractor.approvals.hasOwnProperty(stage)) {
    res.status(400).json({ message: "Valid approval stage is required" });
    return;
  }

  contractor.approvals[stage] = true;

  addAuditLog(contractor, {
    action: `approval.${stage}`,
    actor: approver || resolveActor(req),
    details: `${stage} approval recorded`,
  });

  res.json({ success: true, data: contractor.approvals });
});

router.post("/:id/credentials", (req, res) => {
  const contractor = findContractor(req.params.id);
  if (!contractor) {
    res.status(404).json({ message: "Contractor not found" });
    return;
  }

  const { type, expiresOn, documentUrl } = req.body as {
    type?: string;
    expiresOn?: string;
    documentUrl?: string;
  };

  if (!type || !expiresOn || !documentUrl) {
    res.status(400).json({ message: "type, expiresOn, and documentUrl are required" });
    return;
  }

  const credential: Credential = refreshCredentialStatus({
    id: `cred-${contractor.credentials.length + 1}`,
    type,
    expiresOn,
    documentUrl,
    status: "active",
  });

  contractor.credentials.push(credential);
  addAuditLog(contractor, {
    action: "credential.added",
    actor: resolveActor(req),
    details: `${credential.type} added with expiry ${credential.expiresOn}`,
  });

  res.status(201).json({ success: true, data: credential });
});

router.post("/:id/assignments", (req, res) => {
  const contractor = findContractor(req.params.id);
  if (!contractor) {
    res.status(404).json({ message: "Contractor not found" });
    return;
  }

  const { workOrderId } = req.body as { workOrderId?: string };

  if (!workOrderId) {
    res.status(400).json({ message: "workOrderId is required" });
    return;
  }

  const eligibility = evaluateEligibility(contractor);
  if (!eligibility.eligible) {
    const reason = eligibility.blockers.join("; ");
    contractor.assignmentHistory.push({
      workOrderId,
      assignedAt: new Date().toISOString(),
      assignedBy: resolveActor(req),
      status: "rejected",
      reason,
    });

    addAuditLog(contractor, {
      action: "assignment.rejected",
      actor: resolveActor(req),
      details: `Work order ${workOrderId} blocked: ${reason}`,
    });

    res.status(400).json({ message: "Contractor is not eligible for assignment", reason });
    return;
  }

  const record: Assignment = {
    workOrderId,
    assignedAt: new Date().toISOString(),
    assignedBy: resolveActor(req),
    status: "assigned",
  };

  contractor.assignmentHistory.push(record);
  addAuditLog(contractor, {
    action: "assignment.created",
    actor: record.assignedBy,
    details: `Assigned to work order ${workOrderId}`,
  });

  res.status(201).json({ success: true, data: record });
});

router.get("/:id/audit", (req, res) => {
  const contractor = findContractor(req.params.id);
  if (!contractor) {
    res.status(404).json({ message: "Contractor not found" });
    return;
  }

  res.json({ success: true, data: contractor.auditLogs });
});

export default router;
