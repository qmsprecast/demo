export type BertLogoTone = "onDark" | "onLight";

type BertLogoProps = {
  className?: string;
  /** full: wordmark + acronym line; wordmark: bert + signal dot only */
  variant?: "full" | "wordmark";
  tone: BertLogoTone;
  size?: "sm" | "md" | "lg";
};

const sizeStyles = {
  sm: {
    word: "text-lg leading-none tracking-tight sm:text-xl",
    dot: "mb-[0.12em] h-[0.34em] w-[0.34em] min-h-[6px] min-w-[6px]",
    tag: "mt-1 text-[8px] font-medium leading-snug tracking-wide sm:text-[9px]",
  },
  md: {
    word: "text-3xl leading-none tracking-tight sm:text-4xl",
    dot: "mb-[0.1em] h-[0.28em] w-[0.28em] min-h-[7px] min-w-[7px]",
    tag: "mt-1.5 text-[10px] font-medium leading-snug tracking-wide sm:text-xs",
  },
  lg: {
    word: "text-4xl leading-none tracking-tight sm:text-5xl",
    dot: "mb-[0.08em] h-[0.26em] w-[0.26em] min-h-[8px] min-w-[8px]",
    tag: "mt-2 text-xs font-medium leading-snug tracking-wide sm:text-sm",
  },
} as const;

const strokeWidthPx: Record<NonNullable<BertLogoProps["size"]>, string> = {
  sm: "1.5px",
  md: "2px",
  lg: "2.5px",
};

/** Transparent background — wordmark matches bert. brand (signal-orange dot). */
export function BertLogo({ className = "", variant = "full", tone, size = "md" }: BertLogoProps) {
  const s = sizeStyles[size];
  const tagColor = tone === "onDark" ? "text-slate-300" : "text-slate-500";
  const strokeW = strokeWidthPx[size];
  /** White outline: hollow on dark UI; ink fill + white halo on light UI. */
  const bertWordClass =
    tone === "onDark"
      ? "font-bold lowercase text-transparent [paint-order:stroke_fill]"
      : "font-bold lowercase text-slate-900 [paint-order:stroke_fill]";

  return (
    <div className={["inline-flex flex-col items-center text-center sm:items-start sm:text-left", className].join(" ")}>
      <div className={`inline-flex items-end gap-0.5 ${s.word}`}>
        <span
          className={bertWordClass}
          style={{
            WebkitTextStrokeWidth: strokeW,
            WebkitTextStrokeColor: "#ffffff",
          }}
        >
          bert
        </span>
        <span className={`shrink-0 rounded-full bg-[var(--bert-signal-orange)] ${s.dot}`} aria-hidden />
      </div>
      {variant === "full" && (
        <p className={`max-w-[20rem] ${s.tag} ${tagColor}`}>Business. Evaluation. Reporting. Tool.</p>
      )}
    </div>
  );
}
