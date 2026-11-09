import { useMemo, useState } from "react";
import { Pause, Play, RotateCcw, Trash2 } from "lucide-react";
import { Segmented } from "@/components/ui/controls";
import { num, useLang, useT } from "@/i18n";
import { focusApi } from "@/services/focus";
import { dayKey, useData } from "@/stores/data";
import { fmtTime, useRuntime, type FocusPhase } from "@/stores/runtime";
import { useSettings } from "@/stores/settings";

const VIOLET = "139, 92, 246";

export default function FocusView() {
  const t = useT();
  const lang = useLang();
  const f = useRuntime((s) => s.focus);
  const history = useData((s) => s.focusHistory);
  const clear = useData((s) => s.clearFocusHistory);
  const focusMin = useSettings((s) => s.focusMin);
  const shortMin = useSettings((s) => s.shortMin);
  const longMin = useSettings((s) => s.longMin);
  const longEvery = useSettings((s) => s.longEvery);
  const set = useSettings((s) => s.set);
  const [custom, setCustom] = useState("");
  const running = f.status === "running";
  const progress = 1 - f.remainingSec / f.durationSec;

  const stats = useMemo(() => {
    const today = history.filter((h) => dayKey(new Date(h.ts)) === dayKey() && h.phase === "focus" && h.completed);
    return { sessions: today.length, minutes: today.reduce((n, h) => n + h.minutes, 0) };
  }, [history]);

  const endAt = new Date(Date.now() + f.remainingSec * 1000);
  const endLabel = endAt.toLocaleTimeString(lang === "fa" ? "fa-IR-u-nu-latn" : "en-GB", { hour: "2-digit", minute: "2-digit" });
  const phaseMin = f.phase === "focus" ? focusMin : f.phase === "short" ? shortMin : longMin;

  const applyMinutes = (m: number) => {
    const v = Math.max(1, Math.min(180, Math.round(m)));
    set(f.phase === "focus" ? { focusMin: v } : f.phase === "short" ? { shortMin: v } : { longMin: v });
    focusApi.setPhase(f.phase, v * 60);
  };

  return (
    <div className="relative flex h-full gap-4">
      <div className="pointer-events-none absolute inset-y-0 start-0 w-2/3" style={{ background: `radial-gradient(60% 70% at 50% 45%, rgba(${VIOLET}, ${running ? 0.2 : 0.11}), transparent 70%)`, transition: "background .6s" }} />
      <div className="relative flex min-w-0 flex-[2] flex-col items-center justify-center gap-3">
        <Segmented size="sm" value={f.phase} onChange={(p: FocusPhase) => focusApi.setPhase(p)} options={[{ value: "focus", label: t("Focus") }, { value: "short", label: t("Short break") }, { value: "long", label: t("Long break") }]} />
        <div className="text-[84px] font-semibold leading-none tracking-tight tabular-nums" dir="ltr" style={{ textShadow: `0 0 40px rgba(${VIOLET}, .35)` }}>{fmtTime(f.remainingSec)}</div>
        <div className="muted text-[12px]">{running ? t("Running") : f.status === "paused" ? t("Paused") : t("Ready")} · {num(f.cycle % longEvery, lang)}/{num(longEvery, lang)}</div>

        <div className="flex items-center gap-2.5">
          <button className="btn !h-10 !px-6 !text-[13.5px]" style={{ background: `rgb(${VIOLET})`, color: "#fff", borderColor: "transparent" }} onClick={() => (running ? focusApi.pause() : focusApi.start())}>
            {running ? <Pause size={15} /> : <Play size={15} />} {running ? t("Pause") : f.status === "paused" ? t("Resume") : t("Start")}
          </button>
          <button className="icon-btn !h-10 !w-10" style={{ background: "var(--surface)" }} onClick={() => focusApi.reset()} aria-label={t("Reset")}><RotateCcw size={16} /></button>
        </div>

        <div className="mt-1 w-full max-w-[430px]" dir="ltr">
          <div className="relative h-2 rounded-full" style={{ background: "var(--surface-2)" }}>
            <div className="h-full rounded-full" style={{ width: `${progress * 100}%`, background: `rgb(${VIOLET})`, transition: "width 1s linear" }} />
            <div className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" style={{ left: `${progress * 100}%`, boxShadow: `0 0 12px rgba(${VIOLET}, .9)`, transition: "left 1s linear" }} />
          </div>
          <div className="muted mt-1.5 flex justify-between text-[11px] tabular-nums">
            <span>{f.startedAt ? new Date(f.startedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}</span>
            <span>{t("Time")}: {fmtTime(f.durationSec - f.remainingSec)} / {fmtTime(f.durationSec)}</span>
            <span>≈ {endLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {[15, 25, 45, 60].map((m) => (
            <button key={m} disabled={f.status !== "idle"} className="chip !h-6 cursor-pointer disabled:opacity-40" style={phaseMin === m ? { background: `rgba(${VIOLET}, .25)`, color: "var(--fg)" } : undefined} onClick={() => applyMinutes(m)}>{num(m, lang)}</button>
          ))}
          <input className="input !h-6 !w-[70px] !rounded-full !px-2.5 !py-0 !text-[11px]" disabled={f.status !== "idle"} placeholder={`${t("Minutes")}…`} value={custom} inputMode="numeric"
            onChange={(e) => setCustom(e.target.value.replace(/\D/g, "").slice(0, 3))} onKeyDown={(e) => { if (e.key === "Enter" && custom) { applyMinutes(+custom); setCustom(""); } }} />
        </div>
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="surface grid grid-cols-2 gap-2 p-3" style={{ borderRadius: 20 }}>
          <div><div className="text-[24px] font-semibold tabular-nums">{num(stats.sessions, lang)}</div><div className="muted text-[11px]">{t("Sessions")} · {t("Today")}</div></div>
          <div><div className="text-[24px] font-semibold tabular-nums">{num(stats.minutes, lang)}</div><div className="muted text-[11px]">{t("Minutes")}</div></div>
        </div>
        <div className="flex items-center justify-between"><span className="label">{t("History")}</span>{history.length > 0 && <button className="icon-btn !h-6 !w-6" onClick={clear} aria-label={t("Clear history")}><Trash2 size={13} /></button>}</div>
        <div className="scroll min-h-0 flex-1 space-y-1.5">
          {history.length === 0 && <div className="faint text-[12px]">—</div>}
          {history.slice(0, 30).map((h) => (
            <div key={h.id} className="flex items-center justify-between rounded-xl px-3 py-1.5 text-[12px]" style={{ background: "var(--surface)" }}>
              <span>{h.phase === "focus" ? t("Focus") : h.phase === "short" ? t("Short break") : t("Long break")}</span>
              <span className="muted tabular-nums" dir="ltr">{h.minutes}m · {new Date(h.ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          ))}
        </div>
        <div className="muted text-[11px]" dir="ltr">Focus {focusMin} · Short {shortMin} · Long {longMin}</div>
      </div>
    </div>
  );
}
