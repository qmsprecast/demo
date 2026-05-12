import { useEffect, useMemo, useState } from "react";
import { canCompleteAuditAsAuditor } from "../permissions";
import type { NonConformanceScreenProps } from "../types/nonConformanceScreenProps";

const slatePrimaryCtaInteract = "transition-colors duration-200 ease-in-out";

function parseNcrSequence(reference: string) {
  const match = reference.match(/^NCR-(\d+)$/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

export function NonConformanceScreen({
  currentUser,
  nonConformances,
  canViewCompletedReports,
  onSaveProgress,
  onComplete,
  onAddEvidence,
  onExportReport,
}: NonConformanceScreenProps) {
  const visible = useMemo(() => {
    const byRef = [...nonConformances].sort((a, b) => {
      const left = parseNcrSequence(a.reference) || 0;
      const right = parseNcrSequence(b.reference) || 0;
      return left - right;
    });
    if (canCompleteAuditAsAuditor(currentUser.role)) {
      return byRef.filter((item) => item.auditorUserId === currentUser.username);
    }
    return byRef;
  }, [nonConformances, currentUser]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [isoClause, setIsoClause] = useState("");
  const [investigationNotes, setInvestigationNotes] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [extraNotes, setExtraNotes] = useState("");

  const selected = visible.find((item) => item.id === selectedId) || null;
  useEffect(() => {
    if (!selected && visible.length) {
      setSelectedId(visible[0].id);
      return;
    }
    if (!selected) return;
    setIsoClause(selected.investigationIsoClause || "");
    setInvestigationNotes(selected.investigationNotes || "");
    setRootCause(selected.rootCause || "");
    setCorrectiveAction(selected.correctiveAction || "");
    setExtraNotes(selected.investigationExtraNotes || "");
  }, [selectedId, selected, visible]);

  const completed = visible.filter((item) => item.status === "Completed");

  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Non-conformance register</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Escalation and investigation</h2>
      </section>
      <section className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-2">
          {visible.length === 0 ? (
            <p className="text-sm text-slate-500">No NCR records yet.</p>
          ) : (
            visible.map((item) => (
              <button key={item.id} onClick={() => setSelectedId(item.id)} className={`grid grid-cols-6 gap-2 rounded-xl border px-3 py-2 text-left ${selectedId === item.id ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"}`}>
                <p className="text-xs font-semibold text-slate-900">{item.reference}</p>
                <p className="text-xs text-slate-600">{item.site}</p>
                <p className="text-xs text-slate-600">{item.auditorName}</p>
                <p className="text-xs text-slate-600">{item.raisedAt}</p>
                <p className="text-xs text-slate-600">{item.status}</p>
                <p className="text-xs text-slate-600">{item.assignedLineManager}</p>
              </button>
            ))
          )}
        </div>
      </section>
      {selected && (
        <section className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Investigation form - {selected.reference}</h3>
          <p className="mt-1 text-xs text-slate-500">{selected.auditQuestion}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input value={isoClause} onChange={(event) => setIsoClause(event.target.value)} placeholder="ISO clause" className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" />
            <textarea value={investigationNotes} onChange={(event) => setInvestigationNotes(event.target.value)} placeholder="Investigation notes" className="min-h-[6rem] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
            <textarea value={rootCause} onChange={(event) => setRootCause(event.target.value)} placeholder="Root cause" className="min-h-[6rem] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
            <textarea value={correctiveAction} onChange={(event) => setCorrectiveAction(event.target.value)} placeholder="Corrective action" className="min-h-[6rem] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
          </div>
          <textarea value={extraNotes} onChange={(event) => setExtraNotes(event.target.value)} placeholder="Extra notes" className="mt-2 min-h-[5rem] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
          <div className="mt-2">
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              className="h-11 max-w-[22rem] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700"
              onChange={(event) => {
                if (event.target.files?.length) onAddEvidence(selected.id, event.target.files);
                event.target.value = "";
              }}
            />
            <p className="mt-1 text-xs text-slate-500">{selected.evidence.length} evidence file(s)</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                onSaveProgress(selected.id, {
                  investigationIsoClause: isoClause,
                  investigationNotes,
                  rootCause,
                  correctiveAction,
                  investigationExtraNotes: extraNotes,
                })
              }
              className={`h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 ${slatePrimaryCtaInteract}`}
            >
              Save progress
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isoClause.trim() || !investigationNotes.trim() || !rootCause.trim() || !correctiveAction.trim()) {
                  return;
                }
                onComplete(selected.id, {
                  investigationIsoClause: isoClause,
                  investigationNotes,
                  rootCause,
                  correctiveAction,
                  investigationExtraNotes: extraNotes,
                });
              }}
              className={`h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white ${slatePrimaryCtaInteract}`}
            >
              NCR complete
            </button>
          </div>
        </section>
      )}
      {canViewCompletedReports && (
        <section className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Completed NCR reports</h3>
          <div className="mt-2 space-y-2">
            {completed.length === 0 ? (
              <p className="text-sm text-slate-500">No completed NCR reports yet.</p>
            ) : (
              completed.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-sm text-slate-700">{item.reference} - {item.site} - {item.completedByName || "-"}</p>
                  <button type="button" onClick={() => onExportReport(item)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">Print / export PDF</button>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}
