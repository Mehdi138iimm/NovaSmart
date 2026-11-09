import { useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, Check, Mic, MicOff, Settings2, X } from "lucide-react";
import { Eyes } from "@/components/eyes/Eyes";
import { Segmented } from "@/components/ui/controls";
import { useEyeMood } from "@/hooks/useEyeMood";
import { useLang, useT } from "@/i18n";
import { PROVIDER_META, resolveProvider, sendChat } from "@/services/ai";
import { respondApproval } from "@/services/agents";
import { invoke, isTauri } from "@/services/native";
import { useData } from "@/stores/data";
import { useRuntime } from "@/stores/runtime";
import { useSettings } from "@/stores/settings";
import { AGENT_STATE } from "./agentMeta";
import type { AgentState } from "@/types";

const SUGGEST = [
  { k: "Explain", p: "Explain the following in simple terms:\n" },
  { k: "Check my spelling", p: "Check the spelling and grammar of the following and return the corrected text:\n" },
  { k: "Translate", p: "Translate the following to English (or to Persian if it is already English):\n" },
  { k: "Summarize", p: "Summarize the following concisely:\n" },
];

type SR = { start: () => void; stop: () => void; lang: string; interimResults: boolean; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };

function Assistant() {
  const t = useT();
  const lang = useLang();
  const chat = useRuntime((s) => s.chat);
  const busy = useRuntime((s) => s.aiBusy);
  const mood = useEyeMood();
  useSettings((s) => s.providers);
  useSettings((s) => s.activeProvider);
  const pid = resolveProvider();
  const setTab = useRuntime((s) => s.setTab);
  const [text, setText] = useState("");
  const [rec, setRec] = useState(false);
  const recRef = useRef<SR | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const SRClass = (window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => SR }).webkitSpeechRecognition;

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [chat.length, busy]);
  useEffect(() => () => recRef.current?.stop(), []);

  const submit = () => { const v = text; if (!v.trim()) return; setText(""); sendChat(v); };
  const mic = () => {
    if (!SRClass) return;
    if (rec) { recRef.current?.stop(); return; }
    const r = new SRClass();
    r.lang = lang === "fa" ? "fa-IR" : "en-US";
    r.interimResults = false;
    r.onresult = (e) => { const s = e.results[0]?.[0]?.transcript; if (s) setText((p) => (p ? p + " " : "") + s); };
    r.onend = () => setRec(false);
    r.onerror = () => setRec(false);
    recRef.current = r;
    setRec(true);
    r.start();
  };
  const suggest = (p: string) => { setText((cur) => (cur.trim() ? p + cur : p)); inputRef.current?.focus(); };

  return (
    <div className="flex h-full flex-col">
      <div className="scroll min-h-0 flex-1">
        {chat.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <Eyes mood={mood} scale={3.2} gap={14} />
            <div className="text-center">
              <div className="text-[14px] font-semibold">{pid ? `${PROVIDER_META[pid].name} · ${t("Connected")}` : t("Not connected")}</div>
              {!pid && <button className="muted mt-0.5 text-[12px] underline-offset-2 hover:underline" onClick={() => setTab("settings")}>Add an API key in Settings → AI Settings</button>}
            </div>
          </div>
        ) : (
          <div className="space-y-2 py-1">
            {chat.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="ns-select-ok max-w-[82%] whitespace-pre-wrap rounded-[18px] px-3.5 py-2 text-[13px] leading-relaxed" dir="auto"
                  style={m.role === "user" ? { background: "rgba(var(--accent-rgb), .16)" } : m.role === "error" ? { background: "rgba(248,113,113,.12)", color: "#f87171" } : { background: "var(--surface)" }}>
                  {m.role === "assistant" && m.provider && <div className="faint mb-0.5 text-[10px] font-semibold uppercase tracking-wider">{m.provider}</div>}
                  {m.text}
                </div>
              </div>
            ))}
            {busy && <div className="faint px-2 text-[12px]">{t("Thinking")}…</div>}
            <div ref={endRef} />
          </div>
        )}
      </div>
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1.5">
        {SUGGEST.map((s) => <button key={s.k} className="btn !h-7 !text-[11.5px]" onClick={() => suggest(s.p)}>{t(s.k)}</button>)}
      </div>
      <div className="flex items-end gap-2 rounded-[22px] p-1.5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
        <button className="icon-btn shrink-0" onClick={mic} disabled={!SRClass} title={SRClass ? "Voice input" : "Speech recognition is not available in this webview"} style={rec ? { color: "#f87171" } : undefined}>
          {SRClass ? <Mic size={17} /> : <MicOff size={17} />}
        </button>
        <textarea ref={inputRef} rows={1} value={text} onChange={(e) => setText(e.target.value)} dir="auto" placeholder={t("Ask NOVA anything…")}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          className="max-h-24 min-h-[30px] flex-1 resize-none bg-transparent py-1.5 text-[13px] outline-none placeholder:text-[var(--fg-faint)]" />
        <button className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full disabled:opacity-40" style={{ background: "var(--accent)", color: "#0a0a0a" }} onClick={submit} disabled={!text.trim() || busy} aria-label={t("Send")}>
          <ArrowUp size={16} />
        </button>
      </div>
    </div>
  );
}

const KNOWN_AGENTS = ["Claude Code", "Codex", "ChatGPT", "Gemini CLI"];

