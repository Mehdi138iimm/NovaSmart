import { useData } from "@/stores/data";
import { useRuntime, type FocusPhase } from "@/stores/runtime";
import { useSettings } from "@/stores/settings";
import { notify } from "./notify";
import { playSound } from "./sound";

const phaseSeconds = (p: FocusPhase) => {
  const s = useSettings.getState();
  return (p === "focus" ? s.focusMin : p === "short" ? s.shortMin : s.longMin) * 60;
};

const set = (patch: Partial<ReturnType<typeof useRuntime.getState>["focus"]>) =>
  useRuntime.setState((s) => ({ focus: { ...s.focus, ...patch } }));

const get = () => useRuntime.getState().focus;

export const focusApi = {
  setPhase(phase: FocusPhase, seconds?: number) {
    const d = Math.max(60, Math.min(6 * 3600, seconds ?? phaseSeconds(phase)));
    set({ phase, status: "idle", durationSec: d, remainingSec: d, endAt: null, startedAt: null });
  },
  setDuration(seconds: number) {
    const f = get();
    if (f.status !== "idle") return;
    this.setPhase(f.phase, seconds);
  },
  start() {
    const f = get();
    if (f.status === "running") return;
    playSound("click");
    const now = Date.now();
    set({ status: "running", endAt: now + f.remainingSec * 1000, startedAt: f.startedAt ?? now });
  },
  pause() {
    const f = get();
    if (f.status !== "running" || !f.endAt) return;
    playSound("click");
    set({ status: "paused", remainingSec: Math.max(1, Math.ceil((f.endAt - Date.now()) / 1000)), endAt: null });
  },
  resume() {
    this.start();
  },
  reset() {
    playSound("click");
    const f = get();
    set({ status: "idle", remainingSec: f.durationSec, endAt: null, startedAt: null });
  },
  tick() {
    const f = get();
    if (f.status !== "running" || !f.endAt) return;
    const rem = Math.max(0, Math.round((f.endAt - Date.now()) / 1000));
    if (rem <= 0) return this.complete();
    if (rem !== f.remainingSec) set({ remainingSec: rem });
  },
  complete() {
    const f = get();
    const minutes = Math.round(f.durationSec / 60);
    useData.getState().addFocusRecord({ minutes, phase: f.phase, completed: true });
    const s = useSettings.getState();
    if (s.soundOnEnd) playSound("focusBell");
    useRuntime.getState().flashEyes("success", 6000);
    let next: FocusPhase = "focus";
    let cycle = f.cycle;
    if (f.phase === "focus") {
      cycle += 1;
      next = cycle % s.longEvery === 0 ? "long" : "short";
      notify("focus", "Focus session complete", `${minutes} min — time for a ${next === "long" ? "long" : "short"} break.`);
    } else notify("focus", "Break finished", "Ready for the next focus session?");
    set({ cycle });
    this.setPhase(next);
  },
};
