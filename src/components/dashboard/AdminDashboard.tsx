import { useEffect, useMemo, useState } from "react";
import { storageKeys } from "../../config/storageKeys";
import type { AdminDashboardProps } from "../../types/dashboardScreenProps";
import { getAuditTrafficStatus } from "../../utils/dashboardHealth";
import { isEscalated, isOverdue, isStuck } from "../../utils/managerDashboard";
import { DashboardBertFlowStrip, SectionHeader, StartHereCard } from "./DashboardPrimitives";

export function AdminDashboard({
  groupedAudits,
  assignedAudits,
  actions,
  pendingSyncCount,
  failedSyncCount,
  reportUsersCount,
  activeSchedulesCount,
  templatesCount,
  onOpenAudit,
  onAdvanceAction,
}: AdminDashboardProps) {
  const overdueAudits = useMemo(() => assignedAudits.filter((audit) => getAuditTrafficStatus(audit.dueHours) === "red"), [assignedAudits]);
  const overdueActions = useMemo(() => actions.filter((action) => isOverdue(action)), [actions]);
  const escalatedActions = useMemo(() => actions.filter((action) => isEscalated(action)), [actions]);
  const stuckActions = useMemo(() => actions.filter((action) => isStuck(action)), [actions]);
  const auditsDueToday = useMemo(() => assignedAudits.filter((audit) => audit.dueHours >= 0 && audit.dueHours <= 24), [assignedAudits]);
  const actionsDueToday = useMemo(() => actions.filter((action) => action.dueHours >= 0 && action.dueHours <= 24 && action.status !== "Closed"), [actions]);
  const allClear = overdueAudits.length === 0 && overdueActions.length === 0 && escalatedActions.length === 0 && stuckActions.length === 0;

  const {
    showLayoutOptions,
    setShowLayoutOptions,
    sectionOrder,
    sectionVisibility,
    visibleSectionOrder,
    toggleSection,
    moveSection,
  } = useDashboardSectionLayout(storageKeys.layoutAdmin, ["immediateAttention", "todaysWork", "systemOverview"]);

  const adminLayoutSectionLabels: Record<string, string> = {
    immediateAttention: "Needs attention",
    todaysWork: "Today",
    systemOverview: "Workspace health",
  };

  const renderSection = (section: string) => {
    if (section === "immediateAttention") {
      return (
        <section key={section} className="rounded-2xl border border-sky-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
          <SectionHeader icon="shield" eyebrow="Needs attention" title="Needs attention" subtitle="Operational issues needing action." />
          {allClear ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm font-semibold text-blue-900">All clear - No overdue audits, actions, or critical issues.</div>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              <div className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">Overdue actions {overdueActions.length}</div>
              <div className="rounded-full bg-rose-200 px-3 py-1 text-xs font-semibold text-rose-900">Escalated {escalatedActions.length}</div>
              <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Stuck {stuckActions.length}</div>
              <div className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">Overdue audits {overdueAudits.length}</div>
            </div>
          )}
        </section>
      );
    }
    if (section === "todaysWork") {
      return (
        <section key={section} className="rounded-2xl border border-sky-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
          <SectionHeader icon="clock" eyebrow="Today" title="Today" subtitle="What must be completed today." />
          <div className="mt-2 grid gap-3 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Audits due today</p>
              {auditsDueToday.length === 0 ? <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">No audits due today.</div> : auditsDueToday.slice(0, 4).map((audit) => (
                <button key={audit.id} onClick={() => onOpenAudit(audit.id)} className="mt-2 w-full rounded-xl border border-sky-200/70 bg-slate-50 px-3 py-2.5 text-left">
                  <p className="text-sm font-semibold text-slate-900">{audit.name}</p>
                </button>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Actions due today</p>
              {actionsDueToday.length === 0 ? <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">No actions due today.</div> : actionsDueToday.slice(0, 4).map((action) => (
                <button key={action.id} onClick={() => onAdvanceAction(action.id)} className="mt-2 w-full rounded-xl border border-sky-200/70 bg-slate-50 px-3 py-2.5 text-left">
                  <p className="text-sm font-semibold text-slate-900">{action.questionText}</p>
                </button>
              ))}
            </div>
          </div>
        </section>
      );
    }
    return (
      <section key={section} className="rounded-2xl border border-sky-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
        <SectionHeader icon="chart" eyebrow="Workspace health" title="Overview" subtitle="People, schedules, templates, and sync health." />
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-sky-200/70 bg-slate-50 px-3 py-2"><p className="text-xs text-slate-500">Total users</p><p className="text-lg font-semibold text-slate-900">{reportUsersCount}</p></div>
          <div className="rounded-xl border border-sky-200/70 bg-slate-50 px-3 py-2"><p className="text-xs text-slate-500">Active schedules</p><p className="text-lg font-semibold text-slate-900">{activeSchedulesCount}</p></div>
          <div className="rounded-xl border border-sky-200/70 bg-slate-50 px-3 py-2"><p className="text-xs text-slate-500">Audit templates</p><p className="text-lg font-semibold text-slate-900">{templatesCount}</p></div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Pending sync {pendingSyncCount}</div>
          <div className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">Failed sync {failedSyncCount}</div>
          <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Conflicts {failedSyncCount}</div>
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-4">
      {assignedAudits.length === 0 && <StartHereCard />}
      <section className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-white">Dashboard</p>
          <button onClick={() => setShowLayoutOptions((current) => !current)} className="h-8 rounded-lg border border-slate-200 bg-slate-100 px-3 text-xs font-medium text-slate-600">
            Layout options
          </button>
        </div>
        {showLayoutOptions && (
          <div className="mt-2 space-y-2">
            {sectionOrder.map((section, index) => (
              <div key={section} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <input type="checkbox" checked={sectionVisibility[section]} onChange={() => toggleSection(section)} />
                <span className="min-w-0 flex-1 text-sm text-slate-700">{adminLayoutSectionLabels[section] ?? section}</span>
                <button onClick={() => moveSection(section, "up")} disabled={index === 0} className="h-7 rounded border border-slate-200 bg-white px-2 text-xs">↑</button>
                <button onClick={() => moveSection(section, "down")} disabled={index === sectionOrder.length - 1} className="h-7 rounded border border-slate-200 bg-white px-2 text-xs">↓</button>
              </div>
            ))}
          </div>
        )}
        <DashboardBertFlowStrip variant="onDark" />
      </section>
      {visibleSectionOrder.map((section) => renderSection(section))}
    </div>
  );
}

