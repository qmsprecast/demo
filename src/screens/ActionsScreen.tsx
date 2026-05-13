import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { canCompleteAuditAsAuditor, getRolePermissions } from "../permissions";
import { EmptyPanel, MetaPill } from "../components/dashboard/DashboardPrimitives";
import { StatusChip } from "../components/ui/StatusChip";
import type { ActionItem, ActionStatus, RiskLevel } from "../types/reportsScreenProps";
import type { User } from "../types/dashboardScreenProps";
import { slatePrimaryCtaInteract } from "../styles/interactions";

type ActionFilter = "Open" | "Overdue" | "Awaiting Verification" | "Closed" | "Severity";
const brandDarkFormControl =
  "border border-[rgba(249,115,22,0.45)] bg-slate-950 text-slate-100 outline-none focus:border-[var(--bert-signal-orange)]";

function ActionsScreenIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 4.75 20.25 19.25H3.75L12 4.75z" />
      <path d="M12 9.5v4.5" />
      <circle cx="12" cy="16.35" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function isActionOverdue(action: ActionItem) {
  return action.status !== "Closed" && action.dueHours < 0;
}

function isActionEscalated(action: ActionItem) {
  if (action.escalated !== undefined) {
    return action.escalated;
  }
  return isActionOverdue(action) && Math.abs(action.dueHours) > 24;
}

function isActionStuck(action: ActionItem) {
  if (action.isStuck !== undefined) {
    return action.isStuck;
  }
  return action.status === "Awaiting Verification" && action.dueHours < -24;
}

function isActionDueSoon(action: ActionItem) {
  return action.status !== "Closed" && action.dueHours >= 0 && action.dueHours <= 24;
}

function isDueToday(action: ActionItem) {
  return action.dueHours >= 0 && action.dueHours <= 24;
}

function getActionUrgency(action: ActionItem): "Escalated" | "Overdue" | "Stuck" | "Due soon" | "Normal" {
  if (isActionEscalated(action)) return "Escalated";
  if (isActionOverdue(action)) return "Overdue";
  if (isActionStuck(action)) return "Stuck";
  if (isActionDueSoon(action)) return "Due soon";
  return "Normal";
}

function statusChipForAction(status: ActionStatus) {
  if (status === "Awaiting Verification") return { variant: "awaitingVerification" as const, label: "AWAITING VERIFICATION" };
  if (status === "Closed") return { variant: "closed" as const, label: "CLOSED" };
  if (status === "Rejected") return { variant: "overdue" as const, label: "REJECTED" };
  if (status === "In Progress") return { variant: "awaitingVerification" as const, label: "IN PROGRESS" };
  return { variant: "draft" as const, label: status.toUpperCase() };
}

