import { useMemo, useState } from "react";
import { Check, ClipboardPaste, Copy, Pin, Search, ShieldCheck, Trash2 } from "lucide-react";
import { EmptyState, Toggle } from "@/components/ui/controls";
import { useLang, useT, num } from "@/i18n";
import { looksSensitive } from "@/services/sensitive";
import { invoke, isTauri } from "@/services/native";
import { useData } from "@/stores/data";
import { useSettings } from "@/stores/settings";

export default function ClipboardView() {
  const t = useT();
  const lang = useLang();
  const clips = useData((s) => s.clips);
  const blocked = useData((s) => s.blockedClips);
  const addClip = useData((s) => s.addClip);
  const deleteClip = useData((s) => s.deleteClip);
  const clearClips = useData((s) => s.clearClips);
  const toggleClipPin = useData((s) => s.toggleClipPin);
  const enabled = useSettings((s) => s.clipboardEnabled);
  const allowSensitive = useSettings((s) => s.allowSensitive);
  const set = useSettings((s) => s.set);
  const [q, setQ] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    const l = k ? clips.filter((c) => c.text.toLowerCase().includes(k)) : clips;
    return [...l].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  }, [clips, q]);

  const copy = async (id: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 1100); } catch { /* denied */ }
  };
  const capture = async () => {
    let text: string | null = null;
    try { text = isTauri ? await invoke<string>("clipboard_read") : await navigator.clipboard.readText(); } catch { /* denied */ }
    if (!text) return setMsg(t("Clipboard is empty or access was denied."));
    if (!allowSensitive && looksSensitive(text)) { useData.setState({ blockedClips: blocked + 1 }); return setMsg(t("Looks sensitive — not stored.")); }
    setMsg(addClip(text) ? "" : t("Already in history."));
  };

  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={13} className="faint pointer-events-none absolute start-3 top-1/2 -translate-y-1/2" />
          <input className="input !rounded-full !py-1.5 !ps-8 !text-[12.5px]" placeholder={t("Search")} value={q} onChange={(e) => setQ(e.target.value)} dir="auto" />
        </div>
        <button className="btn" onClick={capture}><ClipboardPaste size={13} /> {t("Capture now")}</button>
        <button className="btn btn-danger" onClick={clearClips} disabled={!clips.length}><Trash2 size={13} /> {t("Clear all")}</button>
      </div>
      <div className="surface flex items-center justify-between gap-3 px-3 py-1.5 text-[11.5px]" style={{ borderRadius: 14 }}>
        <span className="muted flex items-center gap-1.5"><ShieldCheck size={13} /> {allowSensitive ? t("Sensitive-looking text is stored.") : `${t("Passwords, tokens and card numbers are never stored")}${blocked ? ` · ${num(blocked, lang)} ${t("blocked") || ""}` : ""}.`}</span>
        <span className="flex items-center gap-2"><span className="muted">{t("Allow sensitive")}</span><Toggle checked={allowSensitive} onChange={(v) => set({ allowSensitive: v })} /><span className="muted">{t("Record")}</span><Toggle checked={enabled} onChange={(v) => set({ clipboardEnabled: v })} /></span>
      </div>
      {msg && <div className="faint text-[11.5px]">{msg}</div>}
      {list.length === 0 ? <EmptyState icon={ClipboardPaste} title={clips.length ? t("No matches") : t("Clipboard history is empty")} hint={enabled ? t("Copy some text and it will appear here.") : t("Recording is off.")} /> : (
        <div className="scroll min-h-0 flex-1 space-y-1.5">
          {list.map((c) => (
            <div key={c.id} className="surface group flex items-start gap-2 px-3 py-2" style={{ borderRadius: 16 }}>
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 whitespace-pre-wrap break-words text-[12.5px] leading-snug" dir="auto">{c.text}</div>
                <div className="faint mt-0.5 text-[10.5px]" dir="ltr">{new Date(c.ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} · {c.text.length}</div>
              </div>
              <button className="icon-btn !h-7 !w-7" onClick={() => toggleClipPin(c.id)} aria-label={t("Pin")} style={c.pinned ? { color: "var(--accent)" } : undefined}><Pin size={13} /></button>
              <button className="icon-btn !h-7 !w-7" onClick={() => copy(c.id, c.text)} aria-label={t("Copy")}>{copied === c.id ? <Check size={14} style={{ color: "var(--accent)" }} /> : <Copy size={14} />}</button>
              <button className="icon-btn !h-7 !w-7" onClick={() => deleteClip(c.id)} aria-label={t("Delete")}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
