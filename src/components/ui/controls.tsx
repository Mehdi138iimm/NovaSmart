import { useEffect, useRef, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { playSound } from "@/services/sound";

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        playSound("toggle");
        onChange(!checked);
      }}
      className="relative h-[22px] w-[40px] shrink-0 rounded-full transition-colors duration-150 cursor-pointer"
      style={{
        background: checked ? "var(--accent)" : "var(--surface-2)",
        border: "1px solid var(--line)",
      }}
      dir="ltr"
    >
      <span
        className="absolute top-[2px] h-4 w-4 rounded-full shadow transition-transform duration-150"
        style={{
          left: 2,
          transform: `translateX(${checked ? 18 : 0}px)`,
          background: checked ? "var(--panel)" : "var(--fg)",
        }}
      />
    </button>
  );
}

export function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[40px] items-center justify-between gap-4 py-1.5">
      <div className="min-w-0">
        <div className="text-[13px] font-medium">{label}</div>
        {hint && <div className="muted text-[11.5px] leading-snug">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SliderRow({
  label, value, min, max, step = 1, unit = "", onChange,
}: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <div className="py-1.5">
      <div className="mb-1 flex items-center justify-between text-[12.5px]">
        <span className="font-medium">{label}</span>
        <span className="muted tabular-nums" dir="ltr">{Number.isInteger(step) ? value : value.toFixed(2)}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Math.min(max, Math.max(min, +e.target.value)))} />
    </div>
  );
}

export function Segmented<T extends string>({
  value, options, onChange, size = "md",
}: { value: T; options: { value: T; label: string; icon?: LucideIcon }[]; onChange: (v: T) => void; size?: "sm" | "md" }) {
  return (
    <div className="inline-flex rounded-full p-[3px]" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => {
              if (!on) playSound("click");
              onChange(o.value);
            }}
            className={`inline-flex items-center gap-1.5 rounded-full font-medium transition-colors duration-150 cursor-pointer ${size === "sm" ? "h-6 px-2.5 text-[11px]" : "h-7 px-3 text-[12px]"}`}
            style={{
              background: on ? "var(--accent)" : "transparent",
              color: on ? "var(--panel)" : "var(--fg-dim)",
              boxShadow: on ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
            }}
          >
            {o.icon && <o.icon size={13} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="mb-5">
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="label">{title}</h3>
        {right}
      </div>
      <div className="surface px-4 py-1.5" style={{ borderRadius: 18 }}>{children}</div>
    </section>
  );
}

export function EmptyState({ icon: Icon, title, hint, action }: { icon: LucideIcon; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex h-full min-h-[120px] w-full flex-col items-center justify-center gap-2 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
        <Icon size={20} className="muted" />
      </div>
      <div className="text-[14px] font-semibold">{title}</div>
      {hint && <div className="muted max-w-[300px] text-[12px] leading-relaxed">{hint}</div>}
      {action}
    </div>
  );
}

/** Closes on outside pointer-down. */
export function useOutside(onOutside: () => void, active: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active) return;
    const h = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener("pointerdown", h, true);
    return () => document.removeEventListener("pointerdown", h, true);
  }, [active, onOutside]);
  return ref;
}

export function Tip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg px-2 py-1 text-[11px] font-medium opacity-0 transition-opacity duration-150 group-hover/tip:opacity-100 shadow-xl"
        style={{ background: "var(--popup-bg)", color: "var(--fg)", border: "1px solid var(--popup-border)" }}
      >
        {label}
      </span>
    </span>
  );
}

export const ProgressBar = ({ value, className = "" }: { value: number; className?: string }) => (
  <div className={`h-1.5 w-full overflow-hidden rounded-full ${className}`} style={{ background: "var(--surface-2)" }} dir="ltr">
    <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: "var(--accent)" }} />
  </div>
);
