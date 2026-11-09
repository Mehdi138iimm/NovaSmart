import { create } from "zustand";
import type { AgentInfo, AgentState, Approval, EyeMood, MusicState, SystemStats, TabId } from "@/types";
import { playSound } from "@/services/sound";

export type FocusPhase = "focus" | "short" | "long";
export interface FocusState {
  phase: FocusPhase;
  status: "idle" | "running" | "paused";
  durationSec: number;
  endAt: number | null;
  remainingSec: number;
  cycle: number;
  startedAt: number | null;
}

export interface ChatMsg { id: string; role: "user" | "assistant" | "error"; text: string; provider?: string }

export type BannerSource = "telegram" | "youtube" | "spotify" | "system" | "ai" | "focus" | "agenda" | "mail" | "media";

export interface IslandBanner {
  id: string;
  source: BannerSource;
  appIcon?: string;
  title: string;
  body?: string;
  actionTab?: TabId;
  durationMs?: number;
  ts: number;
}

interface Runtime {
  open: boolean;
  openedBy: "hover" | "click" | null;
  pinned: boolean;
  hovering: boolean;
  tab: TabId;
  quickMenu: boolean;
  lastActivity: number;
  fullscreen: boolean;
  sleeping: boolean;
  suppressHover: boolean;
  eyeOverride: { mood: EyeMood; until: number } | null;

  islandBanner: IslandBanner | null;

  focus: FocusState;
  music: MusicState;
  musicVolume: number;
  systemVolume: number;
  volume: number;
  sys: SystemStats;

  aiBusy: boolean;
  aiState: AgentState;
  aiLast: string;
  chat: ChatMsg[];
  agents: Record<string, AgentInfo>;
  approvals: Approval[];

  setOpen: (open: boolean, by?: "hover" | "click" | null) => void;
  /** Explicit fold (Fold In / Escape / eyes toggle): blocks hover-reopen until the pointer really leaves the window. */
  close: () => void;
  setTab: (t: TabId) => void;
  flashEyes: (mood: EyeMood, ms?: number) => void;
  showIslandBanner: (banner: Omit<IslandBanner, "id" | "ts">) => void;
  dismissIslandBanner: () => void;
  touch: () => void;
  patch: (p: Partial<Runtime>) => void;
}

let bannerTimer: ReturnType<typeof setTimeout> | undefined;

export const useRuntime = create<Runtime>((set, get) => ({
  open: false, openedBy: null, pinned: false, hovering: false, tab: "home", quickMenu: false,
  lastActivity: Date.now(), fullscreen: false, sleeping: false, suppressHover: false, eyeOverride: null,
  islandBanner: null,
  focus: { phase: "focus", status: "idle", durationSec: 25 * 60, endAt: null, remainingSec: 25 * 60, cycle: 0, startedAt: null },
  music: { source: null, title: "", artist: "", playing: false, position: 0, duration: 0, canControl: false },
  musicVolume: 0.8,
  systemVolume: 0.7,
  volume: 0.7,
  sys: { cpu: null, ramUsed: null, ramTotal: null, gpu: null, battery: null, charging: null, online: true, native: false },
  aiBusy: false, aiState: "idle", aiLast: "", chat: [], agents: {}, approvals: [],

  setOpen: (open, by = null) => {
    const prev = get().open;
    if (open !== prev) {
      playSound(open ? "open" : "close");
    }
    set((s) => ({ open, openedBy: open ? by ?? s.openedBy : null, pinned: open ? s.pinned : false, quickMenu: false, sleeping: false, lastActivity: Date.now(), suppressHover: open ? false : s.suppressHover }));
  },
  close: () => {
    if (get().open) playSound("close");
    set({ open: false, openedBy: null, pinned: false, quickMenu: false, suppressHover: true });
  },
  setTab: (tab) => {
    if (get().tab !== tab) playSound("tab");
    set({ tab, quickMenu: false, lastActivity: Date.now() });
  },
  flashEyes: (mood, ms = 3500) => set({ eyeOverride: { mood, until: Date.now() + ms } }),
  showIslandBanner: (banner) => {
    clearTimeout(bannerTimer);
    playSound("notification");
    const id = Math.random().toString(36).slice(2);
    set({ islandBanner: { ...banner, id, ts: Date.now() } });
    const dur = banner.durationMs ?? 5000;
    bannerTimer = setTimeout(() => {
      set({ islandBanner: null });
    }, dur);
  },
  dismissIslandBanner: () => {
    clearTimeout(bannerTimer);
    set({ islandBanner: null });
  },
  touch: () => set({ lastActivity: Date.now(), sleeping: false }),
  patch: (p) => set(p),
}));

export const fmtTime = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(r).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};
