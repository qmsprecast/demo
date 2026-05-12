import { useEffect, useMemo, useState } from "react";
import { storageKeys } from "../../config/storageKeys";
import type { ManagerDashboardProps } from "../../types/dashboardScreenProps";
import type { Audit, AuditStatus } from "../../types/reportsScreenProps";
import { amberThresholdHours, getAuditTrafficStatus, getDueWarning, statusStyles } from "../../utils/dashboardHealth";
import { isEscalated, isOverdue, isStuck } from "../../utils/managerDashboard";
import { DashboardBertFlowStrip, SectionHeader, StartHereCard, StatusBadge, TrendBar } from "./DashboardPrimitives";

export function ManagerDashboard({
  groupedAudits,
  assignedAudits,
  actions,
  onOpenAudit,
  onAdvanceAction,
  recurringFailedQuestions,
}: ManagerDashboardProps) {
  const overdueAudits = useMemo(
    () => assignedAudits.filter((audit) => getAuditTrafficStatus(audit.dueHours) === "red"),
    [assignedAudits],
  );
  const overdueActions = useMemo(() => actions.filter((action) => isOverdue(action)), [actions]);
  const escalatedActions = useMemo(() => actions.filter((action) => isEscalated(action)), [actions]);
  const stuckActions = useMemo(() => actions.filter((action) => isStuck(action)), [actions]);
  const auditsDueToday = useMemo(
    () => assignedAudits.filter((audit) => audit.dueHours >= 0 && audit.dueHours <= 24),
    [assignedAudits],
  );
  const actionsDueToday = useMemo(
    () => actions.filter((action) => action.dueHours >= 0 && action.dueHours <= 24 && action.status !== "Closed"),
    [actions],
  );
  const repeatedTop3 = useMemo(() => recurringFailedQuestions.slice(0, 3), [recurringFailedQuestions]);
  const allClear =
    overdueAudits.length === 0 &&
    overdueActions.length === 0 &&
    escalatedActions.length === 0 &&
    stuckActions.length === 0;
  const totalLiveAudits = Math.max(1, groupedAudits.red.length + groupedAudits.amber.length + groupedAudits.green.length);
  const openActionsCount = actions.filter((item) => item.status === "Open").length;
  const inProgressActionsCount = actions.filter((item) => item.status === "In Progress").length;
  const awaitingVerificationCount = actions.filter((item) => item.status === "Awaiting Verification").length;
  const closedActionsCount = actions.filter((item) => item.status === "Closed").length;
  const totalActionsCount = Math.max(1, actions.length);
  const [selectedLiveGraph, setSelectedLiveGraph] = useState<"auditTraffic" | "actionStatus" | "riskFocus">("auditTraffic");
  const [selectedGraphType, setSelectedGraphType] = useState<"column" | "line" | "area" | "bar">("column");

  const {
    showLayoutOptions,
    setShowLayoutOptions,
    sectionOrder,
    sectionVisibility,
    visibleSectionOrder,
    toggleSection,
    moveSection,
  } = useDashboardSectionLayout(storageKeys.layoutManager, ["immediateAttention", "todaysWork", "liveBoard", "liveGraphs", "repeatIssues"]);

  const managerLayoutSectionLabels: Record<string, string> = {
    immediateAttention: "Needs attention",
    todaysWork: "Today",
    liveBoard: "Audit traffic",
    liveGraphs: "Charts",
    repeatIssues: "Repeat issues",
  };

  const renderSection = (section: string) => {
    if (section === "immediateAttention") {
      return (
        <section key={section} className="rounded-2xl border border-sky-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
          <SectionHeader icon="shield" eyebrow="Needs attention" title="Needs attention" subtitle="Items that need action now." />
          <div className="mt-2 flex flex-wrap gap-2">
            <div className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">Overdue actions {overdueActions.length}</div>
            <div className="rounded-full bg-rose-200 px-3 py-1 text-xs font-semibold text-rose-900">Escalated {escalatedActions.length}</div>
            <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Stuck {stuckActions.length}</div>
            <div className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">Overdue audits {overdueAudits.length}</div>
          </div>
          {allClear ? (
            <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm font-semibold text-blue-900">
              All clear - No overdue audits, actions, or critical issues.
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {[...escalatedActions.slice(0, 2), ...stuckActions.slice(0, 2), ...overdueActions.slice(0, 2)].slice(0, 4).map((action) => (
                <div key={`attention-${action.id}`} className="rounded-xl border border-sky-200/70 bg-slate-50 px-3 py-2.5">
                  <p className="text-sm font-semibold text-slate-900">{action.questionText}</p>
                  <p className="mt-1 text-xs text-slate-500">{action.auditName} - {action.assignedToName}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      );
    }
    if (section === "todaysWork") {
      return (
        <section key={section} className="rounded-2xl border border-sky-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
          <SectionHeader icon="clock" eyebrow="Today" title="Today" subtitle="Audits and actions due today." />
          <div className="mt-2 grid gap-3 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Audits due today</p>
              {auditsDueToday.length === 0 ? (
                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">No audits due today.</div>
              ) : (
                <div className="mt-2 space-y-2">
                  {auditsDueToday.slice(0, 4).map((audit) => (
                    <button key={audit.id} onClick={() => onOpenAudit(audit.id)} className="w-full rounded-xl border border-sky-200/70 bg-slate-50 px-3 py-2.5 text-left">
                      <p className="text-sm font-semibold text-slate-900">{audit.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{getDueWarning(audit.dueHours)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Actions due today</p>
              {actionsDueToday.length === 0 ? (
                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">No actions due today.</div>
              ) : (
                <div className="mt-2 space-y-2">
                  {actionsDueToday.slice(0, 4).map((action) => (
                    <button key={action.id} onClick={() => onAdvanceAction(action.id)} className="w-full rounded-xl border border-sky-200/70 bg-slate-50 px-3 py-2.5 text-left">
                      <p className="text-sm font-semibold text-slate-900">{action.questionText}</p>
                      <p className="mt-1 text-xs text-slate-500">{action.assignedToName} - {action.dueLabel}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      );
    }
    if (section === "liveBoard") {
      return (
        <section key={section} className="rounded-2xl border border-sky-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
          <SectionHeader icon="dashboard" eyebrow="Open work" title="Audit traffic" subtitle="Red, amber, and green audits side by side." />
          <div className="mt-2 grid gap-2">
            <TrafficLane title="Red" subtitle="Overdue" audits={groupedAudits.red.slice(0, 1)} status="red" onOpenAudit={onOpenAudit} />
            <TrafficLane title="Amber" subtitle={`<${amberThresholdHours}h remaining`} audits={groupedAudits.amber.slice(0, 1)} status="amber" onOpenAudit={onOpenAudit} />
            <TrafficLane title="Green" subtitle={`>${amberThresholdHours}h remaining`} audits={groupedAudits.green.slice(0, 1)} status="green" onOpenAudit={onOpenAudit} />
          </div>
        </section>
      );
    }
    if (section === "liveGraphs") {
      const graphSeries =
        selectedLiveGraph === "auditTraffic"
          ? [
              { label: "Red", value: groupedAudits.red.length, tone: "red" as const },
              { label: "Amber", value: groupedAudits.amber.length, tone: "amber" as const },
              { label: "Green", value: groupedAudits.green.length, tone: "green" as const },
            ]
          : selectedLiveGraph === "actionStatus"
            ? [
                { label: "Open", value: openActionsCount, tone: "red" as const },
                { label: "In progress", value: inProgressActionsCount, tone: "amber" as const },
                { label: "Awaiting verification", value: awaitingVerificationCount, tone: "amber" as const },
                { label: "Closed", value: closedActionsCount, tone: "green" as const },
              ]
            : [
                { label: "Overdue audits", value: overdueAudits.length, tone: "red" as const },
                { label: "Overdue actions", value: overdueActions.length, tone: "red" as const },
                { label: "Escalated", value: escalatedActions.length, tone: "amber" as const },
                { label: "Stuck", value: stuckActions.length, tone: "amber" as const },
              ];
      return (
        <section key={section} className="rounded-2xl border border-sky-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
          <SectionHeader icon="chart" eyebrow="More detail" title="Charts" subtitle="Optional views of audits, actions, and risk pressure." />
          <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Graph view</p>
              <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                <div className="relative w-full sm:w-[16rem]">
                  <select
                    value={selectedLiveGraph}
                    onChange={(event) => setSelectedLiveGraph(event.target.value as "auditTraffic" | "actionStatus" | "riskFocus")}
                    className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 pr-8 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                  >
                    <option value="auditTraffic">Audit traffic mix</option>
                    <option value="actionStatus">Action status mix</option>
                    <option value="riskFocus">Risk focus and pressure points</option>
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-400">▾</span>
                </div>
                <div className="relative w-full sm:w-[10rem]">
                  <select
                    value={selectedGraphType}
                    onChange={(event) => setSelectedGraphType(event.target.value as "column" | "line" | "area" | "bar")}
                    className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 pr-8 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                  >
                    <option value="column">Column</option>
                    <option value="line">Line</option>
                    <option value="area">Area</option>
                    <option value="bar">Bar</option>
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-400">▾</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <LiveGraphChart data={graphSeries} chartType={selectedGraphType} />
            {selectedLiveGraph === "auditTraffic" && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Audit traffic mix</p>
                <TrendBar label="Red" value={groupedAudits.red.length} total={totalLiveAudits} tone="red" />
                <TrendBar label="Amber" value={groupedAudits.amber.length} total={totalLiveAudits} tone="amber" />
                <TrendBar label="Green" value={groupedAudits.green.length} total={totalLiveAudits} tone="green" />
              </div>
            )}
            {selectedLiveGraph === "actionStatus" && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Action status mix</p>
                <TrendBar label="Open" value={openActionsCount} total={totalActionsCount} tone="red" />
                <TrendBar label="In progress" value={inProgressActionsCount} total={totalActionsCount} tone="amber" />
                <TrendBar label="Awaiting verification" value={awaitingVerificationCount} total={totalActionsCount} tone="amber" />
                <TrendBar label="Closed" value={closedActionsCount} total={totalActionsCount} tone="green" />
              </div>
            )}
            {selectedLiveGraph === "riskFocus" && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Risk focus</p>
                <TrendBar label="Overdue audits" value={overdueAudits.length} total={Math.max(1, assignedAudits.length)} tone="red" />
                <TrendBar label="Overdue actions" value={overdueActions.length} total={totalActionsCount} tone="red" />
                <TrendBar label="Escalated actions" value={escalatedActions.length} total={totalActionsCount} tone="amber" />
                <TrendBar label="Stuck actions" value={stuckActions.length} total={totalActionsCount} tone="amber" />
              </div>
            )}
          </div>
        </section>
      );
    }
    return (
      <section key={section} className="rounded-2xl border border-sky-200/80 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
        <SectionHeader icon="warningTriangle" eyebrow="More detail" title="Repeat issues" subtitle="Most frequent failed findings this week." />
        {repeatedTop3.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">All clear - no repeated failures.</div>
        ) : (
          <div className="space-y-2">
            {repeatedTop3.map(([question, count]) => (
              <div key={`repeat-${question}`} className="rounded-xl border border-sky-200/70 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                {question} failed {count} time{count === 1 ? "" : "s"} this week
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  const hasImmediateAttention = visibleSectionOrder.includes("immediateAttention");
  const hasTodaysWork = visibleSectionOrder.includes("todaysWork");
  const remainingSections = visibleSectionOrder.filter((section) => section !== "immediateAttention" && section !== "todaysWork");

  return (
    <div className="space-y-4">
      {assignedAudits.length === 0 && <StartHereCard />}
      <section className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-white">Home</p>
          <button onClick={() => setShowLayoutOptions((current) => !current)} className="h-8 rounded-lg border border-slate-200 bg-slate-100 px-3 text-xs font-medium text-slate-600">
            Layout options
          </button>
        </div>
        {showLayoutOptions && (
          <div className="mt-2 space-y-2">
            {sectionOrder.map((section, index) => (
              <div key={section} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <input type="checkbox" checked={sectionVisibility[section]} onChange={() => toggleSection(section)} />
                <span className="min-w-0 flex-1 text-sm text-slate-700">{managerLayoutSectionLabels[section] ?? section}</span>
                <button onClick={() => moveSection(section, "up")} disabled={index === 0} className="h-7 rounded border border-slate-200 bg-white px-2 text-xs">↑</button>
                <button onClick={() => moveSection(section, "down")} disabled={index === sectionOrder.length - 1} className="h-7 rounded border border-slate-200 bg-white px-2 text-xs">↓</button>
              </div>
            ))}
          </div>
        )}
        <DashboardBertFlowStrip variant="onDark" />
      </section>
      {(hasImmediateAttention || hasTodaysWork) && (
        <div className="grid gap-3 lg:grid-cols-2">
          {hasImmediateAttention && (
            <div className="lg:h-[21rem] [&>section]:h-full [&>section]:overflow-y-auto">
              {renderSection("immediateAttention")}
            </div>
          )}
          {hasTodaysWork && (
            <div className="lg:h-[21rem] [&>section]:h-full [&>section]:overflow-y-auto">
              {renderSection("todaysWork")}
            </div>
          )}
        </div>
      )}
      {remainingSections.map((section) => renderSection(section))}
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

function LiveGraphChart({
  data,
  chartType,
}: {
  data: Array<{ label: string; value: number; tone: "green" | "amber" | "red" }>;
  chartType: "column" | "line" | "area" | "bar";
}) {
  const max = Math.max(1, ...data.map((item) => item.value));
  const toneColor = (tone: "green" | "amber" | "red") => (tone === "green" ? "#10b981" : tone === "amber" ? "#f59e0b" : "#f43f5e");

  if (chartType === "bar") {
    return (
      <div className="mb-3 space-y-2 rounded-xl border border-slate-200 bg-white p-3">
        {data.map((item) => {
          const width = Math.max(8, Math.round((item.value / max) * 100));
          return (
            <div key={`bar-${item.label}`} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">{item.label}</span>
                <span className="text-slate-500">{item.value}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full" style={{ width: `${width}%`, backgroundColor: toneColor(item.tone) }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const width = 480;
  const height = 180;
  const left = 24;
  const right = 12;
  const top = 12;
  const bottom = 32;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const step = data.length > 1 ? plotW / (data.length - 1) : plotW;
  const points = data.map((item, index) => {
    const x = left + step * index;
    const y = top + (1 - item.value / max) * plotH;
    return { ...item, x, y };
  });
  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPoints = `${left},${top + plotH} ${linePoints} ${left + plotW},${top + plotH}`;

  return (
    <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full">
        <line x1={left} y1={top + plotH} x2={left + plotW} y2={top + plotH} stroke="#cbd5e1" strokeWidth="1" />
        {chartType === "column" &&
          points.map((point) => {
            const barW = Math.max(18, plotW / Math.max(data.length * 2, 6));
            return (
              <rect
                key={`col-${point.label}`}
                x={point.x - barW / 2}
                y={point.y}
                width={barW}
                height={top + plotH - point.y}
                rx="4"
                fill={toneColor(point.tone)}
                fillOpacity="0.9"
              />
            );
          })}
        {chartType === "line" && <polyline points={linePoints} fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />}
        {chartType === "area" && (
          <>
            <polygon points={areaPoints} fill="#0f172a" fillOpacity="0.16" />
            <polyline points={linePoints} fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
          </>
        )}
        {(chartType === "line" || chartType === "area") &&
          points.map((point) => <circle key={`dot-${point.label}`} cx={point.x} cy={point.y} r="4" fill={toneColor(point.tone)} />)}
        {points.map((point) => (
          <text key={`lbl-${point.label}`} x={point.x} y={height - 10} textAnchor="middle" fontSize="10" fill="#64748b">
            {point.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

function TrafficLane({
  title,
  subtitle,
  audits,
  status,
  onOpenAudit,
}: {
  title: string;
  subtitle: string;
  audits: Audit[];
  status: AuditStatus;
  onOpenAudit: (auditId: string) => void;
}) {
  const hiddenCount = Math.max(0, audits.length - audits.slice(0, 1).length);

  return (
    <div className={["rounded-[1.2rem] p-2 ring-1 shadow-[0_8px_18px_rgba(15,23,42,0.05)]", statusStyles[status].soft, statusStyles[status].ring].join(" ")}>
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${statusStyles[status].dot}`} />
          <div>
            <p className={`text-xs font-semibold ${statusStyles[status].text}`}>{title}</p>
            <p className="text-[10px] text-slate-500">{subtitle}</p>
          </div>
        </div>
        <div className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-slate-700 shadow-[0_3px_10px_rgba(15,23,42,0.05)]">{audits.length}</div>
      </div>

      <div className="space-y-1.5">
        {audits.slice(0, 1).map((audit) => (
          <button
            key={audit.id}
            onClick={() => onOpenAudit(audit.id)}
            className="w-full rounded-xl bg-white/95 px-3 py-2 text-left shadow-[0_6px_14px_rgba(15,23,42,0.06)] transition active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900">{audit.name}</p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  {audit.siteArea} • {audit.priority} • Owner {audit.owner}
                </p>
                <p className="mt-1 text-[10px] font-medium text-slate-600">{getDueWarning(audit.dueHours)}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">Last completed {audit.lastCompletedAt}</p>
              </div>
              <div className="shrink-0 space-y-1 text-right">
                <StatusBadge status={getAuditTrafficStatus(audit.dueHours)} />
                <div className="text-[10px] text-slate-400">{audit.dueLabel}</div>
              </div>
            </div>
          </button>
        ))}
        {hiddenCount > 0 && <div className="px-1 text-[10px] font-semibold text-slate-500">+{hiddenCount} more</div>}
        {audits.length === 0 && <div className="rounded-xl bg-white/85 px-3 py-2 text-xs text-slate-500 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.04)]">No audits in this group.</div>}
      </div>
    </div>
  );
}
