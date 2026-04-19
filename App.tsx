import { useEffect, useMemo, useState } from "react";

type Role = "Admin" | "Manager" | "Auditor";
type AuditStatus = "green" | "amber" | "red";
type Answer = "pass" | "nc" | "fail";
type Priority = "High" | "Medium" | "Low";
type ActionStatus = "Open" | "In Progress" | "Closed";
type Screen = "dashboard" | "audits" | "admin" | "complete";

type User = {
  username: string;
  password: string;
  role: Role;
  name: string;
};

type AuditQuestion = {
  id: string;
  text: string;
};

type Audit = {
  id: string;
  name: string;
  category: string;
  siteArea: string;
  dueLabel: string;
  dueHours: number;
  priority: Priority;
  owner: string;
  templateVersion: string;
  status: AuditStatus;
  lastCompletedAt: string;
  questions: AuditQuestion[];
};

type HistoryEntry = {
  id: string;
  auditId: string;
  auditName: string;
  completedAt: string;
  completedBy: string;
  status: AuditStatus;
};

type AuditDraft = {
  responses: Record<string, Answer>;
  notes: Record<string, string>;
  updatedAt: string;
};

type ActionItem = {
  id: string;
  auditId: string;
  auditName: string;
  questionId: string;
  questionText: string;
  severity: Exclude<Answer, "pass">;
  owner: string;
  dueLabel: string;
  dueHours: number;
  status: ActionStatus;
};

type CompanyFolder = {
  id: string;
  name: string;
  onboardingFormName: string;
  auditFormCount: number;
  responseSheetName: string;
  linkedAt: string;
  onboardingVerified: boolean;
  auditFormsVerified: boolean;
  responseSheetVerified: boolean;
};

type GoogleBackendStatus = {
  ok: boolean;
  configured: boolean;
  connected: boolean;
  sharedDriveId: string;
  companies?: CompanyFolder[];
  error?: string;
};

type Toast = {
  id: number;
  title: string;
  message: string;
  tone: "neutral" | "success" | "warning";
};

const companyName = "QMS Precast";

const users: User[] = [
  { username: "admin", password: "demo", role: "Admin", name: "Olivia Hart" },
  { username: "manager", password: "demo", role: "Manager", name: "James Cole" },
  { username: "auditor", password: "demo", role: "Auditor", name: "Amira Khan" },
];

const initialAudits: Audit[] = [
  {
    id: "audit-yard",
    name: "Yard Housekeeping",
    category: "Site Safety",
    siteArea: "North Yard",
    dueLabel: "Due today",
    dueHours: 6,
    priority: "Medium",
    owner: "James Cole",
    templateVersion: "v3.2",
    status: "green",
    lastCompletedAt: "19 Apr 2026, 07:45",
    questions: [
      { id: "yard-1", text: "Walkways are clear, clean, and free from trip hazards." },
      { id: "yard-2", text: "Waste is stored correctly and removed from working areas." },
      { id: "yard-3", text: "Material stacks are stable and correctly segregated." },
      { id: "yard-4", text: "Emergency routes and muster points remain unobstructed." },
    ],
  },
  {
    id: "audit-ppe",
    name: "PPE Compliance",
    category: "Workforce Safety",
    siteArea: "Main Production Hall",
    dueLabel: "Near overdue",
    dueHours: 3,
    priority: "High",
    owner: "Amira Khan",
    templateVersion: "v2.8",
    status: "amber",
    lastCompletedAt: "18 Apr 2026, 15:10",
    questions: [
      { id: "ppe-1", text: "Required PPE is worn correctly in all active production zones." },
      { id: "ppe-2", text: "Damaged or expired PPE has been removed from use." },
      { id: "ppe-3", text: "Visitors and contractors are briefed on PPE requirements." },
      { id: "ppe-4", text: "PPE storage points are stocked, tidy, and easy to access." },
    ],
  },
  {
    id: "audit-lifting",
    name: "Lifting Equipment",
    category: "Plant & Equipment",
    siteArea: "Heavy Lift Bay",
    dueLabel: "Overdue",
    dueHours: -18,
    priority: "High",
    owner: "James Cole",
    templateVersion: "v4.0",
    status: "red",
    lastCompletedAt: "16 Apr 2026, 09:20",
    questions: [
      { id: "lift-1", text: "Pre-use checks are completed for all lifting equipment in service." },
      { id: "lift-2", text: "Chains, slings, and accessories are tagged and within inspection dates." },
      { id: "lift-3", text: "Exclusion zones are marked and controlled during lifts." },
      { id: "lift-4", text: "Operators are authorised and current for the equipment in use." },
    ],
  },
  {
    id: "audit-batching",
    name: "Concrete Batching Controls",
    category: "Quality & Process",
    siteArea: "Batch Plant",
    dueLabel: "Due tomorrow",
    dueHours: 18,
    priority: "Medium",
    owner: "Olivia Hart",
    templateVersion: "v5.1",
    status: "green",
    lastCompletedAt: "19 Apr 2026, 06:55",
    questions: [
      { id: "batch-1", text: "Mix designs in use match the approved production schedule." },
      { id: "batch-2", text: "Batch records are complete, legible, and signed off." },
      { id: "batch-3", text: "Water, cement, and additive controls are operating correctly." },
      { id: "batch-4", text: "Calibration checks remain current for weighing systems." },
    ],
  },
  {
    id: "audit-formwork",
    name: "Formwork Inspection",
    category: "Production Safety",
    siteArea: "Precast Moulding Line",
    dueLabel: "Near overdue",
    dueHours: 5,
    priority: "High",
    owner: "Amira Khan",
    templateVersion: "v2.6",
    status: "amber",
    lastCompletedAt: "18 Apr 2026, 13:40",
    questions: [
      { id: "form-1", text: "Formwork is stable, clean, and prepared for safe pours." },
      { id: "form-2", text: "Pins, clamps, and braces are secure before release to production." },
      { id: "form-3", text: "Damaged moulds are isolated and clearly identified." },
      { id: "form-4", text: "Access platforms around formwork are safe and properly guarded." },
    ],
  },
  {
    id: "audit-traffic",
    name: "Vehicle Segregation",
    category: "Transport Safety",
    siteArea: "Dispatch & Gatehouse",
    dueLabel: "Due today",
    dueHours: 8,
    priority: "Low",
    owner: "James Cole",
    templateVersion: "v3.0",
    status: "green",
    lastCompletedAt: "19 Apr 2026, 08:05",
    questions: [
      { id: "traffic-1", text: "Pedestrian and vehicle routes are clearly marked and protected." },
      { id: "traffic-2", text: "Speed limits, signage, and one-way controls are being followed." },
      { id: "traffic-3", text: "Loading and unloading areas are supervised and kept clear." },
      { id: "traffic-4", text: "Banksman arrangements are in place where visibility is restricted." },
    ],
  },
];

