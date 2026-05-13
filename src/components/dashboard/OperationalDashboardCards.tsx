import type { ReactNode } from "react";
import { StatusChip } from "../ui/StatusChip";

export type OperationalAttentionRow = {
  id: string;
  title: string;
  subtitle: string;
  chip: "overdue" | "none";
  onActivate: () => void;
};

export type OperationalDueRow = {
  id: string;
  title: string;
  subtitle: string;
  chip: "dueSoon" | "none";
  onActivate: () => void;
};

export type OperationalAwaitingRow = {
  id: string;
  title: string;
  subtitle: string;
  onActivate: () => void;
};

export type OperationalCompletionRow = {
  id: string;
  title: string;
  subtitle: string;
  chip: "verified" | "closed";
  onActivate: () => void;
};

function CardShell({
  icon,
  title,
  footer,
  children,
  iconTint,
}: {
  icon: ReactNode;
  title: string;
  footer: ReactNode;
  children: ReactNode;
  iconTint: string;
}) {
  return (
    <section className="flex h-full min-h-[12rem] flex-col rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconTint}`}>{icon}</div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight text-slate-900">{title}</h3>
        </div>
      </div>
      <div className="mt-3 min-h-0 flex-1 space-y-2">{children}</div>
      <div className="mt-3 border-t border-slate-100 pt-3">{footer}</div>
    </section>
  );
}

function AlertIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.85} aria-hidden>
      <path d="M12 4.75 20.25 19.25H3.75L12 4.75z" strokeLinejoin="round" />
      <path d="M12 9.5v4.5" strokeLinecap="round" />
      <circle cx="12" cy="16.35" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CalendarIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.85} aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" strokeLinecap="round" />
    </svg>
  );
}

function ShieldCheckIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.85} aria-hidden>
      <path d="M12 3 20 6v6c0 4.5-2.8 8.2-8 10-5.2-1.8-8-5.5-8-10V6l8-3Z" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckCircleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.85} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.2 2.3 2.2 4.7-4.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function OperationalDashboardCards({
  needsAttentionRows,
  dueTodayRows,
  awaitingRows,
  completionRows,
  onViewAllNeedsAttention,
  onViewAllDueToday,
  onViewAllAwaiting,
  onViewAllCompletions,
  devPreviewFill,
}: {
  needsAttentionRows: OperationalAttentionRow[];
  dueTodayRows: OperationalDueRow[];
  awaitingRows: OperationalAwaitingRow[];
  completionRows: OperationalCompletionRow[];
  onViewAllNeedsAttention: () => void;
  onViewAllDueToday: () => void;
  onViewAllAwaiting: () => void;
  onViewAllCompletions: () => void;
  /** When true and in DEV, show subtle hint that tiles are empty (no fabricated rows). */
  devPreviewFill?: boolean;
}) {
  const dev = import.meta.env.DEV && devPreviewFill;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <CardShell
        title="Needs attention"
        iconTint="bg-rose-50 text-rose-600 ring-1 ring-rose-100"
        icon={<AlertIcon />}
        footer={
          <button type="button" onClick={onViewAllNeedsAttention} className="text-xs font-semibold text-slate-700 underline-offset-2 hover:underline">
            View all
          </button>
        }
      >
        {needsAttentionRows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-3 text-xs leading-relaxed text-slate-600">
            <span className="font-semibold text-slate-800">You are caught up.</span> Nothing is calling for escalation right now. When audits slip or actions go overdue, they will appear here so you can respond quickly.
            {dev ? <span className="mt-2 block text-[10px] text-slate-400">Dev: connect data or load demo from Admin tools to populate rows.</span> : null}
          </p>
        ) : (
          needsAttentionRows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={row.onActivate}
              className="flex w-full items-start justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/90 px-3 py-2.5 text-left transition hover:border-slate-200 hover:bg-white"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{row.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{row.subtitle}</p>
              </div>
              <StatusChip variant={row.chip === "overdue" ? "overdue" : "none"} />
            </button>
          ))
        )}
      </CardShell>

      <CardShell
        title="Due today"
        iconTint="bg-orange-50 text-orange-600 ring-1 ring-orange-100"
        icon={<CalendarIcon />}
        footer={
          <button type="button" onClick={onViewAllDueToday} className="text-xs font-semibold text-slate-700 underline-offset-2 hover:underline">
            View all
          </button>
        }
      >
        {dueTodayRows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-3 text-xs leading-relaxed text-slate-600">
            <span className="font-semibold text-slate-800">No deadlines today.</span> Your schedule looks clear. When audits or actions are due within twenty-four hours, they will line up here.
            {dev ? <span className="mt-2 block text-[10px] text-slate-400">Dev: empty dataset — no sample rows shown in production builds.</span> : null}
          </p>
        ) : (
          dueTodayRows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={row.onActivate}
              className="flex w-full items-start justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/90 px-3 py-2.5 text-left transition hover:border-slate-200 hover:bg-white"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{row.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{row.subtitle}</p>
              </div>
              <StatusChip variant={row.chip === "dueSoon" ? "dueSoon" : "none"} />
            </button>
          ))
        )}
      </CardShell>

      <CardShell
        title="Awaiting verification"
        iconTint="bg-sky-50 text-sky-700 ring-1 ring-sky-100"
        icon={<ShieldCheckIcon />}
        footer={
          <button type="button" onClick={onViewAllAwaiting} className="text-xs font-semibold text-slate-700 underline-offset-2 hover:underline">
            View all
          </button>
        }
      >
        {awaitingRows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-3 text-xs leading-relaxed text-slate-600">
            <span className="font-semibold text-slate-800">Nothing waiting on you.</span> When field teams submit evidence for review, those actions will queue here for a calm verification pass.
            {dev ? <span className="mt-2 block text-[10px] text-slate-400">Dev: advance an action to Awaiting Verification to see this list.</span> : null}
          </p>
        ) : (
          awaitingRows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={row.onActivate}
              className="flex w-full items-start justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/90 px-3 py-2.5 text-left transition hover:border-slate-200 hover:bg-white"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{row.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{row.subtitle}</p>
              </div>
              <StatusChip variant="awaitingVerification">AWAITING VERIFICATION</StatusChip>
            </button>
          ))
        )}
      </CardShell>

      <CardShell
        title="Recent completions"
        iconTint="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
        icon={<CheckCircleIcon />}
        footer={
          <button type="button" onClick={onViewAllCompletions} className="text-xs font-semibold text-slate-700 underline-offset-2 hover:underline">
            View all
          </button>
        }
      >
        {completionRows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-3 text-xs leading-relaxed text-slate-600">
            <span className="font-semibold text-slate-800">No completions yet.</span> Finished audits will appear here once work is submitted and recorded — useful for handovers and assurance.
            {dev ? <span className="mt-2 block text-[10px] text-slate-400">Dev: complete an audit or close an action to populate history.</span> : null}
          </p>
        ) : (
          completionRows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={row.onActivate}
              className="flex w-full items-start justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/90 px-3 py-2.5 text-left transition hover:border-slate-200 hover:bg-white"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{row.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{row.subtitle}</p>
              </div>
              <StatusChip variant={row.chip === "closed" ? "closed" : "verified"}>{row.chip === "closed" ? "CLOSED" : "VERIFIED"}</StatusChip>
            </button>
          ))
        )}
      </CardShell>
    </div>
  );
}

export function SyncSavedStateSummary({
  offlineQueueCount,
  pendingSyncCount,
  failedSyncCount,
  onOpenSyncCentre,
}: {
  offlineQueueCount: number;
  pendingSyncCount: number;
  failedSyncCount: number;
  onOpenSyncCentre: () => void;
}) {
  const hasIssue = failedSyncCount > 0 || pendingSyncCount > 0 || offlineQueueCount > 0;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-[0_8px_22px_rgba(15,23,42,0.05)]">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Sync & saved state</p>
        <p className={`mt-1 text-sm font-medium ${hasIssue ? "text-slate-900" : "text-emerald-800"}`}>
          {hasIssue
            ? `${offlineQueueCount} offline · ${pendingSyncCount} pending sync · ${failedSyncCount} failed`
            : "All changes saved — workspace is in sync with the server."}
        </p>
      </div>
      <button
        type="button"
        onClick={onOpenSyncCentre}
        className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-white"
      >
        Sync Centre
      </button>
    </div>
  );
}
