import { useEffect, useRef, useState } from "react";
import { Copy, ExternalLink, File as FileIcon, FileArchive, FileAudio, FileImage, FileText, FileVideo, Trash2, UploadCloud, X } from "lucide-react";
import { EmptyState } from "@/components/ui/controls";
import { useT } from "@/i18n";
import { invoke, isTauri, onFileDrop } from "@/services/native";
import { formatSize, useData } from "@/stores/data";
import type { ShelfFile } from "@/types";

// Browser File handles live only for the current session (browsers never expose real paths).
const handles = new Map<string, File>();

const kind = (f: ShelfFile) => {
  const ext = f.name.includes(".") ? f.name.split(".").pop()!.toUpperCase() : "FILE";
  return ext.length > 6 ? "FILE" : ext;
};
const iconFor = (f: ShelfFile) => {
  const t = f.type;
  if (t.startsWith("image")) return FileImage;
  if (t.startsWith("audio")) return FileAudio;
  if (t.startsWith("video")) return FileVideo;
  if (/zip|rar|7z|tar|gz/.test(t) || /\.(zip|rar|7z|tar|gz)$/i.test(f.name)) return FileArchive;
  if (t.startsWith("text") || /pdf|doc/.test(t)) return FileText;
  return FileIcon;
};
const mimeFromName = (n: string) => {
  const e = n.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(e)) return "image/" + e;
  if (["mp3", "wav", "flac", "ogg", "m4a"].includes(e)) return "audio/" + e;
  if (["mp4", "mkv", "mov", "webm", "avi"].includes(e)) return "video/" + e;
  if (["zip", "rar", "7z", "tar", "gz"].includes(e)) return "application/zip";
  if (["txt", "md", "json", "csv", "log"].includes(e)) return "text/" + e;
  return "application/octet-stream";
};

export default function FilesView() {
  const t = useT();
  const files = useData((s) => s.files);
  const add = useData((s) => s.addFiles);
  const remove = useData((s) => s.removeFile);
  const clearFiles = useData((s) => s.clearFiles);
  const clearAll = () => {
    handles.clear();
    clearFiles();
  };
  const [over, setOver] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const addBrowserFiles = (list: File[]) => {
    const created = add(list.map((f) => ({ name: f.name, size: f.size, type: f.type || mimeFromName(f.name) })));
    created.forEach((c, i) => handles.set(c.id, list[i]));
  };

  useEffect(() => {
    let off = () => {};
    let dead = false;
    onFileDrop(async (paths, phase) => {
      if (phase === "enter") setOver(true);
      else if (phase === "leave") setOver(false);
      else if (phase === "drop") {
        setOver(false);
        const infos = await Promise.all(paths.map(async (p) => {
          const info = await invoke<{ size: number; is_dir: boolean }>("file_info", { path: p });
          const name = p.split(/[\\/]/).pop() || p;
          return { name, path: p, size: info?.size ?? 0, type: info?.is_dir ? "folder" : mimeFromName(name) };
        }));
        add(infos);
      }
    }).then((f) => (dead ? f() : (off = f)));
    return () => { dead = true; off(); };
  }, [add]);

  const open = async (f: ShelfFile) => {
    if (f.path && isTauri) return void (await invoke("open_path", { path: f.path }));
    const h = handles.get(f.id);
    if (h) window.open(URL.createObjectURL(h), "_blank");
  };
  const copyPath = async (f: ShelfFile) => {
    try { await navigator.clipboard.writeText(f.path ?? f.name); setCopied(f.id); setTimeout(() => setCopied(null), 1200); } catch { /* denied */ }
  };

  return (
    <div className="flex h-full gap-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (!isTauri) addBrowserFiles(Array.from(e.dataTransfer.files)); }}
        onClick={() => input.current?.click()}
        className="flex w-[240px] shrink-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-[26px] border-2 border-dashed text-center transition-colors"
        style={{ borderColor: over ? "var(--accent)" : "var(--line)", background: over ? "rgba(var(--accent-rgb), .08)" : "var(--surface)" }}
      >
        <input ref={input} type="file" multiple hidden onChange={(e) => { addBrowserFiles(Array.from(e.target.files ?? [])); e.currentTarget.value = ""; }} />
        <UploadCloud size={30} style={{ color: over ? "var(--accent)" : "var(--fg-dim)" }} />
        <div className="text-[13px] font-semibold">{t("Drop files here")}</div>
        <div className="faint px-6 text-[11px] leading-snug">{t("or click to browse")}</div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-2 flex items-center justify-between"><span className="label">{t("Files")} · {files.length}</span>{files.length > 0 && <button className="btn !h-6 !text-[11px]" onClick={clearAll}><X size={12} /> {t("Clear all")}</button>}</div>
        {files.length === 0 ? <EmptyState icon={FileIcon} title={t("Shelf is empty")} hint={t("Drop files to keep them handy. Files are stored as references; nothing is copied.")} /> : (
          <div className="scroll min-h-0 flex-1 space-y-1.5">
            {files.map((f) => {
              const I = iconFor(f);
              const canOpen = !!(f.path && isTauri) || handles.has(f.id);
              return (
                <div key={f.id} className="surface group flex items-center gap-3 px-3 py-2" style={{ borderRadius: 16 }}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--surface-2)" }}><I size={17} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium" dir="auto" title={f.path ?? f.name}>{f.name}</div>
                    <div className="faint text-[11px]" dir="ltr">{kind(f)} · {formatSize(f.size)}</div>
                  </div>
                  <button className="icon-btn" disabled={!canOpen} style={{ opacity: canOpen ? 1 : 0.3 }} onClick={() => open(f)} aria-label={t("Open")} title={canOpen ? t("Open") : "File handle expired — re-add the file"}><ExternalLink size={14} /></button>
                  <button className="icon-btn" onClick={() => copyPath(f)} aria-label={t("Copy")} title={f.path ? "Copy path" : "Copy name (browsers do not expose paths)"} style={copied === f.id ? { color: "var(--accent)" } : undefined}><Copy size={14} /></button>
                  <button className="icon-btn" onClick={() => { handles.delete(f.id); remove(f.id); }} aria-label={t("Remove")}><Trash2 size={14} /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
