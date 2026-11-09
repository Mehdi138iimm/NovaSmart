import { useData } from "@/stores/data";
import { useRuntime } from "@/stores/runtime";
import type { AgentState, Approval } from "@/types";
import { notify } from "./notify";
import { invoke } from "./native";

/** Payload sent by the Rust agent bridge (HTTP on 127.0.0.1) — e.g. from Claude Code hooks. */
export interface AgentEventPayload {
  agent: string;
  state: AgentState;
  message?: string;
  approval?: { id: string; kind: string; description: string; target: string };
}

const VALID: AgentState[] = ["idle", "starting", "reading", "thinking", "editing", "executing", "waiting", "completed", "failed"];

export function handleAgentEvent(p: AgentEventPayload) {
  if (!p?.agent) return;
  const state: AgentState = VALID.includes(p.state) ? p.state : "idle";
  const rt = useRuntime.getState();
  const prev = rt.agents[p.agent]?.state;
  useRuntime.setState({
    agents: { ...rt.agents, [p.agent]: { id: p.agent, name: p.agent, state, message: p.message, lastSeen: Date.now() } },
  });
  const data = useData.getState();
  if (prev !== state) data.addActivity({ agent: p.agent, state, text: p.message ?? state });
  if (p.approval) {
    const a: Approval = { ...p.approval, agent: p.agent, ts: Date.now() };
    if (!useRuntime.getState().approvals.some((x) => x.id === a.id)) {
      useRuntime.setState((s) => ({ approvals: [...s.approvals, a] }));
      notify("approval", `${p.agent} needs approval`, a.description);
    }
  }
  if (state === "completed" && prev !== "completed") {
    data.bumpAiTask();
    notify("ai", `${p.agent} finished`, p.message);
  }
  if (state === "failed" && prev !== "failed") notify("error", `${p.agent} failed`, p.message);
}

export async function respondApproval(id: string, decision: "allow" | "deny") {
  useRuntime.setState((s) => ({ approvals: s.approvals.filter((a) => a.id !== id) }));
  await invoke("agent_respond", { id, decision });
}