function useWideLayout() {
  const query = "(min-width: 1024px)";
  const [wide, setWide] = useState(() => (typeof window !== "undefined" ? window.matchMedia(query).matches : true));
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = () => setWide(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return wide;
}

function ChevronRight({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MobileActionDetail({
  action,
  permissions,
  onBack,
  onAdvanceAction,
  onAssignAction,
  onAddEvidence,
  availableAuditors,
}: {
  action: ActionItem;
  permissions: ReturnType<typeof getRolePermissions>;
  onBack: () => void;
  onAdvanceAction: (actionId: string, nextStatus?: ActionStatus) => void;
  onAssignAction: (actionId: string, assignee: string) => void;
  onAddEvidence: (actionId: string, files: FileList) => void;
  availableAuditors: string[];
}) {
  const evidenceInputRef = useRef<HTMLInputElement>(null);
  const chip = statusChipForAction(action.status);
  const priorityHigh = action.severity === "High" || action.severity === "Critical";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50 lg:hidden">
      <header className="shrink-0 bg-gradient-to-r from-[#071525] via-[#0c1f36] to-[#050b14] px-3 py-3 text-white ring-1 ring-white/10">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Back
          </button>
          <p className="text-sm font-semibold">Action Details</p>
          <button
            type="button"
            className="rounded-full border border-white/15 p-2 text-white"
            aria-label="More options"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
              <circle cx="5" cy="12" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="19" cy="12" r="1.5" />
            </svg>
          </button>
        </div>
        <div className="mt-3">
          <StatusChip variant={chip.variant}>{chip.label}</StatusChip>
        </div>
        <h2 className="mt-2 text-lg font-semibold leading-snug text-white">{action.questionText}</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-300">{action.auditName}</p>
      </header>

      <div className="min-h-0 flex-1 space-y-0 overflow-y-auto px-3 py-4">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <DetailRow label="Owner" value={action.assignedToName} />
          <DetailRow
            label="Due"
            value={action.dueDate || action.dueLabel}
            valueClassName={isDueToday(action) ? "text-orange-600 font-semibold" : undefined}
          />
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-xs font-medium text-slate-500">Status</span>
            <StatusChip variant={chip.variant}>{chip.label}</StatusChip>
          </div>
          <DetailRow
            label="Priority"
            value={action.severity}
            valueClassName={priorityHigh ? "text-rose-600 font-semibold" : undefined}
          />
          <DetailRow label="Created" value={action.createdAt} />
          <DetailRow label="Location" value={action.siteArea || "—"} />
          <button
            type="button"
            className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left"
            onClick={() => evidenceInputRef.current?.click()}
          >
            <span className="text-xs font-medium text-slate-500">Evidence</span>
            <span className="flex items-center gap-1 text-sm font-semibold text-slate-800">
              {action.evidenceCount > 0 ? `${action.evidenceCount} attached` : "Add"}
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </span>
          </button>
          <button type="button" className="flex w-full items-center justify-between px-4 py-3 text-left">
            <span className="text-xs font-medium text-slate-500">Notes</span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        {permissions.canAssignActions && (
          <div className="mt-4">
            <label className="mb-1 block text-xs font-semibold text-slate-600">Assign</label>
            <select
              value={action.assignedToName}
              onChange={(event) => onAssignAction(action.id, event.target.value)}
              className={`h-11 w-full rounded-2xl px-4 text-sm ${brandDarkFormControl}`}
            >
              {[action.assignedToName, ...availableAuditors]
                .filter((value, index, list) => value && list.indexOf(value) === index)
                .map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
            </select>
          </div>
        )}

        <input
          ref={evidenceInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files?.length) {
              onAddEvidence(action.id, event.target.files);
              event.target.value = "";
            }
          }}
        />
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-3">
        <button
          type="button"
          onClick={() => evidenceInputRef.current?.click()}
          className={`h-12 w-full rounded-2xl bg-[var(--bert-signal-orange)] text-sm font-semibold text-[var(--qms-navy-950)] shadow-md ${slatePrimaryCtaInteract}`}
        >
          Review evidence
        </button>
        <div className="mt-2 flex flex-wrap gap-2">
          {action.status === "Open" && (
            <button
              type="button"
              onClick={() => onAdvanceAction(action.id, "In Progress")}
              className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-800"
            >
              Start action
            </button>
          )}
          {action.status === "In Progress" && (
            <button
              type="button"
              onClick={() => onAdvanceAction(action.id, "Awaiting Verification")}
              className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-800"
            >
              Submit for verification
            </button>
          )}
          {action.status === "Awaiting Verification" && permissions.canVerifyActions && (
            <>
              <button
                type="button"
                onClick={() => onAdvanceAction(action.id, "Closed")}
                className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-800"
              >
                Verify & close
              </button>
              <button
                type="button"
                onClick={() => onAdvanceAction(action.id, "Rejected")}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
              >
                Reject
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-b-0">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <span className={`max-w-[60%] text-right text-sm text-slate-900 ${valueClassName ?? ""}`.trim()}>{value}</span>
    </div>
  );
}

export function ActionsScreen({
  currentUser,
  actions,
  actionFilter,
  actionSeverityFilter,
  actionNcFilter,
  availableNonConformanceIds,
  availableAuditors,
  onFilterChange,
  onSeverityFilterChange,
  onNcFilterChange,
  onAdvanceAction,
  onAssignAction,
  onAddEvidence,
}: {
  currentUser: User;
  actions: ActionItem[];
  actionFilter: ActionFilter;
  actionSeverityFilter: RiskLevel | "All";
  actionNcFilter: string;
  availableNonConformanceIds: string[];
  availableAuditors: string[];
  onFilterChange: (value: ActionFilter) => void;
  onSeverityFilterChange: (value: RiskLevel | "All") => void;
  onNcFilterChange: (value: string) => void;
  onAdvanceAction: (actionId: string, nextStatus?: ActionStatus) => void;
  onAssignAction: (actionId: string, assignee: string) => void;
  onAddEvidence: (actionId: string, files: FileList) => void;
}) {
  const permissions = getRolePermissions(currentUser.role);
  const wide = useWideLayout();
  const [mobileDetailId, setMobileDetailId] = useState<string | null>(null);

  const detailAction = useMemo(
    () => (mobileDetailId ? actions.find((a) => a.id === mobileDetailId) : undefined),
    [actions, mobileDetailId],
  );

  useEffect(() => {
    if (wide) setMobileDetailId(null);
  }, [wide]);

  useEffect(() => {
    if (mobileDetailId && !actions.some((a) => a.id === mobileDetailId)) {
      setMobileDetailId(null);
    }
  }, [actions, mobileDetailId]);

  const openDetail = useCallback((id: string) => {
    if (!wide) setMobileDetailId(id);
  }, [wide]);

  if (!wide && detailAction) {
    return (
      <MobileActionDetail
        action={detailAction}
        permissions={permissions}
        onBack={() => setMobileDetailId(null)}
        onAdvanceAction={onAdvanceAction}
        onAssignAction={onAssignAction}
        onAddEvidence={onAddEvidence}
        availableAuditors={availableAuditors}
      />
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
            <ActionsScreenIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              {canCompleteAuditAsAuditor(currentUser.role) ? "My actions" : "Corrective actions"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              {canCompleteAuditAsAuditor(currentUser.role) ? "Assigned corrective actions" : "CAPA control centre"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Track failed findings, assign ownership, upload evidence, and verify closure.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-700 bg-slate-900 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <select
            value={actionFilter}
            onChange={(event) => onFilterChange(event.target.value as ActionFilter)}
            className="h-12 rounded-2xl border border-[rgba(249,115,22,0.45)] bg-slate-950 px-4 text-sm text-white outline-none focus:border-[var(--bert-signal-orange)]"
          >
            <option value="Open">Open</option>
            <option value="Overdue">Overdue</option>
            <option value="Awaiting Verification">Awaiting Verification</option>
            <option value="Closed">Closed</option>
            <option value="Severity">All by severity</option>
          </select>
          <select
            value={actionSeverityFilter}
            onChange={(event) => onSeverityFilterChange(event.target.value as RiskLevel | "All")}
            className="h-12 rounded-2xl border border-[rgba(249,115,22,0.45)] bg-slate-950 px-4 text-sm text-white outline-none focus:border-[var(--bert-signal-orange)]"
          >
            <option value="All">All severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <select
            value={actionNcFilter}
            onChange={(event) => onNcFilterChange(event.target.value)}
            className="h-12 rounded-2xl border border-[rgba(249,115,22,0.45)] bg-slate-950 px-4 text-sm text-white outline-none focus:border-[var(--bert-signal-orange)]"
          >
            <option value="All">All non-conformance refs</option>
            {availableNonConformanceIds.map((reference) => (
              <option key={reference} value={reference}>
                {reference}
              </option>
            ))}
          </select>
        </div>
      </section>

      {actions.length === 0 ? (
        <EmptyPanel
          title="No open actions"
          text="Nothing needs follow-up here right now. Failed or flagged answers from audits can create actions automatically — you can also add one when a finding needs tracking."
        />
      ) : (
        <div className="space-y-3">
          {actions.map((action) => (
            <section
              key={action.id}
              className="cursor-pointer rounded-[1.6rem] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_16px_30px_rgba(15,23,42,0.06)] lg:cursor-default"
              onClick={() => openDetail(action.id)}
              onKeyDown={(e) => {
                if (!wide && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  openDetail(action.id);
                }
              }}
              role={wide ? undefined : "button"}
              tabIndex={wide ? undefined : 0}
            >
              {(() => {
                const urgency = getActionUrgency(action);
                const urgencyTone =
                  urgency === "Escalated"
                    ? "bg-rose-200 text-rose-900"
                    : urgency === "Overdue"
                      ? "bg-rose-100 text-rose-700"
                      : urgency === "Stuck"
                        ? "bg-amber-100 text-amber-800"
                        : urgency === "Due soon"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-700";
                return (
                  <div className="mb-2 flex items-center justify-between">
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{action.status}</div>
                    <div className={`rounded-full px-3 py-1 text-xs font-semibold ${urgencyTone}`}>{urgency}</div>
                  </div>
                );
              })()}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{action.auditName}</p>
                  <p className="mt-2 text-sm text-slate-600">{action.questionText}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {action.nonConformanceId && <MetaPill icon="spark" label={action.nonConformanceId} />}
                    <MetaPill icon="spark" label={action.severity} />
                    <MetaPill icon="clipboard" label={action.riskCategory} />
                    <MetaPill icon="user" label={action.assignedToName} />
                    <MetaPill icon="clock" label={action.dueDate || action.dueLabel} />
                    <MetaPill
                      icon="camera"
                      label={
                        action.evidenceRequired
                          ? action.evidenceCount === 0
                            ? "Evidence required"
                            : `${action.evidenceCount} evidence`
                          : action.evidenceCount > 0
                            ? `${action.evidenceCount} evidence`
                            : "Evidence optional"
                      }
                    />
                  </div>
                  {action.status !== "Closed" && action.evidenceRequired && action.evidenceCount === 0 && (
                    <p className="mt-2 text-xs font-semibold text-amber-700">Reason not closed: evidence missing.</p>
                  )}
                </div>
              </div>
              <div className="mt-4 hidden gap-3 lg:grid lg:grid-cols-2" onClick={(e) => e.stopPropagation()}>
                {permissions.canAssignActions && (
                  <select
                    value={action.assignedToName}
                    onChange={(event) => onAssignAction(action.id, event.target.value)}
                    className={`h-11 w-full min-w-0 rounded-2xl px-4 text-sm ${brandDarkFormControl}`}
                  >
                    {[action.assignedToName, ...availableAuditors].filter((value, index, list) => value && list.indexOf(value) === index).map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                )}
                <div className="flex flex-wrap gap-2">
                  {action.status !== "Closed" && (
                    <div className="w-full">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Upload evidence</p>
                      <label className={`inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white ${slatePrimaryCtaInteract}`}>
                        Attach photo evidence
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(event) => {
                            if (event.target.files?.length) {
                              onAddEvidence(action.id, event.target.files);
                              event.target.value = "";
                            }
                          }}
                        />
                      </label>
                      <p className="mt-1 text-[11px] text-slate-500">Add photo evidence before submitting for verification.</p>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        title="Fallback file chooser"
                        className={`mt-2 h-9 w-full rounded-xl px-2 text-xs ${brandDarkFormControl}`}
                        onChange={(event) => {
                          if (event.target.files?.length) {
                            onAddEvidence(action.id, event.target.files);
                            event.target.value = "";
                          }
                        }}
                      />
                    </div>
                  )}
                  {action.status === "Open" && (
                    <button onClick={() => onAdvanceAction(action.id, "In Progress")} className={`h-11 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white ${slatePrimaryCtaInteract}`}>
                      Start action
                    </button>
                  )}
                  {action.status === "Awaiting Verification" && permissions.canVerifyActions && (
                    <button onClick={() => onAdvanceAction(action.id, "Closed")} className={`h-11 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white ${slatePrimaryCtaInteract}`}>
                      Verify & close
                    </button>
                  )}
                  {action.status === "In Progress" && (
                    <button onClick={() => onAdvanceAction(action.id, "Awaiting Verification")} className={`h-11 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white ${slatePrimaryCtaInteract}`}>
                      Submit for verification
                    </button>
                  )}
                  {permissions.canVerifyActions && action.status === "Awaiting Verification" && (
                    <button onClick={() => onAdvanceAction(action.id, "Rejected")} className="h-11 rounded-2xl bg-rose-50 px-4 text-sm font-semibold text-rose-700">
                      Reject
                    </button>
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
