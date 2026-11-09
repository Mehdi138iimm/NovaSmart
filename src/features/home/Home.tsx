import { memo, useRef } from "react";
import { Battery, BatteryCharging, CalendarDays, Cpu, Disc3, Gauge, MemoryStick, Music2, Network, Pause, Play, SkipBack, SkipForward, Sparkles, StickyNote, Timer } from "lucide-react";
import { AGENT_STATE } from "@/features/ai/agentMeta";
import { fmtClock, fmtDate, useClock } from "@/hooks/useClock";
import { num, useLang, useT } from "@/i18n";
import { PROVIDER_META, resolveProvider } from "@/services/ai";
import { focusApi } from "@/services/focus";
import { localPlayer, mediaControl } from "@/services/media";
import { dayKey, todayAiTasks, useData } from "@/stores/data";
import { fmtTime, useRuntime } from "@/stores/runtime";
import { useSettings } from "@/stores/settings";
import type { CardSize, CardType, HomeCard } from "@/types";
import { EmptyState, ProgressBar } from "@/components/ui/controls";
import { useServicesTick } from "./useTick";

const GROW: Record<CardSize, number> = { sm: 1, md: 1.45, lg: 2.1 };

export function AudioPicker({ children }: { children: (open: () => void) => React.ReactNode }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={ref} type="file" accept="audio/*" multiple hidden onChange={(e) => { localPlayer.add(Array.from(e.target.files ?? [])); e.currentTarget.value = ""; }} />
      {children(() => ref.current?.click())}
    </>
  );
}

const CardShell = ({ onClick, children, className = "" }: { onClick?: () => void; children: React.ReactNode; className?: string }) => (
  <div onClick={onClick} className={`surface relative flex min-h-0 min-w-0 flex-col overflow-hidden p-4 ${onClick ? "cursor-pointer transition-colors hover:bg-[var(--surface-2)]" : ""} ${className}`} style={{ borderRadius: 26 }}>
    {children}
  </div>
);

const AICard = memo(function AICard() {
  const t = useT();
  const lang = useLang();
  const setTab = useRuntime((s) => s.setTab);
  const aiState = useRuntime((s) => s.aiState);
  const agents = useRuntime((s) => s.agents);
  const aiLast = useRuntime((s) => s.aiLast);
  const tasks = useData(todayAiTasks);
  const lastAct = useData((s) => s.activity[0]);
  useSettings((s) => s.providers);
  useSettings((s) => s.activeProvider);
  const pid = resolveProvider();
  const busyAgent = Object.values(agents).find((a) => a.state !== "idle" && a.state !== "completed");
  const state = busyAgent?.state ?? aiState;
  const meta = AGENT_STATE[state];
  const Icon = meta.icon;
  return (
    <CardShell onClick={() => setTab("ai")}>
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "rgba(var(--accent-rgb), .14)", color: "var(--accent)" }}><Sparkles size={14} /></span>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold">{pid ? PROVIDER_META[pid].name : "NOVA AI"}</div>
          <div className="flex items-center gap-1 text-[10.5px]" style={{ color: pid ? "#4ade80" : "var(--fg-faint)" }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "currentColor" }} />{pid ? t("Connected") : t("Not connected")}
          </div>
        </div>
      </div>
      <div className="mt-auto">
        <div className="text-[34px] font-semibold leading-none tabular-nums">{num(tasks, lang)}</div>
        <div className="muted mt-1 text-[11.5px]">{t("Tasks today")}</div>
        <div className="mt-3 flex items-center gap-1.5 text-[11.5px] font-medium" style={{ color: meta.color }}>
          <Icon size={13} className={state === "starting" ? "spin" : ""} /> {t(meta.label)}
        </div>
        <div className="faint mt-0.5 truncate text-[11px]">{busyAgent?.message ?? aiLast ?? lastAct?.text ?? ""}{!aiLast && !busyAgent && !lastAct ? "—" : ""}</div>
      </div>
    </CardShell>
  );
});

