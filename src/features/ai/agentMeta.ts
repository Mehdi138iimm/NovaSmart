import { BadgeCheck, BrainCircuit, CircleAlert, CirclePause, FileSearch, Loader, Moon, Pencil, Terminal, type LucideIcon } from "lucide-react";
import type { AgentState } from "@/types";

export const AGENT_STATE: Record<AgentState, { label: string; icon: LucideIcon; color: string }> = {
  idle: { label: "Idle", icon: Moon, color: "var(--fg-faint)" },
  starting: { label: "Starting", icon: Loader, color: "#60a5fa" },
  reading: { label: "Reading", icon: FileSearch, color: "#60a5fa" },
  thinking: { label: "Thinking", icon: BrainCircuit, color: "#c084fc" },
  editing: { label: "Editing", icon: Pencil, color: "#fbbf24" },
  executing: { label: "Executing", icon: Terminal, color: "#fb923c" },
  waiting: { label: "Waiting for approval", icon: CirclePause, color: "#facc15" },
  completed: { label: "Completed", icon: BadgeCheck, color: "#4ade80" },
  failed: { label: "Failed", icon: CircleAlert, color: "#f87171" },
};
