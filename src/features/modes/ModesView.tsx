import { useState } from "react";
import { Briefcase, Gamepad2, GraduationCap, Moon, Power, type LucideIcon } from "lucide-react";
import { Row, SliderRow, Toggle } from "@/components/ui/controls";
import { useT } from "@/i18n";
import { PROVIDER_META } from "@/services/ai";
import { focusApi } from "@/services/focus";
import { useRuntime } from "@/stores/runtime";
import { useSettings } from "@/stores/settings";
import type { ModeId, ProviderId } from "@/types";

const MODES: { id: ModeId; label: string; icon: LucideIcon; blurb: string }[] = [
  { id: "work", label: "Work", icon: Briefcase, blurb: "Deep-work timer, fewer interruptions, only the AI services you allow." },
  { id: "study", label: "Study", icon: GraduationCap, blurb: "Focus timer with quick notes and scheduled breaks." },
  { id: "sleep", label: "Sleep", icon: Moon, blurb: "Dims NOVA, silences notifications and pauses non-essential background work." },
  { id: "game", label: "Game", icon: Gamepad2, blurb: "Minimal background activity, hover ignored in fullscreen, music controls stay available." },
];

export default function ModesView() {
  const t = useT();
  const [sel, setSel] = useState<ModeId>("work");
  const active = useSettings((s) => s.activeMode);
  const cfg = useSettings((s) => s.modes[sel]);
  const setMode = useSettings((s) => s.setMode);
  const set = useSettings((s) => s.set);
  const ignoreFs = useSettings((s) => s.ignoreHoverFullscreen);
  const setTab = useRuntime((s) => s.setTab);
  const isActive = active === sel;
  const timed = sel === "work" || sel === "study";

  const applyTimer = (focusMin: number, breakMin: number) => {
    set({ focusMin, shortMin: breakMin });
    if (useRuntime.getState().focus.status === "idle") focusApi.setPhase("focus", focusMin * 60);
  };
  const toggleActive = () => {
    if (isActive) return set({ activeMode: null });
    set({ activeMode: sel });
    if (timed) applyTimer(cfg.focusMin, cfg.breakMin);
  };
  const patch = (p: Partial<typeof cfg>) => {
    setMode(sel, p);
    if (isActive && timed) applyTimer(p.focusMin ?? cfg.focusMin, p.breakMin ?? cfg.breakMin);
  };
  const toggleProvider = (id: ProviderId) => patch({ allowedProviders: cfg.allowedProviders.includes(id) ? cfg.allowedProviders.filter((x) => x !== id) : [...cfg.allowedProviders, id] });

  return (
    <div className="flex h-full gap-4">
      <div className="flex w-[170px] shrink-0 flex-col gap-1.5">
        {MODES.map((m) => {
          const on = sel === m.id;
          return (
            <button key={m.id} onClick={() => setSel(m.id)} className="flex items-center gap-2.5 rounded-[18px] px-3 py-3 text-start transition-colors" style={{ background: on ? "var(--surface-2)" : "transparent", border: `1px solid ${on ? "var(--line)" : "transparent"}` }}>
              <m.icon size={17} style={{ color: on ? "var(--accent)" : "var(--fg-dim)" }} />
              <span className="flex-1 text-[13px] font-semibold">{t(m.label)}</span>
              {active === m.id && <span className="h-2 w-2 rounded-full" style={{ background: "#4ade80" }} />}
            </button>
          );
        })}
      </div>
      <div className="w-px shrink-0" style={{ background: "var(--line)" }} />
      <div className="scroll min-w-0 flex-1 pe-1">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            <div className="text-[20px] font-semibold">{t(MODES.find((m) => m.id === sel)!.label)}</div>
            <div className="muted max-w-[360px] text-[12px] leading-snug">{t(MODES.find((m) => m.id === sel)!.blurb)}</div>
          </div>
          <button className={`btn ${isActive ? "" : "btn-accent"}`} onClick={toggleActive}><Power size={13} /> {isActive ? t("Deactivate") : t("Activate")}</button>
        </div>
        <div className="surface px-4 py-1" style={{ borderRadius: 20 }}>
          {timed && (<>
            <SliderRow label={`${t("Focus")} (${t("Minutes")})`} value={cfg.focusMin} min={5} max={120} step={5} onChange={(v) => patch({ focusMin: v })} />
            <SliderRow label={`${t("Short break")} (${t("Minutes")})`} value={cfg.breakMin} min={1} max={30} onChange={(v) => patch({ breakMin: v })} />
          </>)}
          {sel !== "game" && <Row label={t("Limit interrupting notifications")} hint={t("Only errors and approval requests get through.")}><Toggle checked={cfg.quietNotifications} onChange={(v) => patch({ quietNotifications: v })} /></Row>}
          {sel === "game" && (<>
            <Row label={t("Hide non-essential notifications")}><Toggle checked={cfg.quietNotifications} onChange={(v) => patch({ quietNotifications: v })} /></Row>
            <Row label={t("Reduce background activity & resources")} hint={t("Longer polling intervals, animations simplified.")}><Toggle checked={cfg.lowResource} onChange={(v) => patch({ lowResource: v })} /></Row>
            <Row label={t("Don't open on hover in fullscreen apps")}><Toggle checked={ignoreFs} onChange={(v) => set({ ignoreHoverFullscreen: v })} /></Row>
          </>)}
          {sel === "sleep" && (<>
            <Row label={t("Dim NOVA eyes")}><Toggle checked={cfg.dimEyes} onChange={(v) => patch({ dimEyes: v })} /></Row>
            <Row label={t("Reduce background activity")}><Toggle checked={cfg.lowResource} onChange={(v) => patch({ lowResource: v })} /></Row>
            <Row label={t("Auto-activate on schedule")}><Toggle checked={cfg.scheduleEnabled} onChange={(v) => patch({ scheduleEnabled: v })} /></Row>
            {cfg.scheduleEnabled && <Row label={t("From / to")}><span className="flex items-center gap-1.5" dir="ltr"><input type="time" className="input !w-[100px] !py-1" value={cfg.scheduleStart} onChange={(e) => patch({ scheduleStart: e.target.value })} /><input type="time" className="input !w-[100px] !py-1" value={cfg.scheduleEnd} onChange={(e) => patch({ scheduleEnd: e.target.value })} /></span></Row>}
          </>)}
          {sel === "work" && (
            <div className="py-2">
              <div className="mb-1.5 text-[13px] font-medium">{t("Allowed AI services")}</div>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(PROVIDER_META) as ProviderId[]).map((id) => {
                  const on = cfg.allowedProviders.includes(id);
                  return <button key={id} className="chip cursor-pointer" onClick={() => toggleProvider(id)} style={on ? { background: "rgba(var(--accent-rgb), .18)", color: "var(--fg)" } : undefined}>{PROVIDER_META[id].name}</button>;
                })}
              </div>
            </div>
          )}
          {sel === "study" && <Row label={t("Notes")} hint={t("Jot things down while the timer runs.")}><button className="btn" onClick={() => setTab("notes")}>{t("Notes")}</button></Row>}
          {timed && <Row label={t("Focus")}><button className="btn" onClick={() => setTab("focus")}>{t("Focus")}</button></Row>}
        </div>
      </div>
    </div>
  );
}