const initialHistory: HistoryEntry[] = [
  {
    id: "hist-1",
    auditId: "audit-yard",
    auditName: "Yard Housekeeping",
    completedAt: "19 Apr 2026, 07:45",
    completedBy: "Olivia Hart",
    status: "green",
  },
  {
    id: "hist-2",
    auditId: "audit-batching",
    auditName: "Concrete Batching Controls",
    completedAt: "19 Apr 2026, 06:55",
    completedBy: "James Cole",
    status: "green",
  },
  {
    id: "hist-3",
    auditId: "audit-ppe",
    auditName: "PPE Compliance",
    completedAt: "18 Apr 2026, 15:10",
    completedBy: "Amira Khan",
    status: "amber",
  },
  {
    id: "hist-4",
    auditId: "audit-formwork",
    auditName: "Formwork Inspection",
    completedAt: "18 Apr 2026, 13:40",
    completedBy: "James Cole",
    status: "amber",
  },
  {
    id: "hist-5",
    auditId: "audit-traffic",
    auditName: "Vehicle Segregation",
    completedAt: "17 Apr 2026, 16:30",
    completedBy: "James Cole",
    status: "green",
  },
  {
    id: "hist-6",
    auditId: "audit-lifting",
    auditName: "Lifting Equipment",
    completedAt: "16 Apr 2026, 09:20",
    completedBy: "Olivia Hart",
    status: "red",
  },
];

const initialActions: ActionItem[] = [
  {
    id: "act-1",
    auditId: "audit-lifting",
    auditName: "Lifting Equipment",
    questionId: "lift-2",
    questionText: "Chains, slings, and accessories are tagged and within inspection dates.",
    severity: "fail",
    owner: "James Cole",
    dueLabel: "Overdue by 1 day",
    dueHours: -24,
    status: "Open",
  },
  {
    id: "act-2",
    auditId: "audit-ppe",
    auditName: "PPE Compliance",
    questionId: "ppe-2",
    questionText: "Damaged or expired PPE has been removed from use.",
    severity: "nc",
    owner: "Amira Khan",
    dueLabel: "Due today",
    dueHours: 4,
    status: "In Progress",
  },
];

const statusStyles: Record<
  AuditStatus,
  {
    label: string;
    dot: string;
    soft: string;
    ring: string;
    text: string;
  }
> = {
  green: {
    label: "Live",
    dot: "bg-emerald-500",
    soft: "bg-emerald-500/12",
    ring: "ring-emerald-500/25",
    text: "text-emerald-700",
  },
  amber: {
    label: "No Conformance",
    dot: "bg-amber-500",
    soft: "bg-amber-500/12",
    ring: "ring-amber-500/25",
    text: "text-amber-700",
  },
  red: {
    label: "Fail",
    dot: "bg-rose-500",
    soft: "bg-rose-500/12",
    ring: "ring-rose-500/25",
    text: "text-rose-700",
  },
};

