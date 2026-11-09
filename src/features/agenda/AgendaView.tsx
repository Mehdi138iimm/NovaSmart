import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Segmented } from "@/components/ui/controls";
import { useClock } from "@/hooks/useClock";
import { num, useLang, useT } from "@/i18n";
import { dayKey, useData } from "@/stores/data";
import type { AgendaEvent } from "@/types";

const HOUR_H = 46;
const toMin = (s?: string) => {
  if (!s || typeof s !== "string") return 0;
  const parts = s.split(":").map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
};
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

type Draft = { id?: string; title: string; date: string; start: string; end: string; notes?: string };

function EventForm({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const t = useT();
  const save = useData((s) => s.saveEvent);
  const del = useData((s) => s.deleteEvent);
  const [d, setD] = useState(draft);
  const valid = d.title.trim() && toMin(d.end) > toMin(d.start);
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background: "rgba(0,0,0,.5)" }} onClick={onClose}>
      <div className="w-[340px] space-y-2.5 rounded-[24px] p-4" style={{ background: "#0e0e10", border: "1px solid var(--line)", color: "#f4f4f5" }} onClick={(e) => e.stopPropagation()}>
        <input autoFocus className="input" dir="auto" placeholder={t("Title")} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
        <input type="date" className="input" dir="ltr" value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} />
        <div className="flex gap-2" dir="ltr">
          <input type="time" className="input" value={d.start} onChange={(e) => setD({ ...d, start: e.target.value })} />
          <input type="time" className="input" value={d.end} onChange={(e) => setD({ ...d, end: e.target.value })} />
        </div>
        {toMin(d.end) <= toMin(d.start) && <div className="text-[11px]" style={{ color: "#f87171" }}>End must be after start.</div>}
        <input className="input" dir="auto" placeholder="Notes" value={d.notes ?? ""} onChange={(e) => setD({ ...d, notes: e.target.value })} />
        <div className="flex items-center justify-between pt-1">
          {d.id ? <button className="btn btn-danger" onClick={() => { del(d.id!); onClose(); }}><Trash2 size={13} /> {t("Delete")}</button> : <span />}
          <div className="flex gap-2"><button className="btn" onClick={onClose}>{t("Cancel")}</button><button className="btn btn-accent" disabled={!valid} onClick={() => { save({ ...d, title: d.title.trim() }); onClose(); }}>{t("Save")}</button></div>
        </div>
      </div>
    </div>
  );
}