function useDashboardSectionLayout(storageKey: string, defaultOrder: string[]) {
  const [showLayoutOptions, setShowLayoutOptions] = useState(false);
  const [sectionOrder, setSectionOrder] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return defaultOrder;
      const parsed = JSON.parse(raw) as { order?: string[] };
      const safeOrder = (parsed.order || []).filter((item) => defaultOrder.includes(item));
      const missing = defaultOrder.filter((item) => !safeOrder.includes(item));
      return [...safeOrder, ...missing];
    } catch {
      return defaultOrder;
    }
  });
  const [sectionVisibility, setSectionVisibility] = useState<Record<string, boolean>>(() => {
    const defaults = Object.fromEntries(defaultOrder.map((key) => [key, true])) as Record<string, boolean>;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw) as { visibility?: Record<string, boolean> };
      const visibility = { ...defaults };
      Object.entries(parsed.visibility || {}).forEach(([key, value]) => {
        if (key in visibility) visibility[key] = Boolean(value);
      });
      return visibility;
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        order: sectionOrder,
        visibility: sectionVisibility,
      }),
    );
  }, [storageKey, sectionOrder, sectionVisibility]);

  const visibleSectionOrder = sectionOrder.filter((key) => sectionVisibility[key]);

  const toggleSection = (section: string) => {
    setSectionVisibility((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  const moveSection = (section: string, direction: "up" | "down") => {
    setSectionOrder((current) => {
      const index = current.indexOf(section);
      if (index < 0) return current;
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  return {
    showLayoutOptions,
    setShowLayoutOptions,
    sectionOrder,
    sectionVisibility,
    visibleSectionOrder,
    toggleSection,
    moveSection,
  };
}
