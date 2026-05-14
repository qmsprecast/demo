import { useMemo } from "react";
import type { AuditorTaskDashboardProps } from "../../types/dashboardScreenProps";
import { amberThresholdHours, getAuditTrafficStatus, getDueWarning } from "../../utils/dashboardHealth";
import { getPlainEnglishSyncStatus } from "../../utils/plainEnglishSync";
import { getGreetingFirstName, getTimeBasedGreeting } from "../../utils/userDisplay";
import { pickNextAuditorAudit, rankAuditorAudit } from "../../utils/auditorDashboard";
import { ControlLoopStrip, deriveControlLoopState } from "./ControlLoopStrip";
import { MiniMetric, StartHereCard, StatusBadge } from "./DashboardPrimitives";

export function AuditorTaskDashboard({
  currentUser,
  groupedAudits,
  assignedAudits,
  drafts,
  actions,
  pendingSyncCount,
  failedSyncCount,
  showStartHereCard,
  workspaceLinked,
  recentCompletionsCount,
  onOpenAudit,
  slatePrimaryCtaInteract,
}: AuditorTaskDashboardProps) {
  void groupedAudits;
  const openOrInProgressActions = useMemo(
    () => actions.filter((item) => item.status === "Open" || item.status === "In Progress").length,
    [actions],
  );
  const awaitingVerificationCount = useMemo(
    () => actions.filter((item) => item.status === "Awaiting Verification").length,
    [actions],
  );
  const controlLoop = useMemo(
    () =>
      deriveControlLoopState({
        workspaceLinked,
        hasAssignedAudits: assignedAudits.length > 0,
        openOrInProgressActions,
        awaitingVerificationCount,
        recentCompletionCount: recentCompletionsCount,
      }),
    [
      workspaceLinked,
      assignedAudits.length,
      openOrInProgressActions,
      awaitingVerificationCount,
      recentCompletionsCount,
    ],
  );
  const sortedAudits = useMemo(
    () =>
      [...assignedAudits].sort((a, b) => {
        const rankDiff = rankAuditorAudit(a, Boolean(drafts[a.id])) - rankAuditorAudit(b, Boolean(drafts[b.id]));
        if (rankDiff !== 0) return rankDiff;
        return a.dueHours - b.dueHours;
      }),
    [assignedAudits, drafts],
  );
  const draftAudits = useMemo(() => sortedAudits.filter((audit) => Boolean(drafts[audit.id])), [sortedAudits, drafts]);
  const dueTodayAudits = useMemo(() => sortedAudits.filter((audit) => audit.dueHours >= 0 && audit.dueHours <= 24), [sortedAudits]);
  const orphanDraftCount = useMemo(() => {
    const assignedAuditIds = new Set(assignedAudits.map((audit) => audit.id));
    return Object.keys(drafts).filter((auditId) => !assignedAuditIds.has(auditId)).length;
  }, [assignedAudits, drafts]);
  const overdueCount = useMemo(() => sortedAudits.filter((audit) => audit.dueHours < 0).length, [sortedAudits]);
  const dueTodayCount = useMemo(() => sortedAudits.filter((audit) => audit.dueHours >= 0 && audit.dueHours <= 24).length, [sortedAudits]);
  const dueSoonCount = useMemo(
    () => sortedAudits.filter((audit) => audit.dueHours >= 0 && audit.dueHours < amberThresholdHours).length,
    [sortedAudits],
  );
  const onTrackCount = useMemo(
    () => sortedAudits.filter((audit) => audit.dueHours >= amberThresholdHours).length,
    [sortedAudits],
  );
  const draftCount = useMemo(() => sortedAudits.filter((audit) => Boolean(drafts[audit.id])).length, [sortedAudits, drafts]);
  const evidenceNeededCount = useMemo(
    () =>
      actions.filter(
        (action) =>
          (action.assignedToUserId === currentUser.username || action.assignedToName === currentUser.name) &&
          action.status !== "Closed" &&
          action.evidenceRequired &&
          action.evidenceCount === 0,
      ).length,
    [actions, currentUser.name, currentUser.username],
  );
  const nextAudit = useMemo(() => pickNextAuditorAudit(sortedAudits, drafts), [sortedAudits, drafts]);
  const primaryLabel = useMemo(() => {
    if (!nextAudit) return "No audits due";
    if (drafts[nextAudit.id]) return "Continue audit";
    if (nextAudit.dueHours < 0) return "Start overdue audit";
    if (getAuditTrafficStatus(nextAudit.dueHours) === "amber") return "Start due-soon audit";
    if (nextAudit.dueHours <= 24) return "Start today’s audit";
    return "Start next audit";
  }, [nextAudit, drafts]);
  const primarySubtitle = useMemo(() => {
    if (!nextAudit) return "All clear - no audits due right now.";
    if (drafts[nextAudit.id]) return `Resume ${nextAudit.name}`;
    if (nextAudit.dueHours < 0) return `Overdue now: ${nextAudit.name}`;
    if (getAuditTrafficStatus(nextAudit.dueHours) === "amber") return `Due soon: ${nextAudit.name}`;
    if (nextAudit.dueHours <= 24) return `Due today: ${nextAudit.name}`;
    return nextAudit.name;
  }, [nextAudit, drafts]);
  const evidenceActions = useMemo(
    () =>
      actions.filter(
        (action) =>
          (action.assignedToUserId === currentUser.username || action.assignedToName === currentUser.name) &&
          action.status !== "Closed" &&
          action.evidenceRequired &&
          action.evidenceCount === 0,
      ),
    [actions, currentUser.name, currentUser.username],
  );
  const syncPlain = useMemo(
    () =>
      getPlainEnglishSyncStatus({
        offlineQueueCount: 0,
        pendingSyncCount,
        failedSyncCount,
      }),
    [pendingSyncCount, failedSyncCount],
  );
  const syncLabel = syncPlain.summary;

  const greetingHeadline = useMemo(() => {
    const first = getGreetingFirstName(currentUser.name);
    return first ? `${getTimeBasedGreeting()}, ${first}` : getTimeBasedGreeting();
  }, [currentUser.name]);

  return (
    <div className="space-y-4">
      {showStartHereCard && <StartHereCard />}
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_16px_30px_rgba(15,23,42,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Needs attention</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{greetingHeadline}</h2>
        <p className="mt-1 text-sm text-slate-500">What do you need to do now?</p>
        <ControlLoopStrip currentStepIndex={controlLoop.currentStepIndex} tone="onLight" className="mt-2" />
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <MiniMetric label="Outstanding" value={String(overdueCount)} tone="red" />
          <MiniMetric label="Due now" value={String(dueSoonCount)} tone="amber" />
          <MiniMetric label="On track" value={String(onTrackCount)} tone="green" />
          <MiniMetric label="Due today" value={String(dueTodayCount)} tone="slate" />
          <MiniMetric label="In progress" value={String(draftCount)} tone="sky" />
          <MiniMetric label="Evidence missing" value={String(evidenceNeededCount)} tone="amber" />
        </div>
        <button
          type="button"
          onClick={() => nextAudit && onOpenAudit(nextAudit.id)}
          disabled={!nextAudit}
          className={`mt-4 min-h-[48px] w-full rounded-2xl text-lg font-semibold ${nextAudit ? `bg-slate-900 text-white ${slatePrimaryCtaInteract}` : "cursor-not-allowed bg-slate-200 text-slate-700"}`}
        >
          {nextAudit ? primaryLabel : "No audits due right now"}
        </button>
        <p className="mt-2 text-sm text-slate-500">{primarySubtitle}</p>
        {orphanDraftCount > 0 && (
          <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            {orphanDraftCount} in-progress audit{orphanDraftCount === 1 ? "" : "s"} could not be matched to a live audit template.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900">Today & open work</p>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Sync status</span>
            <div
              className={[
                "rounded-full px-3 py-1 text-xs font-semibold",
                syncPlain.tone === "problem"
                  ? "bg-rose-100 text-rose-800"
                  : syncPlain.tone === "waiting"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-50 text-emerald-900",
              ].join(" ")}
            >
              {syncLabel}
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Today&apos;s audits</p>
            <div className="space-y-2">
              {dueTodayAudits.slice(0, 3).map((audit) => (
                <button key={audit.id} type="button" onClick={() => onOpenAudit(audit.id)} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left">
                  <StatusBadge status={getAuditTrafficStatus(audit.dueHours)} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{audit.name}</p>
                    <p className="text-xs text-slate-500">{getDueWarning(audit.dueHours)}</p>
                  </div>
                </button>
              ))}
              {dueTodayAudits.length === 0 && <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">No audits due today.</p>}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Draft audits</p>
            <div className="space-y-2">
              {draftAudits.slice(0, 2).map((audit) => (
                <button key={audit.id} type="button" onClick={() => onOpenAudit(audit.id)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{audit.name}</p>
                    <p className="text-xs text-slate-500">{drafts[audit.id]?.updatedAt || "In progress"}</p>
                  </div>
                  <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700">Resume</span>
                </button>
              ))}
              {draftAudits.length === 0 && <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">No audits in progress.</p>}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Actions needing evidence</p>
            <div className="space-y-2">
              {evidenceActions.slice(0, 2).map((action) => (
                <div key={action.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-sm font-semibold text-slate-900">{action.questionText}</p>
                  <p className="text-xs text-slate-500">{action.auditName}</p>
                </div>
              ))}
              {evidenceActions.length === 0 && <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">No assigned actions waiting for evidence.</p>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
