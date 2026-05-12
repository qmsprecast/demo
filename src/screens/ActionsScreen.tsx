import { canCompleteAuditAsAuditor, getRolePermissions } from "../permissions";
import { EmptyPanel, MetaPill } from "../components/dashboard/DashboardPrimitives";
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

function getActionUrgency(action: ActionItem): "Escalated" | "Overdue" | "Stuck" | "Due soon" | "Normal" {
  if (isActionEscalated(action)) return "Escalated";
  if (isActionOverdue(action)) return "Overdue";
  if (isActionStuck(action)) return "Stuck";
  if (isActionDueSoon(action)) return "Due soon";
  return "Normal";
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
  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
            <ActionsScreenIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{canCompleteAuditAsAuditor(currentUser.role) ? "My actions" : "Corrective actions"}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{canCompleteAuditAsAuditor(currentUser.role) ? "Assigned corrective actions" : "CAPA control centre"}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">Track failed findings, assign ownership, upload evidence, and verify closure.</p>
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
        <EmptyPanel title="No corrective actions in this view" text="Failed answers and flagged issues will create actions here automatically." />
      ) : (
        <div className="space-y-3">
          {actions.map((action) => (
            <section key={action.id} className="rounded-[1.6rem] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_16px_30px_rgba(15,23,42,0.06)]">
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
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {permissions.canAssignActions && (
                  <select
                    value={action.assignedToName}
                    onChange={(event) => onAssignAction(action.id, event.target.value)}
                    className={`h-11 w-full min-w-0 rounded-2xl px-4 text-sm ${brandDarkFormControl}`}
                  >
                    {[action.assignedToName, ...availableAuditors].filter((value, index, list) => value && list.indexOf(value) === index).map((name) => (
                      <option key={name} value={name}>{name}</option>
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
                  {permissions.canVerifyActions && action.status === "Awaiting Verification" && <button onClick={() => onAdvanceAction(action.id, "Rejected")} className="h-11 rounded-2xl bg-rose-50 px-4 text-sm font-semibold text-rose-700">Reject</button>}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
