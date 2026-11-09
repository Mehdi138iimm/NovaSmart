import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Plus, Search, Trash2 } from "lucide-react";
import { isRTLText, useLang, useT } from "@/i18n";
import { useData } from "@/stores/data";
import type { Note } from "@/types";

/** Debounced local editing, flushed on switch/unmount so nothing is lost. */
function Editor({ note }: { note: Note }) {
  const t = useT();
  const lang = useLang();
  const patch = useData((s) => s.patchNote);
  const del = useData((s) => s.deleteNote);
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [saved, setSaved] = useState(true);
  const latest = useRef({ title, body });
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const flush = () => {
    clearTimeout(timer.current);
    if (dirty.current) { patch(note.id, latest.current); dirty.current = false; setSaved(true); }
  };
  const edit = (next: Partial<{ title: string; body: string }>) => {
    latest.current = { ...latest.current, ...next };
    dirty.current = true;
    setSaved(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 350);
  };
  const remove = () => {
    dirty.current = false;
    clearTimeout(timer.current);
    del(note.id);
  };
  useEffect(() => () => { clearTimeout(timer.current); if (dirty.current) patch(note.id, latest.current); }, [note.id, patch]);

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2">
        <input className="min-w-0 flex-1 bg-transparent text-[26px] font-semibold leading-tight outline-none placeholder:text-[var(--fg-faint)]" dir="auto" placeholder={t("Untitled")} value={title}
          onChange={(e) => { setTitle(e.target.value); edit({ title: e.target.value }); }} />
        <span className="faint flex shrink-0 items-center gap-1 text-[11px]">{saved && <><Check size={12} /> {t("Saved")}</>}</span>
        <button className="icon-btn shrink-0" onClick={remove} aria-label={t("Delete")}><Trash2 size={15} /></button>
      </div>
      <div className="faint mb-2 text-[11px]" dir="ltr">{new Date(note.createdAt).toLocaleString(lang === "fa" ? "fa-IR-u-ca-persian" : "en-GB")}</div>
      <textarea className="scroll ns-select-ok min-h-0 flex-1 resize-none bg-transparent text-[14px] leading-relaxed outline-none placeholder:text-[var(--fg-faint)]" dir="auto" placeholder={t("Start writing…")} value={body}
        onChange={(e) => { setBody(e.target.value); edit({ body: e.target.value }); }} />
    </div>
  );
}

export default function NotesView() {
  const t = useT();
  const notes = useData((s) => s.notes);
  const selected = useData((s) => s.selectedNote);
  const select = useData((s) => s.selectNote);
  const add = useData((s) => s.addNote);
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    return k ? notes.filter((n) => (n.title + " " + n.body).toLowerCase().includes(k)) : notes;
  }, [notes, q]);
  const current = notes.find((n) => n.id === selected) ?? notes[0];

  return (
    <div className="flex h-full gap-4">
      <div className="flex w-[220px] shrink-0 flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search size={13} className="faint pointer-events-none absolute start-3 top-1/2 -translate-y-1/2" />
            <input className="input !rounded-full !py-1.5 !ps-8 !text-[12px]" placeholder={t("Search")} value={q} onChange={(e) => setQ(e.target.value)} dir="auto" />
          </div>
          <button className="btn btn-accent !h-8 !w-8 !p-0" onClick={() => add()} aria-label={t("New note")}><Plus size={15} /></button>
        </div>
        <div className="scroll min-h-0 flex-1 space-y-1">
          {list.length === 0 && <div className="faint px-2 pt-4 text-center text-[12px]">{notes.length ? "—" : t("New note")}</div>}
          {list.map((n) => {
            const on = current?.id === n.id;
            return (
              <button key={n.id} onClick={() => select(n.id)} className="block w-full rounded-2xl px-3 py-2 text-start transition-colors" style={{ background: on ? "var(--surface-2)" : "transparent" }}>
                <div className="truncate text-[13px] font-semibold" dir="auto" style={{ textAlign: isRTLText(n.title) ? "right" : "left" }}>{n.title || t("Untitled")}</div>
                <div className="muted truncate text-[11.5px]" dir="auto">{n.body.replace(/\s+/g, " ") || "—"}</div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="w-px shrink-0" style={{ background: "var(--line)" }} />
      {current ? <Editor key={current.id} note={current} /> : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3"><div className="muted text-[13px]">{t("Start writing…")}</div><button className="btn btn-accent" onClick={() => add()}><Plus size={14} /> {t("New note")}</button></div>
      )}
    </div>
  );
}