const MusicCard = memo(function MusicCard() {
  const t = useT();
  const m = useRuntime((s) => s.music);
  const setTab = useRuntime((s) => s.setTab);
  const pos = useServicesTick(m.playing && m.source === "native");
  const position = m.source === "native" && m.playing ? Math.min(m.duration || Infinity, m.position + pos) : m.position;
  if (!m.title)
    return (
      <CardShell onClick={() => setTab("music")} className="items-center justify-center">
        <EmptyState icon={Music2} title={t("Nothing playing")} hint="Start any SMTC-compatible player (Spotify, browser, …) or play a local file."
          action={<AudioPicker>{(open) => <button className="btn mt-1" onClick={(e) => { e.stopPropagation(); open(); }}>Play local file</button>}</AudioPicker>} />
      </CardShell>
    );
  return (
    <CardShell onClick={() => setTab("music")}>
      <div className="flex min-h-0 flex-1 items-center gap-4">
        <div className="flex aspect-square h-full max-h-[150px] shrink-0 items-center justify-center overflow-hidden rounded-[20px]" style={{ background: "var(--surface-2)" }}>
          {m.art ? <img src={m.art} alt="" className="h-full w-full object-cover" /> : <Disc3 size={44} className="faint" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="faint text-[10.5px] font-semibold uppercase tracking-wider">{m.playing ? "Playing" : "Paused"}{m.app ? ` · ${m.app}` : ""}</div>
          <div className="mt-1 truncate text-[17px] font-semibold" dir="auto">{m.title}</div>
          <div className="muted truncate text-[12.5px]" dir="auto">{m.artist}</div>
        </div>
      </div>
      <div className="mt-3" onClick={(e) => e.stopPropagation()}>
        <ProgressBar value={m.duration ? (position / m.duration) * 100 : 0} />
        <div className="mt-2 flex items-center justify-center gap-3">
          <button className="icon-btn" onClick={() => mediaControl("prev")} aria-label="Previous"><SkipBack size={17} /></button>
          <button className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "var(--fg)", color: "var(--panel, #000)" }} onClick={() => mediaControl("toggle")} aria-label={m.playing ? "Pause" : "Play"}>
            {m.playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
          </button>
          <button className="icon-btn" onClick={() => mediaControl("next")} aria-label="Next"><SkipForward size={17} /></button>
        </div>
      </div>
    </CardShell>
  );
});

const FocusCard = memo(function FocusCard() {
  const t = useT();
  const f = useRuntime((s) => s.focus);
  const setTab = useRuntime((s) => s.setTab);
  const running = f.status === "running";
  return (
    <CardShell onClick={() => setTab("focus")}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: "var(--accent)" }}><Timer size={14} /> {f.phase === "focus" ? t("Focus") : f.phase === "short" ? t("Short break") : t("Long break")}</span>
        <span className="chip !h-5 !text-[10px]">{running ? t("Running") : f.status === "paused" ? t("Paused") : t("Ready")}</span>
      </div>
      <div className="my-auto text-center text-[40px] font-semibold leading-none tabular-nums tracking-tight" dir="ltr">{fmtTime(f.remainingSec)}</div>
      <div onClick={(e) => e.stopPropagation()} className="flex justify-center">
        <button className={`btn ${running ? "" : "btn-accent"}`} onClick={() => (running ? focusApi.pause() : focusApi.start())}>
          {running ? <Pause size={13} /> : <Play size={13} />} {running ? t("Pause") : f.status === "paused" ? t("Resume") : t("Start")}
        </button>
      </div>
    </CardShell>
  );
});

const Bar = ({ icon: Icon, label, value, text }: { icon: typeof Cpu; label: string; value: number | null; text: string }) => (
  <div>
    <div className="mb-1 flex items-center justify-between text-[11.5px]">
      <span className="muted flex items-center gap-1.5"><Icon size={12} /> {label}</span>
      <span className="font-medium tabular-nums" dir="ltr">{text}</span>
    </div>
    <ProgressBar value={value ?? 0} />
  </div>
);