export default function AgendaView() {
  const t = useT();
  const lang = useLang();
  const events = useData((s) => s.events);
  const now = useClock();
  const [view, setView] = useState<"day" | "month">("day");
  const [date, setDate] = useState(() => new Date());
  const [draft, setDraft] = useState<Draft | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const key = dayKey(date);
  const isToday = key === dayKey(now);

  const dayEvents = useMemo(() => events.filter((e) => e.date === key).sort((a, b) => a.start.localeCompare(b.start)), [events, key]);
  useEffect(() => {
    if (view === "day" && scroller.current) scroller.current.scrollTop = Math.max(0, ((isToday ? now.getHours() : dayEvents[0] ? toMin(dayEvents[0].start) / 60 : 8) - 1) * HOUR_H);
  }, [view, key]); // eslint-disable-line react-hooks/exhaustive-deps

  const locale = lang === "fa" ? "fa-IR-u-ca-persian" : "en-US";
  const title = new Intl.DateTimeFormat(locale, view === "day" ? { weekday: "long", day: "numeric", month: "long" } : { month: "long", year: "numeric" }).format(date);
  const step = (n: number) => setDate((d) => (view === "day" ? addDays(d, n) : new Date(d.getFullYear(), d.getMonth() + n, 1)));
  const newEvent = () => { const h = isToday ? Math.min(23, now.getHours() + 1) : 9; setDraft({ title: "", date: key, start: `${String(h).padStart(2, "0")}:00`, end: `${String(Math.min(23, h + 1)).padStart(2, "0")}:${h === 23 ? "59" : "00"}` }); };

  // month grid (Monday-first for English, Saturday-first for Persian)
  const grid = useMemo(() => {
    const first = new Date(date.getFullYear(), date.getMonth(), 1);
    const startOffset = lang === "fa" ? (first.getDay() + 1) % 7 : (first.getDay() + 6) % 7;
    const days = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return Array.from({ length: Math.ceil((startOffset + days) / 7) * 7 }, (_, i) => (i < startOffset || i >= startOffset + days ? null : new Date(date.getFullYear(), date.getMonth(), i - startOffset + 1)));
  }, [date, lang]);
  const weekdays = lang === "fa" ? ["ش", "ی", "د", "س", "چ", "پ", "ج"] : ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div className="relative flex h-full flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button className="btn" onClick={() => setDate(new Date())}>{t("Today")}</button>
          <button className="icon-btn" onClick={() => step(-1)} aria-label="Previous"><ChevronLeft size={16} className="rtl:rotate-180" /></button>
          <button className="icon-btn" onClick={() => step(1)} aria-label="Next"><ChevronRight size={16} className="rtl:rotate-180" /></button>
          <span className="ms-1 text-[15px] font-semibold">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Segmented size="sm" value={view} onChange={setView} options={[{ value: "day", label: t("Day") }, { value: "month", label: t("Month") }]} />
          <button className="btn btn-accent" onClick={newEvent}><Plus size={14} /> {t("Add")}</button>
        </div>
      </div>

      {view === "day" ? (
        <div ref={scroller} className="scroll relative min-h-0 flex-1 rounded-[20px]" style={{ background: "var(--surface)", border: "1px solid var(--line)" }} dir="ltr">
          <div className="relative" style={{ height: HOUR_H * 24 }}>
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="absolute inset-x-0 flex" style={{ top: h * HOUR_H, height: HOUR_H }}>
                <span className="faint w-12 shrink-0 pe-2 pt-1 text-end text-[10.5px] tabular-nums">{String(h).padStart(2, "0")}:00</span>
                <div className="flex-1 border-t" style={{ borderColor: "var(--line)" }} />
              </div>
            ))}
            {dayEvents.map((e) => {
              const top = (toMin(e.start) / 60) * HOUR_H;
              const h = Math.max(24, ((toMin(e.end) - toMin(e.start)) / 60) * HOUR_H - 2);
              return (
                <button key={e.id} onClick={() => setDraft(e)} className="absolute start-14 end-3 overflow-hidden rounded-xl px-3 py-1 text-start" style={{ top, height: h, background: "rgba(var(--accent-rgb), .18)", borderInlineStart: "3px solid var(--accent)" }}>
                  <div className="truncate text-[12.5px] font-semibold" dir="auto">{e.title}</div>
                  {h > 36 && <div className="muted text-[10.5px]">{e.start} – {e.end}</div>}
                </button>
              );
            })}
            {isToday && (
              <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_H }}>
                <span className="ms-9 h-2 w-2 rounded-full" style={{ background: "#f87171" }} /><span className="h-px flex-1" style={{ background: "#f87171" }} />
              </div>
            )}
          </div>
          {dayEvents.length === 0 && <div className="faint pointer-events-none absolute inset-x-0 top-3 text-center text-[12px]">{t("No events")}</div>}
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-7 gap-1" style={{ gridTemplateRows: `auto repeat(${grid.length / 7}, 1fr)` }}>
          {weekdays.map((w, i) => <div key={i} className="faint pb-1 text-center text-[10.5px] font-semibold">{w}</div>)}
          {grid.map((d, i) => {
            if (!d) return <div key={i} />;
            const k = dayKey(d);
            const c = events.filter((e) => e.date === k).length;
            const sel = k === key;
            return (
              <button key={i} onClick={() => { setDate(d); setView("day"); }} className="relative flex flex-col items-center justify-center rounded-xl text-[12.5px] transition-colors hover:bg-[var(--surface-2)]"
                style={{ background: sel ? "var(--surface-2)" : "var(--surface)", outline: k === dayKey(now) ? "1.5px solid var(--accent)" : "none", outlineOffset: -1.5 }}>
                <span className="tabular-nums">{new Intl.DateTimeFormat(locale + "-u-nu-" + (lang === "fa" ? "arabext" : "latn"), { day: "numeric" }).format(d)}</span>
                {c > 0 && <span className="mt-0.5 flex gap-0.5">{Array.from({ length: Math.min(3, c) }, (_, j) => <span key={j} className="h-1 w-1 rounded-full" style={{ background: "var(--accent)" }} />)}</span>}
              </button>
            );
          })}
        </div>
      )}
      <div className="faint text-[10.5px]">{num(dayEvents.length, lang)} {dayEvents.length === 1 ? "event" : "events"}</div>
      {draft && <EventForm draft={draft as AgendaEvent} onClose={() => setDraft(null)} />}
    </div>
  );
}
