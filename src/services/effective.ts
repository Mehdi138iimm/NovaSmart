import { useMemo } from "react";
import { useSettings, type Settings } from "@/stores/settings";
import { useRuntime } from "@/stores/runtime";
import type { ModeConfig, ModeId } from "@/types";

export interface Effective { mode: ModeId | null; cfg: ModeConfig | null; quiet: boolean; lowResource: boolean; dimEyes: boolean }

const toMin = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

export function scheduledMode(s: Pick<Settings, "modes">, now = new Date()): ModeId | null {
  const sl = s.modes.sleep;
  if (!sl.scheduleEnabled) return null;
  const cur = now.getHours() * 60 + now.getMinutes();
  const a = toMin(sl.scheduleStart);
  const b = toMin(sl.scheduleEnd);
  const inside = a <= b ? cur >= a && cur < b : cur >= a || cur < b;
  return inside ? "sleep" : null;
}

export function computeEffective(
  st: Pick<Settings, "activeMode" | "modes" | "lowResource" | "focusDnd">,
  focusRunning: boolean
): Effective {
  const mode = st.activeMode ?? scheduledMode(st);
  const cfg = mode ? st.modes[mode] : null;
  return {
    mode,
    cfg,
    quiet: !!cfg?.quietNotifications || (st.focusDnd && focusRunning),
    lowResource: st.lowResource || !!cfg?.lowResource,
    dimEyes: !!cfg?.dimEyes,
  };
}

export const getEffective = (): Effective => {
  const s = useSettings.getState();
  const f = useRuntime.getState().focus;
  return computeEffective(s, f.status === "running" && f.phase === "focus");
};

export function useEffective(): Effective {
  const activeMode = useSettings((s) => s.activeMode);
  const modes = useSettings((s) => s.modes);
  const lowResource = useSettings((s) => s.lowResource);
  const focusDnd = useSettings((s) => s.focusDnd);
  const running = useRuntime((s) => s.focus.status === "running" && s.focus.phase === "focus");
  return useMemo(() => computeEffective({ activeMode, modes, lowResource, focusDnd }, running), [activeMode, modes, lowResource, focusDnd, running]);
}
