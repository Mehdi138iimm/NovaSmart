import { useEffect, useState } from "react";
import { useRuntime } from "@/stores/runtime";
import { useEffective } from "@/services/effective";
import type { EyeMood } from "@/types";

/** Derives NOVA's mood from real app state. Priority: transient override → approvals → AI → focus → hover → sleep → idle. */
export function useEyeMood(): EyeMood {
  const override = useRuntime((s) => s.eyeOverride);
  const approvals = useRuntime((s) => s.approvals.length);
  const aiBusy = useRuntime((s) => s.aiBusy);
  const agentBusy = useRuntime((s) => Object.values(s.agents).some((a) => ["reading", "thinking", "editing", "executing", "starting"].includes(a.state)));
  const focusRun = useRuntime((s) => s.focus.status === "running" && s.focus.phase === "focus");
  const hovering = useRuntime((s) => s.hovering);
  const sleeping = useRuntime((s) => s.sleeping);
  const eff = useEffective();
  const [, tick] = useState(0);

  // Re-evaluate exactly when the override expires (no polling).
  useEffect(() => {
    if (!override) return;
    const ms = override.until - Date.now();
    if (ms <= 0) {
      useRuntime.setState({ eyeOverride: null });
      return;
    }
    const id = setTimeout(() => {
      useRuntime.setState({ eyeOverride: null });
      tick((n) => n + 1);
    }, ms);
    return () => clearTimeout(id);
  }, [override]);

  if (override && override.until > Date.now()) return override.mood;
  if (approvals > 0) return "attention";
  if (aiBusy) return "thinking";
  if (agentBusy) return "working";
  if (focusRun) return "working";
  if (hovering) return "curious";
  if (sleeping || eff.dimEyes) return "sleep";
  return "idle";
}