const SystemCard = memo(function SystemCard() {
  const t = useT();
  const s = useRuntime((x) => x.sys);
  const ramPct = s.ramUsed != null && s.ramTotal ? (s.ramUsed / s.ramTotal) * 100 : null;
  const pct = (v: number | null) => (v == null ? "n/a" : `${Math.round(v)}%`);
  return (
    <CardShell>
      <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold"><Gauge size={14} style={{ color: "var(--accent)" }} /> {t("System")}{!s.native && <span className="faint text-[10px] font-normal">(web: limited)</span>}</div>
      <div className="flex flex-1 flex-col justify-between gap-2">
        <Bar icon={Cpu} label={t("CPU")} value={s.cpu} text={pct(s.cpu)} />
        <Bar icon={MemoryStick} label={s.native ? t("RAM") : "JS heap"} value={ramPct} text={pct(ramPct)} />
        <Bar icon={Gauge} label={t("GPU")} value={s.gpu} text={pct(s.gpu)} />
        <Bar icon={s.charging ? BatteryCharging : Battery} label={t("Battery")} value={s.battery} text={s.battery == null ? "n/a" : `${s.battery}%`} />
        <div className="flex items-center justify-between text-[11.5px]"><span className="muted flex items-center gap-1.5"><Network size={12} /> {t("Network")}</span><span className="font-medium" style={{ color: s.online ? "#4ade80" : "#f87171" }}>{s.online ? t("Online") : t("Offline")}</span></div>
      </div>
    </CardShell>
  );
});

const ClockCard = memo(function ClockCard() {
  const now = useClock();
  const lang = useLang();
  return (
    <CardShell className="items-center justify-center">
      <div className="text-[40px] font-semibold leading-none tabular-nums" dir="ltr">{fmtClock(now, lang)}</div>
      <div className="muted mt-2 text-[12px]">{fmtDate(now, lang)}</div>
    </CardShell>
  );
});

const AgendaCard = memo(function AgendaCard() {
  const t = useT();
  const events = useData((s) => s.events);
  const setTab = useRuntime((s) => s.setTab);
  const today = events.filter((e) => e.date === dayKey()).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 4);
  return (
    <CardShell onClick={() => setTab("agenda")}>
      <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold"><CalendarDays size={14} style={{ color: "var(--accent)" }} /> {t("Agenda")}</div>
      {today.length === 0 ? <div className="faint m-auto text-[12px]">{t("No events")}</div> : (
        <ul className="space-y-1.5">{today.map((e) => (
          <li key={e.id} className="flex items-center gap-2 text-[12px]"><span className="muted tabular-nums" dir="ltr">{e.start}</span><span className="truncate" dir="auto">{e.title}</span></li>
        ))}</ul>
      )}
    </CardShell>
  );
});

const NotesCard = memo(function NotesCard() {
  const t = useT();
  const n = useData((s) => s.notes[0]);
  const setTab = useRuntime((s) => s.setTab);
  return (
    <CardShell onClick={() => setTab("notes")}>
      <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold"><StickyNote size={14} style={{ color: "var(--accent)" }} /> {t("Notes")}</div>
      {n ? (<><div className="truncate text-[13px] font-semibold" dir="auto">{n.title || t("Untitled")}</div><div className="muted mt-1 line-clamp-4 text-[12px] leading-relaxed" dir="auto">{n.body}</div></>) : <div className="faint m-auto text-[12px]">{t("New note")}</div>}
    </CardShell>
  );
});

const CARDS: Record<CardType, React.ComponentType> = { ai: AICard, music: MusicCard, focus: FocusCard, system: SystemCard, clock: ClockCard, agenda: AgendaCard, notes: NotesCard };

export default function Home() {
  const cards = useSettings((s) => s.homeCards);
  const t = useT();
  const shown = cards.filter((c: HomeCard) => c.enabled);
  if (!shown.length) return <EmptyState icon={Sparkles} title="No cards" hint={`${t("Customize")} → ${t("Modules")}`} />;
  return (
    <div className="flex h-full gap-3">
      {shown.map((c) => {
        const C = CARDS[c.type];
        return <div key={c.uid} className="flex min-w-0" style={{ flex: `${GROW[c.size]} 1 0%` }}><div className="flex min-w-0 flex-1 flex-col [&>*]:flex-1"><C /></div></div>;
      })}
    </div>
  );
}