function AgentsPanel() {
  const t = useT();
  const agents = useRuntime((s) => s.agents);
  const approvals = useRuntime((s) => s.approvals);
  const activity = useData((s) => s.activity);
  const providers = useSettings((s) => s.providers);
  const setTab = useRuntime((s) => s.setTab);
  const [bridge, setBridge] = useState<{ port: number; running: boolean } | null>(null);
  useEffect(() => { invoke<{ port: number; running: boolean }>("agent_bridge_status").then(setBridge); }, []);
  const names = Array.from(new Set([...KNOWN_AGENTS, ...Object.keys(agents)]));

  return (
    <div className="scroll h-full space-y-4 pb-2">
      {approvals.length > 0 && (
        <div>
          <div className="label mb-1.5">{t("Pending approvals")}</div>
          {approvals.map((a) => (
            <div key={a.id} className="mb-2 rounded-[20px] p-3" style={{ background: "rgba(250,204,21,.08)", border: "1px solid rgba(250,204,21,.25)" }}>
              <div className="flex items-center justify-between text-[12px] font-semibold"><span>{a.agent} · {a.kind}</span></div>
              <div className="muted mt-1 text-[12.5px]" dir="auto">{a.description}</div>
              <code className="mt-1.5 block truncate rounded-lg px-2 py-1 text-[11px]" dir="ltr" style={{ background: "var(--surface)" }}>{a.target}</code>
              <div className="mt-2.5 flex gap-2">
                <button className="btn btn-accent" onClick={() => respondApproval(a.id, "allow")}><Check size={13} /> {t("Allow")}</button>
                <button className="btn btn-danger" onClick={() => respondApproval(a.id, "deny")}><X size={13} /> {t("Deny")}</button>
              </div>
            </div>
          ))}
        </div>
      )}

        <div>
          <div className="label mb-1.5">Providers (AI)</div>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(PROVIDER_META) as (keyof typeof PROVIDER_META)[]).map((id) => {
              const p = providers[id] || { apiKey: "", model: "openai", status: "unknown" };
              const isFree = id === "novafree";
              const local = id === "ollama";
              const ok = isFree ? p.status !== "error" : local ? p.status === "ok" : !!p.apiKey && p.status === "ok";
              return (
                <div key={id} className="surface p-3" style={{ borderRadius: 18 }}>
                  <div className="flex items-center justify-between text-[13px] font-semibold">{PROVIDER_META[id].name}<span className="h-2 w-2 rounded-full" style={{ background: ok ? "#4ade80" : p.status === "error" ? "#f87171" : "var(--fg-faint)" }} /></div>
                  <div className="muted mt-1 truncate text-[11px]">{isFree ? (p.status === "error" ? (p.lastError || "Error") : "100% Free · Active") : !p.apiKey && !local ? t("Disconnected") : p.status === "ok" ? t("Connected") : p.status === "error" ? p.lastError : "Key saved · untested"}</div>
                  <div className="faint mt-0.5 truncate text-[10.5px]" dir="ltr">{p.model}</div>
                </div>
              );
            })}
          </div>
          <button className="btn mt-2" onClick={() => setTab("settings")}><Settings2 size={13} /> {t("AI Settings")}</button>
        </div>

      <div>
        <div className="label mb-1.5">{t("Agents")}</div>
        <div className="space-y-1.5">
          {names.map((n) => {
            const a = agents[n];
            const st: AgentState = a?.state ?? "idle";
            const meta = AGENT_STATE[st];
            const Icon = meta.icon;
            return (
              <div key={n} className="surface flex items-center gap-3 px-3 py-2" style={{ borderRadius: 16 }}>
                <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "var(--surface-2)", color: a ? meta.color : "var(--fg-faint)" }}><Icon size={14} /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold">{n}</div>
                  <div className="muted truncate text-[11px]" dir="auto">{a ? a.message || t(meta.label) : t("Disconnected")}</div>
                </div>
                <span className="text-[11px] font-medium" style={{ color: a ? meta.color : "var(--fg-faint)" }}>{a ? t(meta.label) : t("Disconnected")}</span>
              </div>
            );
          })}
        </div>
        <div className="faint mt-2 text-[11px] leading-relaxed">
          {isTauri ? <>Agent bridge: <code dir="ltr">POST http://127.0.0.1:{bridge?.port ?? 47821}/agent-event</code> {bridge?.running ? "(listening)" : "(not running)"} — see README for Claude Code hook setup.</> : "Agent bridge is available in the desktop app (see README)."}
        </div>
      </div>

      <div>
        <div className="label mb-1.5">{t("Recent activity")}</div>
        {activity.length === 0 ? <div className="faint text-[12px]">—</div> : activity.slice(0, 8).map((a) => (
          <div key={a.id} className="flex items-center gap-2 border-b py-1.5 text-[11.5px]" style={{ borderColor: "var(--line)" }}>
            <span className="faint tabular-nums" dir="ltr">{new Date(a.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            <span className="font-semibold">{a.agent}</span>
            <span className="muted truncate" dir="auto">{a.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AICenter() {
  const t = useT();
  const [view, setView] = useState<"assistant" | "agents">("assistant");
  const approvals = useRuntime((s) => s.approvals.length);
  return (
    <div className="relative h-full">
      <div className="absolute end-0 top-0 z-10">
        <Segmented size="sm" value={view} onChange={setView} options={[{ value: "assistant", label: t("Assistant"), icon: Bot }, { value: "agents", label: `${t("Agents")}${approvals ? ` (${approvals})` : ""}` }]} />
      </div>
      {view === "assistant" ? <Assistant /> : <div className="h-full pt-8"><AgentsPanel /></div>}
    </div>
  );
}