const navItems: { id: Exclude<Screen, "complete">; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "audits", label: "Audits" },
  { id: "admin", label: "Admin" },
];

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [audits, setAudits] = useState<Audit[]>(initialAudits);
  const [history, setHistory] = useState<HistoryEntry[]>(initialHistory);
  const [actions, setActions] = useState<ActionItem[]>(initialActions);
  const [drafts, setDrafts] = useState<Record<string, AuditDraft>>({});
  const [activeAuditId, setActiveAuditId] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, Answer>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [googleConnected, setGoogleConnected] = useState(false);
  const [backendConfigured, setBackendConfigured] = useState(false);
  const [sharedDriveId, setSharedDriveId] = useState("");
  const [googleStatusLoading, setGoogleStatusLoading] = useState(false);
  const [folderNameInput, setFolderNameInput] = useState("");
  const [folderIdInput, setFolderIdInput] = useState("");
  const [folders, setFolders] = useState<CompanyFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [syncState, setSyncState] = useState("Not synced");
  const [toasts, setToasts] = useState<Toast[]>([]);

  const activeAudit = useMemo(
    () => audits.find((audit) => audit.id === activeAuditId) ?? null,
    [audits, activeAuditId],
  );

  const selectedFolder = useMemo(
    () => folders.find((folder) => folder.id === selectedFolderId) ?? null,
    [folders, selectedFolderId],
  );

  const groupedAudits = useMemo(
    () => ({
      green: audits.filter((audit) => audit.status === "green"),
      amber: audits.filter((audit) => audit.status === "amber"),
      red: audits.filter((audit) => audit.status === "red"),
    }),
    [audits],
  );

  const compliance = useMemo(() => {
    const safeCount = audits.filter((audit) => audit.status === "green").length;
    return Math.round((safeCount / audits.length) * 100);
  }, [audits]);

  const priorCompliance = useMemo(() => {
    const recent = history.slice(0, 6);
    const greenCount = recent.filter((item) => item.status === "green").length;
    return recent.length > 0 ? Math.round((greenCount / recent.length) * 100) : compliance;
  }, [history, compliance]);

  const complianceDelta = compliance - priorCompliance;

  const openActions = useMemo(() => actions.filter((action) => action.status !== "Closed"), [actions]);
  const overdueActions = useMemo(() => openActions.filter((action) => action.dueHours < 0), [openActions]);
  const overdueAudits = useMemo(() => audits.filter((audit) => audit.dueHours < 0), [audits]);

  const assignedAudits = useMemo(() => {
    if (!currentUser) {
      return audits;
    }
    if (currentUser.role === "Admin") {
      return audits;
    }
    return audits.filter((audit) => audit.owner === currentUser.name);
  }, [audits, currentUser]);

  const roleLabel = useMemo(() => {
    if (!currentUser) {
      return "";
    }
    if (currentUser.role === "Admin") {
      return "Platform configuration and template control";
    }
    if (currentUser.role === "Manager") {
      return "Review actions, overdue items, and compliance risk";
    }
    return "Complete assigned audits and capture site outcomes";
  }, [currentUser]);

  const canSubmitAudit = useMemo(() => {
    if (!activeAudit) {
      return false;
    }
    return activeAudit.questions.every((question) => responses[question.id]);
  }, [activeAudit, responses]);

  useEffect(() => {
    if (toasts.length === 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      setToasts((current) => current.slice(1));
    }, 2600);
    return () => window.clearTimeout(timer);
  }, [toasts]);

  const pushToast = (title: string, message: string, tone: Toast["tone"] = "neutral") => {
    setToasts((current) => [
      ...current,
      { id: Date.now() + Math.floor(Math.random() * 1000), title, message, tone },
    ]);
  };

  const loadGoogleStatus = async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setGoogleStatusLoading(true);
    }

    try {
      const response = await fetch("/api/google/status");
      const payload = (await response.json()) as GoogleBackendStatus;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Unable to load Google status.");
      }

      setBackendConfigured(payload.configured);
      setGoogleConnected(payload.connected);
      setSharedDriveId(payload.sharedDriveId || "");

      if (payload.connected && payload.companies) {
        setFolders(payload.companies);
        if (!selectedFolderId && payload.companies[0]) {
          setSelectedFolderId(payload.companies[0].id);
        }
      }
    } catch (error) {
      if (!options?.silent) {
        pushToast(
          "Backend unavailable",
          error instanceof Error ? error.message : "Unable to reach the Google integration server.",
          "warning",
        );
      }
    } finally {
      if (!options?.silent) {
        setGoogleStatusLoading(false);
      }
    }
  };

  const formatStamp = () =>
    new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());

  const handleLogin = () => {
    const match = users.find(
      (user) => user.username === username.trim().toLowerCase() && user.password === password,
    );
    if (!match) {
      pushToast("Sign in failed", "Please check your username and password.", "warning");
      return;
    }
    setCurrentUser(match);
    setScreen("dashboard");
    setUsername("");
    setPassword("");
    pushToast("Welcome back", `Signed in as ${match.role}.`, "success");
  };

  const handleLogout = () => {
    fetch("/auth/google/logout", { method: "POST" }).catch(() => undefined);
    setCurrentUser(null);
    setScreen("dashboard");
    setActiveAuditId(null);
    setResponses({});
    setNotes({});
    pushToast("Signed out", "Your session has been closed.", "neutral");
  };

  const startAudit = (auditId: string) => {
    const draft = drafts[auditId];
    setActiveAuditId(auditId);
    setResponses(draft?.responses ?? {});
    setNotes(draft?.notes ?? {});
    setScreen("complete");
    if (draft) {
      pushToast("Draft loaded", "Saved progress has been restored.", "neutral");
    }
  };

  const saveDraft = () => {
    if (!activeAudit) {
      return;
    }
    setDrafts((current) => ({
      ...current,
      [activeAudit.id]: {
        responses,
        notes,
        updatedAt: formatStamp(),
      },
    }));
    pushToast("Progress saved", `${activeAudit.name} has been saved for later.`, "success");
  };

  const createActionsFromAudit = (audit: Audit, responseMap: Record<string, Answer>) => {
    const actionItems = audit.questions
      .map((question) => ({
        question,
        answer: responseMap[question.id],
      }))
      .filter((item): item is { question: AuditQuestion; answer: Exclude<Answer, "pass"> } => item.answer === "nc" || item.answer === "fail")
      .map((item, index) => ({
        id: `${audit.id}-action-${Date.now()}-${index}`,
        auditId: audit.id,
        auditName: audit.name,
        questionId: item.question.id,
        questionText: item.question.text,
        severity: item.answer,
        owner: audit.owner,
        dueLabel: item.answer === "fail" ? "Immediate attention" : "Due within 24 hours",
        dueHours: item.answer === "fail" ? -1 : 24,
        status: "Open" as ActionStatus,
      }));

    if (actionItems.length > 0) {
      setActions((current) => [...actionItems, ...current]);
    }
  };

  const submitAudit = () => {
    if (!activeAudit || !currentUser) {
      return;
    }

    const answers = Object.values(responses);
    const nextStatus: AuditStatus = answers.includes("fail")
      ? "red"
      : answers.includes("nc")
        ? "amber"
        : "green";
    const stamp = formatStamp();

    setAudits((current) =>
      current.map((audit) =>
        audit.id === activeAudit.id
          ? {
              ...audit,
              status: nextStatus,
              dueLabel: nextStatus === "red" ? "Immediate attention" : nextStatus === "amber" ? "Action required" : "Updated today",
              dueHours: nextStatus === "red" ? -1 : nextStatus === "amber" ? 12 : 36,
              lastCompletedAt: stamp,
            }
          : audit,
      ),
    );

    setHistory((current) => [
      {
        id: `${activeAudit.id}-${Date.now()}`,
        auditId: activeAudit.id,
        auditName: activeAudit.name,
        completedAt: stamp,
        completedBy: currentUser.name,
        status: nextStatus,
      },
      ...current,
    ]);

    setActions((current) => current.filter((action) => action.auditId !== activeAudit.id || action.status === "Closed"));
    createActionsFromAudit(activeAudit, responses);
    setDrafts((current) => {
      const nextDrafts = { ...current };
      delete nextDrafts[activeAudit.id];
      return nextDrafts;
    });

    setActiveAuditId(null);
    setResponses({});
    setNotes({});
    setScreen("dashboard");

    pushToast(
      "Audit submitted",
      `${activeAudit.name} is now marked ${statusStyles[nextStatus].label.toLowerCase()}.`,
      nextStatus === "green" ? "success" : "warning",
    );
  };

  const updateActionStatus = (actionId: string) => {
    setActions((current) =>
      current.map((action) =>
        action.id === actionId
          ? {
              ...action,
              status:
                action.status === "Open"
                  ? "In Progress"
                  : action.status === "In Progress"
                    ? "Closed"
                    : "Closed",
            }
          : action,
      ),
    );
  };

  const handleGoogleConnect = () => {
    if (!backendConfigured) {
      pushToast(
        "Backend setup required",
        "Add your Google OAuth credentials to the backend before connecting the shared drive.",
        "warning",
      );
      return;
    }

    window.location.href = "/auth/google/login";
  };

  const handleAddFolder = () => {
    if (!googleConnected) {
      pushToast("Connect required", "Connect Google before linking the company folder.", "warning");
      return;
    }

    const trimmedName = folderNameInput.trim();
    const trimmedId = folderIdInput.trim();

    if (!trimmedName || !trimmedId) {
      pushToast("Details required", "Enter the company folder name and folder ID.", "warning");
      return;
    }

    if (folders.some((folder) => folder.id === trimmedId)) {
      pushToast("Folder already added", "This company folder is already linked.", "warning");
      return;
    }

    const newFolder: CompanyFolder = {
      id: trimmedId,
      name: trimmedName,
      onboardingFormName: `${trimmedName} Onboarding`,
      auditFormCount: Math.max(4, Math.min(16, trimmedName.length % 10 + 6)),
      responseSheetName: `${trimmedName} Audit Responses`,
      linkedAt: formatStamp(),
      onboardingVerified: false,
      auditFormsVerified: false,
      responseSheetVerified: false,
    };

    setFolders((current) => [newFolder, ...current]);
    setSelectedFolderId(trimmedId);
    setFolderNameInput("");
    setFolderIdInput("");
    setSyncState("Linked");
    pushToast("Company folder linked", `${trimmedName} is now the active source folder.`, "success");
  };

  const handleSelectFolder = (folderId: string) => {
    if (!googleConnected) {
      pushToast("Connect required", "Connect Google before selecting the company folder.", "warning");
      return;
    }

    const folder = folders.find((item) => item.id === folderId);
    if (!folder) {
      pushToast("Folder missing", "Add a company folder before selecting it.", "warning");
      return;
    }

    setSelectedFolderId(folderId);
    setSyncState("Linked");
    pushToast("Folder selected", `${folder.name} is now the active company source.`, "success");
  };

  const handleVerifyOnboarding = () => {
    if (!selectedFolder) {
      pushToast("Link required", "Link a company folder before verifying onboarding.", "warning");
      return;
    }

    setFolders((current) =>
      current.map((folder) =>
        folder.id === selectedFolder.id ? { ...folder, onboardingVerified: true } : folder,
      ),
    );
    pushToast("Onboarding verified", `${selectedFolder.onboardingFormName} is available in the company folder.`, "success");
  };

  const handleVerifyAudits = () => {
    if (!selectedFolder) {
      pushToast("Link required", "Link a company folder before verifying audit forms.", "warning");
      return;
    }

    setFolders((current) =>
      current.map((folder) =>
        folder.id === selectedFolder.id ? { ...folder, auditFormsVerified: true } : folder,
      ),
    );
    pushToast("Audit forms verified", `${selectedFolder.auditFormCount} audit forms are ready to sync.`, "success");
  };

  const handleVerifyResponseSheet = () => {
    if (!selectedFolder) {
      pushToast("Link required", "Link a company folder before verifying the response sheet.", "warning");
      return;
    }

    setFolders((current) =>
      current.map((folder) =>
        folder.id === selectedFolder.id ? { ...folder, responseSheetVerified: true } : folder,
      ),
    );
    pushToast("Response sheet verified", `${selectedFolder.responseSheetName} is ready to capture company data.`, "success");
  };

  const handleSyncForms = () => {
    if (!selectedFolder) {
      pushToast("Setup incomplete", "Link a company folder before syncing.", "warning");
      return;
    }
    if (!selectedFolder.onboardingVerified || !selectedFolder.auditFormsVerified || !selectedFolder.responseSheetVerified) {
      pushToast("Verification required", "Verify the onboarding form, audit forms, and company response sheet before syncing.", "warning");
      return;
    }
    setSyncState("Synced");
    pushToast("Sync complete", `${selectedFolder.name} is now live for onboarding, audit forms, and company data capture.`, "success");
  };

  useEffect(() => {
    loadGoogleStatus({ silent: true });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google") === "connected") {
      loadGoogleStatus();
      pushToast("Google connected", "Shared Google Drive access is now active.", "success");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  if (!currentUser) {
    return (
      <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,_rgba(17,24,39,0.08),_transparent_35%),linear-gradient(180deg,_#eef4f7_0%,_#f9fbfc_45%,_#e8eff3_100%)] px-4 py-6 text-slate-900">
        <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-[34rem] flex-col justify-center">
          <div className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-lg font-semibold tracking-[0.28em] text-white">
                QMS
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Health &amp; Safety Audit System
                </p>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{companyName}</h1>
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-slate-950 px-5 py-5 text-white shadow-lg">
              <p className="text-sm text-slate-300">Commercial field platform</p>
              <p className="mt-2 text-2xl font-semibold leading-tight">
                Control onboarding, live audits, and corrective actions in one tablet app.
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Sign in to manage company setup, review compliance, complete inspections, and close risk actions.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Username</label>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleLogin();
                    }
                  }}
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  placeholder="Enter password"
                />
              </div>
            </div>

            <button
              onClick={handleLogin}
              className="mt-6 h-14 w-full rounded-2xl bg-slate-900 text-base font-semibold text-white shadow-[0_16px_30px_rgba(15,23,42,0.24)] transition active:scale-[0.99]"
            >
              Sign in
            </button>

            <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">Approved demo access</p>
              <div className="mt-3 grid gap-3">
                {users.map((user) => (
                  <div
                    key={user.username}
                    className="flex items-center justify-between rounded-2xl border border-white bg-white px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{user.role}</p>
                      <p className="text-xs text-slate-500">
                        {user.username} / {user.password}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setUsername(user.username);
                        setPassword(user.password);
                      }}
                      className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700"
                    >
                      Use
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <ToastStack toasts={toasts} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(2,132,199,0.10),_transparent_32%),linear-gradient(180deg,_#edf4f7_0%,_#f9fbfc_45%,_#eef3f5_100%)] px-3 py-3 text-slate-900">
      <div className="mx-auto flex h-full max-w-[36rem] flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-[0_28px_90px_rgba(15,23,42,0.16)] backdrop-blur">
        <header className="border-b border-slate-200/80 bg-white/90 px-4 pb-4 pt-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold tracking-[0.24em] text-white">
              QMS
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold tracking-tight text-slate-900">{companyName}</p>
              <p className="truncate text-xs uppercase tracking-[0.24em] text-slate-500">
                Health &amp; Safety Audit System
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm"
            >
              Logout
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{currentUser.name}</p>
              <p className="text-xs text-slate-500">{currentUser.role}</p>
              <p className="mt-1 text-xs text-slate-400">{roleLabel}</p>
            </div>
            <div className="rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-semibold text-emerald-700">
              Live session
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto px-4 pb-28 pt-4">
            {screen === "dashboard" && (
              <DashboardScreen
                currentUser={currentUser}
                compliance={compliance}
                complianceDelta={complianceDelta}
                groupedAudits={groupedAudits}
                actions={actions}
                openActions={openActions}
                overdueActions={overdueActions}
                overdueAudits={overdueAudits}
                assignedAudits={assignedAudits}
                history={history}
                drafts={drafts}
                onOpenAudit={startAudit}
                onAdvanceAction={updateActionStatus}
              />
            )}

            {screen === "audits" && (
              <AuditsScreen
                currentUser={currentUser}
                audits={audits}
                groupedAudits={groupedAudits}
                drafts={drafts}
                onOpenAudit={startAudit}
              />
            )}

            {screen === "admin" && (
              <AdminScreen
                currentUser={currentUser}
                googleConnected={googleConnected}
                folders={folders}
                selectedFolder={selectedFolder}
                folderNameInput={folderNameInput}
                folderIdInput={folderIdInput}
                syncState={syncState}
                backendConfigured={backendConfigured}
                sharedDriveId={sharedDriveId}
                googleStatusLoading={googleStatusLoading}
                onGoogleConnect={handleGoogleConnect}
                onRefreshGoogleStatus={() => loadGoogleStatus()}
                onFolderNameChange={setFolderNameInput}
                onFolderIdChange={setFolderIdInput}
                onAddFolder={handleAddFolder}
                onSelectFolder={handleSelectFolder}
                onVerifyOnboarding={handleVerifyOnboarding}
                onVerifyAudits={handleVerifyAudits}
                onVerifyResponseSheet={handleVerifyResponseSheet}
                onSyncForms={handleSyncForms}
              />
            )}

            {screen === "complete" && activeAudit && (
              <CompleteAuditScreen
                audit={activeAudit}
                responses={responses}
                notes={notes}
                savedAt={drafts[activeAudit.id]?.updatedAt ?? null}
                canSubmit={canSubmitAudit}
                onSelect={(questionId, answer) =>
                  setResponses((current) => ({
                    ...current,
                    [questionId]: answer,
                  }))
                }
                onNoteChange={(questionId, value) =>
                  setNotes((current) => ({
                    ...current,
                    [questionId]: value,
                  }))
                }
                onSaveDraft={saveDraft}
                onSubmit={submitAudit}
                onCancel={() => {
                  setActiveAuditId(null);
                  setResponses({});
                  setNotes({});
                  setScreen("audits");
                }}
              />
            )}
          </div>
        </main>

        <nav className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[36rem] border-t border-slate-200/80 bg-white/95 px-3 py-3 backdrop-blur">
          <div className="grid grid-cols-3 gap-2">
            {navItems.map((item) => {
              const selected = screen === item.id || (screen === "complete" && item.id === "audits");
              return (
                <button
                  key={item.id}
                  onClick={() => setScreen(item.id)}
                  className={[
                    "h-14 rounded-2xl text-sm font-semibold transition",
                    selected
                      ? "bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.2)]"
                      : "bg-slate-100 text-slate-600",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      <ToastStack toasts={toasts} />
    </div>
  );
}

function DashboardScreen({
  currentUser,
  compliance,
  complianceDelta,
  groupedAudits,
  actions,
  openActions,
  overdueActions,
  overdueAudits,
  assignedAudits,
  history,
  drafts,
  onOpenAudit,
  onAdvanceAction,
}: {
  currentUser: User;
  compliance: number;
  complianceDelta: number;
  groupedAudits: Record<AuditStatus, Audit[]>;
  actions: ActionItem[];
  openActions: ActionItem[];
  overdueActions: ActionItem[];
  overdueAudits: Audit[];
  assignedAudits: Audit[];
  history: HistoryEntry[];
  drafts: Record<string, AuditDraft>;
  onOpenAudit: (auditId: string) => void;
  onAdvanceAction: (actionId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-3">
        <KpiCard
          title="Live compliance"
          value={`${compliance}%`}
          tone="green"
          subtitle={complianceDelta >= 0 ? `Up ${complianceDelta}% vs previous run` : `Down ${Math.abs(complianceDelta)}% vs previous run`}
        />
        <KpiCard
          title="Open actions"
          value={String(openActions.length)}
          tone={openActions.length === 0 ? "green" : "amber"}
          subtitle={`${overdueActions.length} overdue and ${actions.filter((item) => item.status === "In Progress").length} in progress`}
        />
      </section>

      <section className="rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Executive view</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{companyName}</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-300">
              Live control of onboarding, site audits, and corrective action ownership from one field-ready workspace.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-right">
            <p className="text-xs text-slate-300">Overdue audits</p>
            <p className="mt-1 text-2xl font-semibold">{overdueAudits.length}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">My live work</h3>
            <p className="text-sm text-slate-500">
              {currentUser.role === "Admin"
                ? "All open audits across the business"
                : currentUser.role === "Manager"
                  ? "Assigned audits and actions needing review"
                  : "Your assigned audits and saved progress"}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {assignedAudits.slice(0, 4).map((audit) => (
            <button
              key={audit.id}
              onClick={() => onOpenAudit(audit.id)}
              className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{audit.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {audit.siteArea} • Owner {audit.owner} • {audit.priority}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    {drafts[audit.id] ? `Draft saved ${drafts[audit.id].updatedAt}` : `Last completed ${audit.lastCompletedAt}`}
                  </p>
                </div>
                <div className="shrink-0 space-y-2 text-right">
                  <StatusBadge status={audit.status} />
                  {drafts[audit.id] && (
                    <div className="rounded-full bg-sky-500/12 px-3 py-1 text-xs font-semibold text-sky-700">
                      In progress
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Traffic light audit board</h3>
            <p className="text-sm text-slate-500">Operational status across every live audit area</p>
          </div>
        </div>
        <div className="grid gap-3">
          <TrafficLane title="Green" subtitle="Live" audits={groupedAudits.green} status="green" onOpenAudit={onOpenAudit} />
          <TrafficLane
            title="Amber"
            subtitle="No Conformance / action needed"
            audits={groupedAudits.amber}
            status="amber"
            onOpenAudit={onOpenAudit}
          />
          <TrafficLane title="Red" subtitle="Fail / overdue" audits={groupedAudits.red} status="red" onOpenAudit={onOpenAudit} />
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Action tracker</h3>
            <p className="text-sm text-slate-500">Corrective actions created automatically from failed or non-conforming answers</p>
          </div>
        </div>
        <div className="space-y-3">
          {actions.slice(0, 5).map((action) => (
            <div key={action.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{action.auditName}</p>
                  <p className="mt-1 text-xs text-slate-500">{action.questionText}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    Owner {action.owner} • {action.dueLabel}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <div
                    className={[
                      "rounded-full px-3 py-1 text-xs font-semibold",
                      action.severity === "fail" ? "bg-rose-500/12 text-rose-700" : "bg-amber-500/12 text-amber-700",
                    ].join(" ")}
                  >
                    {action.severity === "fail" ? "Fail" : "NC"}
                  </div>
                  {currentUser.role !== "Auditor" && action.status !== "Closed" && (
                    <button
                      onClick={() => onAdvanceAction(action.id)}
                      className="mt-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                    >
                      {action.status === "Open" ? "Start" : "Close"}
                    </button>
                  )}
                  {action.status === "Closed" && (
                    <div className="mt-2 rounded-xl bg-emerald-500/12 px-3 py-2 text-xs font-semibold text-emerald-700">
                      Closed
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Completed audit history</h3>
            <p className="text-sm text-slate-500">Most recent completions and outcomes</p>
          </div>
        </div>
        <div className="space-y-3">
          {history.slice(0, 6).map((entry) => (
            <div key={entry.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{entry.auditName}</p>
                <p className="truncate text-xs text-slate-500">
                  {entry.completedBy} • {entry.completedAt}
                </p>
              </div>
              <StatusBadge status={entry.status} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AuditsScreen({
  currentUser,
  audits,
  groupedAudits,
  drafts,
  onOpenAudit,
}: {
  currentUser: User;
  audits: Audit[];
  groupedAudits: Record<AuditStatus, Audit[]>;
  drafts: Record<string, AuditDraft>;
  onOpenAudit: (auditId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Audit centre</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          {currentUser.role === "Auditor" ? "Assigned field audits" : "Complete and manage inspections"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Save progress mid-inspection, complete audits in the field, and let the system create corrective actions when issues are found.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <MiniMetric label="In progress" value={String(Object.keys(drafts).length)} />
        <MiniMetric label="Live templates" value={String(audits.length)} />
      </section>

      <TrafficLane title="Green" subtitle="Live" audits={groupedAudits.green} status="green" onOpenAudit={onOpenAudit} expanded drafts={drafts} />
      <TrafficLane
        title="Amber"
        subtitle="No Conformance / action needed"
        audits={groupedAudits.amber}
        status="amber"
        onOpenAudit={onOpenAudit}
        expanded
        drafts={drafts}
      />
      <TrafficLane title="Red" subtitle="Fail / overdue" audits={groupedAudits.red} status="red" onOpenAudit={onOpenAudit} expanded drafts={drafts} />
    </div>
  );
}

function CompleteAuditScreen({
  audit,
  responses,
  notes,
  savedAt,
  canSubmit,
  onSelect,
  onNoteChange,
  onSaveDraft,
  onSubmit,
  onCancel,
}: {
  audit: Audit;
  responses: Record<string, Answer>;
  notes: Record<string, string>;
  savedAt: string | null;
  canSubmit: boolean;
  onSelect: (questionId: string, answer: Answer) => void;
  onNoteChange: (questionId: string, value: string) => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const answered = audit.questions.filter((question) => responses[question.id]).length;

  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{audit.category}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{audit.name}</h2>
            <p className="mt-2 text-sm text-slate-300">
              {audit.siteArea} • Owner {audit.owner} • Template {audit.templateVersion}
            </p>
          </div>
          <StatusBadge status={audit.status} dark />
        </div>
        <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3">
          <p className="text-xs text-slate-300">Progress</p>
          <div className="mt-2 flex items-center justify-between">
            <div className="h-2 flex-1 rounded-full bg-white/10">
              <div className="h-2 rounded-full bg-white transition-all" style={{ width: `${(answered / audit.questions.length) * 100}%` }} />
            </div>
            <p className="ml-3 text-sm font-semibold">
              {answered}/{audit.questions.length}
            </p>
          </div>
          {savedAt && <p className="mt-2 text-xs text-slate-300">Last saved {savedAt}</p>}
        </div>
      </section>

      <section className="space-y-3">
        {audit.questions.map((question, index) => {
          const current = responses[question.id];
          return (
            <div key={question.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Question {index + 1}</p>
              <p className="mt-2 text-base font-semibold leading-6 text-slate-900">{question.text}</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <AnswerButton label="Pass" selected={current === "pass"} tone="green" onClick={() => onSelect(question.id, "pass")} />
                <AnswerButton
                  label="No Conformance"
                  selected={current === "nc"}
                  tone="amber"
                  onClick={() => onSelect(question.id, "nc")}
                />
                <AnswerButton label="Fail" selected={current === "fail"} tone="red" onClick={() => onSelect(question.id, "fail")} />
              </div>
              <textarea
                value={notes[question.id] ?? ""}
                onChange={(event) => onNoteChange(question.id, event.target.value)}
                placeholder="Add notes or evidence summary"
                className="mt-3 min-h-[4.75rem] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-3 gap-3">
        <button onClick={onCancel} className="h-14 rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700">
          Cancel
        </button>
        <button onClick={onSaveDraft} className="h-14 rounded-2xl bg-slate-200 text-sm font-semibold text-slate-800">
          Save draft
        </button>
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className={[
            "h-14 rounded-2xl text-sm font-semibold text-white shadow-[0_14px_28px_rgba(15,23,42,0.18)] transition",
            canSubmit ? "bg-slate-900 active:scale-[0.99]" : "bg-slate-300",
          ].join(" ")}
        >
          Submit
        </button>
      </section>
    </div>
  );
}

function AdminScreen({
  currentUser,
  googleConnected,
  backendConfigured,
  sharedDriveId,
  googleStatusLoading,
  folders,
  selectedFolder,
  folderNameInput,
  folderIdInput,
  syncState,
  onGoogleConnect,
  onRefreshGoogleStatus,
  onFolderNameChange,
  onFolderIdChange,
  onAddFolder,
  onSelectFolder,
  onVerifyOnboarding,
  onVerifyAudits,
  onVerifyResponseSheet,
  onSyncForms,
}: {
  currentUser: User;
  googleConnected: boolean;
  backendConfigured: boolean;
  sharedDriveId: string;
  googleStatusLoading: boolean;
  folders: CompanyFolder[];
  selectedFolder: CompanyFolder | null;
  folderNameInput: string;
  folderIdInput: string;
  syncState: string;
  onGoogleConnect: () => void;
  onRefreshGoogleStatus: () => void;
  onFolderNameChange: (value: string) => void;
  onFolderIdChange: (value: string) => void;
  onAddFolder: () => void;
  onSelectFolder: (folderId: string) => void;
  onVerifyOnboarding: () => void;
  onVerifyAudits: () => void;
  onVerifyResponseSheet: () => void;
  onSyncForms: () => void;
}) {
  const adminOnly = currentUser.role !== "Admin";
  const onboardingReady = Boolean(selectedFolder?.onboardingVerified);
  const auditsReady = Boolean(selectedFolder?.auditFormsVerified);
  const responseSheetReady = Boolean(selectedFolder?.responseSheetVerified);

  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Administrator control</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">{companyName}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Connect one shared Google Drive, then manage each customer through its own company folder with onboarding, audit forms, and a dedicated response sheet.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <MiniPill label={backendConfigured ? "Backend configured" : "Backend not configured"} active={backendConfigured} />
          <MiniPill label={googleConnected ? "Google connected" : "Google not connected"} active={googleConnected} />
          <MiniPill label={sharedDriveId ? `Drive ${sharedDriveId}` : "No shared drive ID"} active={Boolean(sharedDriveId)} />
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Onboarding wizard</h3>
            <p className="text-sm text-slate-500">One shared drive, with one company folder per customer for onboarding, forms, and response data.</p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{syncState}</div>
        </div>

        <div className="mt-4 space-y-3">
          <ProcessCard
            step="01"
            title="Connect shared Google Drive"
            text="Grant the administrator account access to the shared Google Drive that holds all company folders."
            state={googleConnected ? "Google account connected" : "Google account not connected"}
            active={googleConnected}
          />
          <ProcessCard
            step="02"
            title="Select the company folder"
            text="Choose the company folder inside the shared drive that should be live for setup and sync."
            state={selectedFolder ? `${selectedFolder.name} linked` : "No company folder linked"}
            active={Boolean(selectedFolder)}
          />
          <ProcessCard
            step="03"
            title="Verify onboarding form"
            text="Confirm the onboarding form exists in that folder so a new customer can be set up quickly."
            state={selectedFolder ? `${selectedFolder.onboardingFormName} ${onboardingReady ? "verified" : "awaiting verification"}` : "Select a folder first"}
            active={onboardingReady}
          />
          <ProcessCard
            step="04"
            title="Verify audit forms"
            text="Confirm the folder contains the live audit form set that should become templates in QMS Precast."
            state={selectedFolder ? `${selectedFolder.auditFormCount} audit forms ${auditsReady ? "verified" : "awaiting verification"}` : "Select a folder first"}
            active={auditsReady}
          />
          <ProcessCard
            step="05"
            title="Verify company response sheet"
            text="Confirm the company-specific Google Sheet is ready to collect all responses and reporting data for that customer."
            state={
              selectedFolder
                ? `${selectedFolder.responseSheetName} ${responseSheetReady ? "verified" : "awaiting verification"}`
                : "Select a folder first"
            }
            active={responseSheetReady}
          />
          <ProcessCard
            step="06"
            title="Sync live audits"
            text="Publish the verified onboarding form, audit forms, and company response sheet into the app for operational use."
            state={syncState}
            active={syncState === "Synced"}
          />
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Company folder setup</h3>
            <p className="text-sm text-slate-500">Each company folder in the shared drive carries its onboarding form, audit forms, and dedicated response sheet.</p>
          </div>
          <div className="rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-semibold text-emerald-700">
            Admin only
          </div>
        </div>

        <div className="grid gap-3">
          <AdminAction
            title="Connect Google"
            subtitle={
              backendConfigured
                ? googleConnected
                  ? "Administrator connection is active"
                  : "Start the secure Google OAuth flow"
                : "Configure the backend environment before connecting"
            }
            actionLabel="Connect Google"
            active={googleConnected}
            disabled={adminOnly}
            onClick={onGoogleConnect}
          />
          <AdminAction
            title="Refresh Drive status"
            subtitle={googleStatusLoading ? "Loading live Google status" : "Reload company folders from the shared Google Drive"}
            actionLabel="Refresh"
            active={false}
            disabled={adminOnly}
            onClick={onRefreshGoogleStatus}
          />
          <AdminAction
            title="Verify onboarding form"
            subtitle={selectedFolder ? "Confirm the onboarding form exists in the active folder" : "Select a company folder first"}
            actionLabel="Verify onboarding"
            active={onboardingReady}
            disabled={adminOnly}
            onClick={onVerifyOnboarding}
          />
            <AdminAction
              title="Verify audit forms"
              subtitle={selectedFolder ? "Confirm the live audit forms in the active folder" : "Select a company folder first"}
              actionLabel="Verify audit forms"
              active={auditsReady}
              disabled={adminOnly}
              onClick={onVerifyAudits}
            />
            <AdminAction
              title="Verify company sheet"
              subtitle={selectedFolder ? "Confirm the response sheet for the active company folder" : "Select a company folder first"}
              actionLabel="Verify company sheet"
              active={responseSheetReady}
              disabled={adminOnly}
              onClick={onVerifyResponseSheet}
            />
            <AdminAction
              title="Sync live content"
              subtitle="Bring the verified onboarding, audit, and response sheet structure into QMS Precast"
              actionLabel="Sync"
              active={syncState === "Synced"}
              disabled={adminOnly}
              onClick={onSyncForms}
          />
        </div>

        <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Manual company folder entry</p>
              <p className="text-sm text-slate-500">Use this fallback if you want to pre-stage a company folder before the live Drive scan is available.</p>
            </div>
            <button
              onClick={onAddFolder}
                disabled={adminOnly}
              className={[
                "rounded-xl px-4 py-3 text-xs font-semibold transition",
                adminOnly ? "bg-slate-200 text-slate-400" : "bg-slate-900 text-white",
              ].join(" ")}
            >
              Link folder
            </button>
          </div>
          <div className="mt-4 grid gap-3">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Folder name</label>
              <input
                value={folderNameInput}
                onChange={(event) => onFolderNameChange(event.target.value)}
                disabled={adminOnly}
                placeholder="Example: Acme Precast Company Folder"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Folder ID</label>
              <input
                value={folderIdInput}
                onChange={(event) => onFolderIdChange(event.target.value)}
                disabled={adminOnly}
                placeholder="Paste Google folder ID"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Linked company folders</p>
                <p className="text-sm text-slate-500">Choose which company folder is live for onboarding, audit sync, and company response capture.</p>
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                {folders.length} company source{folders.length === 1 ? "" : "s"}
              </div>
          </div>

          <div className="space-y-3">
            {folders.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-500">
                No company folders loaded yet. Connect Google and refresh the shared drive, or add a fallback company folder manually.
              </div>
            )}
            {folders.map((folder) => {
              const active = selectedFolder?.id === folder.id;
              return (
                <button
                  key={folder.id}
                  onClick={() => onSelectFolder(folder.id)}
                  disabled={adminOnly}
                  className={[
                    "w-full rounded-2xl border px-4 py-4 text-left transition",
                    active ? "border-emerald-200 bg-emerald-50" : "border-white bg-white",
                    adminOnly ? "opacity-80" : "active:scale-[0.99]",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{folder.name}</p>
                        <p className="mt-1 break-all text-xs text-slate-500">{folder.id}</p>
                        <p className="mt-2 text-xs text-slate-400">
                          {folder.onboardingFormName} • {folder.auditFormCount} audit forms • {folder.responseSheetName}
                        </p>
                      </div>
                      <div className="shrink-0 space-y-2 text-right">
                        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {active ? "Active" : "Select"}
                        </div>
                        <div className="text-xs text-slate-400">
                          {folder.onboardingVerified && folder.auditFormsVerified && folder.responseSheetVerified
                            ? "Fully verified"
                            : "Verification pending"}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <MiniPill label={folder.onboardingVerified ? "Onboarding verified" : "Onboarding pending"} active={folder.onboardingVerified} />
                      <MiniPill label={folder.auditFormsVerified ? "Audit forms verified" : "Audit forms pending"} active={folder.auditFormsVerified} />
                      <MiniPill label={folder.responseSheetVerified ? "Sheet verified" : "Sheet pending"} active={folder.responseSheetVerified} />
                    </div>
                  </button>
              );
            })}
          </div>
        </div>

        {adminOnly && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Administrator access is required to change onboarding, folder linking, and sync controls.
          </div>
        )}
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Production flow</h3>
        <div className="mt-4 space-y-3">
          <FlowItem
            number="01"
            title="Use one shared Google Drive"
            text="The administrator connects one shared Google Drive that contains separate company folders for every customer."
          />
          <FlowItem
            number="02"
            title="Verify each company folder"
            text="Each company folder is checked to confirm the onboarding form, live audit forms, and dedicated response sheet are all present and current."
          />
          <FlowItem
            number="03"
            title="Sync into QMS Precast"
            text="Once verified, that company folder is synced so teams work only inside QMS Precast while data continues to be captured into the company-specific sheet."
          />
        </div>
      </section>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  tone: "green" | "amber";
}) {
  const toneClasses =
    tone === "green"
      ? "bg-emerald-500/12 text-emerald-700 ring-emerald-500/20"
      : "bg-amber-500/12 text-amber-700 ring-amber-500/20";

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${toneClasses}`}>{title}</div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
    </div>
  );
}

function MiniPill({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      className={[
        "rounded-full px-3 py-1 text-xs font-semibold",
        active ? "bg-emerald-500/12 text-emerald-700" : "bg-slate-100 text-slate-600",
      ].join(" ")}
    >
      {label}
    </div>
  );
}

function TrafficLane({
  title,
  subtitle,
  audits,
  status,
  onOpenAudit,
  expanded = false,
  drafts = {},
}: {
  title: string;
  subtitle: string;
  audits: Audit[];
  status: AuditStatus;
  onOpenAudit: (auditId: string) => void;
  expanded?: boolean;
  drafts?: Record<string, AuditDraft>;
}) {
  return (
    <div className={["rounded-[1.5rem] p-4 ring-1", statusStyles[status].soft, statusStyles[status].ring].join(" ")}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`h-3 w-3 rounded-full ${statusStyles[status].dot}`} />
          <div>
            <p className={`text-sm font-semibold ${statusStyles[status].text}`}>{title}</p>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        <div className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700">{audits.length}</div>
      </div>

      <div className="space-y-3">
        {audits.map((audit) => (
          <button
            key={audit.id}
            onClick={() => onOpenAudit(audit.id)}
            className={["w-full rounded-2xl bg-white/90 px-4 py-4 text-left shadow-sm transition active:scale-[0.99]", expanded ? "min-h-[6rem]" : ""].join(" ")}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{audit.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {audit.siteArea} • {audit.priority} • Owner {audit.owner}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  {drafts[audit.id] ? `Draft saved ${drafts[audit.id].updatedAt}` : `Last completed ${audit.lastCompletedAt}`}
                </p>
              </div>
              <div className="shrink-0 space-y-2 text-right">
                <StatusBadge status={audit.status} />
                <div className="text-xs text-slate-400">{audit.dueLabel}</div>
              </div>
            </div>
          </button>
        ))}
        {audits.length === 0 && <div className="rounded-2xl bg-white/80 px-4 py-4 text-sm text-slate-500">No audits in this group.</div>}
      </div>
    </div>
  );
}

function StatusBadge({ status, dark = false }: { status: AuditStatus; dark?: boolean }) {
  const base = statusStyles[status];
  return (
    <div className={["inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold", dark ? "bg-white/10 text-white" : `${base.soft} ${base.text}`].join(" ")}>
      <span className={`h-2.5 w-2.5 rounded-full ${dark ? "bg-white" : base.dot}`} />
      {base.label}
    </div>
  );
}

function AnswerButton({
  label,
  selected,
  tone,
  onClick,
}: {
  label: string;
  selected: boolean;
  tone: AuditStatus;
  onClick: () => void;
}) {
  const selectedClasses =
    tone === "green"
      ? "bg-emerald-600 text-white"
      : tone === "amber"
        ? "bg-amber-500 text-white"
        : "bg-rose-600 text-white";

  return (
    <button
      onClick={onClick}
      className={["min-h-[3.5rem] rounded-2xl px-2 text-center text-xs font-semibold leading-tight transition", selected ? selectedClasses : "bg-slate-100 text-slate-700"].join(" ")}
    >
      {label}
    </button>
  );
}

function AdminAction({
  title,
  subtitle,
  actionLabel,
  active,
  disabled,
  onClick,
}: {
  title: string;
  subtitle: string;
  actionLabel: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
      <div className="min-w-0 pr-3">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      <button
        onClick={onClick}
        disabled={disabled}
        className={[
          "shrink-0 rounded-xl px-4 py-3 text-xs font-semibold transition",
          disabled ? "bg-slate-200 text-slate-400" : active ? "bg-emerald-500/12 text-emerald-700" : "bg-slate-900 text-white",
        ].join(" ")}
      >
        {active ? "Ready" : actionLabel}
      </button>
    </div>
  );
}

function FlowItem({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="flex gap-4 rounded-2xl bg-slate-50 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
        {number}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
      </div>
    </div>
  );
}

function ProcessCard({
  step,
  title,
  text,
  state,
  active,
}: {
  step: string;
  title: string;
  text: string;
  state: string;
  active: boolean;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
            {step}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
          </div>
        </div>
        <div className={["shrink-0 rounded-full px-3 py-1 text-xs font-semibold", active ? "bg-emerald-500/12 text-emerald-700" : "bg-white text-slate-600"].join(" ")}>
          {active ? "Ready" : "Pending"}
        </div>
      </div>
      <div className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">{state}</div>
    </div>
  );
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 mx-auto flex max-w-[36rem] flex-col gap-2 px-4">
      {toasts.slice(0, 3).map((toast) => {
        const toneClass =
          toast.tone === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : toast.tone === "warning"
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : "border-slate-200 bg-white text-slate-900";

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)] ${toneClass}`}
          >
            <p className="text-sm font-semibold">{toast.title}</p>
            <p className="mt-1 text-sm">{toast.message}</p>
          </div>
        );
      })}
    </div>
  );
}

export default App;
