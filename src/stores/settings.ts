import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CardSize, CardType, HomeCard, ModeConfig, ModeId, ProviderConfig, ProviderId, TabId, ThemeId } from "@/types";
import { NAV_TABS } from "@/types";

export const THEMES: Record<ThemeId, { name: string; accent: string; eye: string; panel: string }> = {
  pure: { name: "Pure Monochrome", accent: "#ffffff", eye: "#ffffff", panel: "#000000" },
  minimal: { name: "Minimal Dark", accent: "#e4e4e7", eye: "#ffffff", panel: "#0a0a0a" },
  amber: { name: "Amber Gold", accent: "#f5b83d", eye: "#ffc14d", panel: "#000000" },
  purple: { name: "Midnight Purple", accent: "#8b5cf6", eye: "#c9a8ff", panel: "#07040f" },
  aurora: { name: "Aurora", accent: "#34d399", eye: "#7ef0c5", panel: "#030a09" },
  crimson: { name: "Crimson", accent: "#ef4444", eye: "#ff8080", panel: "#0b0304" },
  custom: { name: "Custom Theme", accent: "#ffffff", eye: "#ffffff", panel: "#05070a" },
};

export const defaultMode = (focusMin: number, breakMin: number): ModeConfig => ({
  focusMin, breakMin, quietNotifications: false, dimEyes: false, lowResource: false,
  allowedProviders: ["novafree", "ollama", "gemini", "groq", "openrouter", "openai", "anthropic"], scheduleEnabled: false, scheduleStart: "23:00", scheduleEnd: "07:00",
});

export interface Settings {
  lang: "en" | "fa";
  colorMode: "dark" | "light" | "system";
  theme: ThemeId;
  accent: string;
  eyeColor: string;
  panelColor: string;
  bgStyle: "solid" | "tinted" | "glass";
  // island
  islandW: number; islandH: number; islandTop: number; islandRadius: number;
  eyeSize: number; eyeGap: number; blinkSpeed: number;
  // panel
  panelW: number; panelH: number; panelOpacity: number; panelBlur: number; panelRadius: number;
  animationIntensity: number;
  // nav
  navOrder: TabId[]; navHidden: TabId[]; navIconSize: number; navGap: number; navShowLabel: boolean;
  // home
  homeCards: HomeCard[];
  // interaction
  interaction: "hover" | "click" | "both";
  openDelay: number; closeDelay: number; clickToggle: boolean; autoClose: boolean; pinOpen: boolean;
  closeOnEscape: boolean; ignoreHoverFullscreen: boolean;
  // audio sound effects
  soundEnabled: boolean;
  soundVolume: number;
  // general
  showIsland: boolean;
  autostart: boolean; startMinimized: boolean; monitor: number;
  // perf
  lowResource: boolean; animationQuality: "high" | "balanced" | "low"; backgroundActivity: boolean; sysInterval: number;
  // focus
  focusMin: number; shortMin: number; longMin: number; longEvery: number; soundOnEnd: boolean; focusDnd: boolean;
  // privacy / data
  clipboardEnabled: boolean; allowSensitive: boolean; filesPersist: boolean; osNotifications: boolean;
  // ai
  providers: Record<ProviderId, ProviderConfig>;
  activeProvider: ProviderId | null;
  mailClientId: string;
  // modes
  activeMode: ModeId | null;
  modes: Record<ModeId, ModeConfig>;
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const DEFAULT_CARDS: HomeCard[] = [
  { uid: "c-ai", type: "ai", size: "sm", enabled: true },
  { uid: "c-music", type: "music", size: "lg", enabled: true },
  { uid: "c-focus", type: "focus", size: "sm", enabled: true },
  { uid: "c-system", type: "system", size: "sm", enabled: false },
];

export const DEFAULTS: Settings = {
  lang: "en", colorMode: "dark", theme: "pure",
  accent: THEMES.pure.accent, eyeColor: THEMES.pure.eye, panelColor: THEMES.pure.panel, bgStyle: "solid",
  islandW: 132, islandH: 34, islandTop: 0, islandRadius: 18,
  eyeSize: 1, eyeGap: 14, blinkSpeed: 1,
  panelW: 780, panelH: 400, panelOpacity: 1, panelBlur: 0, panelRadius: 34,
  animationIntensity: 1,
  navOrder: [...NAV_TABS], navHidden: [], navIconSize: 18, navGap: 4, navShowLabel: true,
  homeCards: DEFAULT_CARDS,
  interaction: "both", openDelay: 150, closeDelay: 450, clickToggle: true, autoClose: false, pinOpen: false,
  closeOnEscape: true, ignoreHoverFullscreen: true,
  soundEnabled: true,
  soundVolume: 0.8,
  showIsland: true,
  autostart: false, startMinimized: false, monitor: -1,
  lowResource: false, animationQuality: "high", backgroundActivity: true, sysInterval: 3000,
  focusMin: 25, shortMin: 5, longMin: 15, longEvery: 4, soundOnEnd: true, focusDnd: true,
  clipboardEnabled: true, allowSensitive: false, filesPersist: false, osNotifications: true,
  providers: {
    novafree: { apiKey: "", model: "openai", status: "ok" },
    ollama: { apiKey: "", model: "qwen2.5:3b", status: "unknown", baseUrl: "http://localhost:11434" },
    gemini: { apiKey: "", model: "gemini-2.0-flash", status: "unknown" },
    groq: { apiKey: "", model: "llama-3.1-8b-instant", status: "unknown" },
    openrouter: { apiKey: "", model: "meta-llama/llama-3.3-70b-instruct:free", status: "unknown" },
    openai: { apiKey: "", model: "gpt-4o-mini", status: "unknown" },
    anthropic: { apiKey: "", model: "claude-3-5-haiku-latest", status: "unknown" },
  },
  activeProvider: "novafree", mailClientId: "",
  activeMode: null,
  modes: { work: defaultMode(50, 10), study: defaultMode(30, 5), sleep: { ...defaultMode(25, 5), quietNotifications: true, dimEyes: true, lowResource: true }, game: { ...defaultMode(25, 5), quietNotifications: true, lowResource: true } },
};

export interface Preset { id: string; name: string; data: Partial<Settings> }

interface Store extends Settings {
  presets: Preset[];
  set: (patch: Partial<Settings>) => void;
  applyTheme: (id: ThemeId) => void;
  setProvider: (id: ProviderId, patch: Partial<ProviderConfig>) => void;
  setMode: (id: ModeId, patch: Partial<ModeConfig>) => void;
  addCard: (type: CardType) => void;
  removeCard: (uid: string) => void;
  patchCard: (uid: string, patch: Partial<{ size: CardSize; enabled: boolean }>) => void;
  moveCard: (uid: string, dir: -1 | 1) => void;
  moveTab: (tab: TabId, dir: -1 | 1) => void;
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  resetAll: () => void;
}

// Keep presets purely visual/behavioural: never snapshot API keys or accounts.
const PRESET_EXCLUDE = ["providers", "activeProvider", "mailClientId", "activeMode", "modes", "lang"];

export const useSettings = create<Store>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      presets: [],
      set: (patch) => set(patch),
      applyTheme: (id) => {
        const t = THEMES[id];
        if (id === "custom") set({ theme: id });
        else set({ theme: id, accent: t.accent, eyeColor: t.eye, panelColor: t.panel });
      },
      setProvider: (id, patch) => set((s) => ({ providers: { ...s.providers, [id]: { ...s.providers[id], ...patch } } })),
      setMode: (id, patch) => set((s) => ({ modes: { ...s.modes, [id]: { ...s.modes[id], ...patch } } })),
      addCard: (type) => set((s) => ({ homeCards: [...s.homeCards, { uid: uid(), type, size: "sm", enabled: true }] })),
      removeCard: (id) => set((s) => ({ homeCards: s.homeCards.filter((c) => c.uid !== id) })),
      patchCard: (id, patch) => set((s) => ({ homeCards: s.homeCards.map((c) => (c.uid === id ? { ...c, ...patch } : c)) })),
      moveCard: (id, dir) =>
        set((s) => {
          const a = [...s.homeCards];
          const i = a.findIndex((c) => c.uid === id);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= a.length) return {};
          [a[i], a[j]] = [a[j], a[i]];
          return { homeCards: a };
        }),
      moveTab: (tab, dir) =>
        set((s) => {
          const a = [...s.navOrder];
          const i = a.indexOf(tab);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= a.length) return {};
          [a[i], a[j]] = [a[j], a[i]];
          return { navOrder: a };
        }),
      savePreset: (name) => {
        const s = get() as unknown as Record<string, unknown>;
        const data: Record<string, unknown> = {};
        for (const k of Object.keys(DEFAULTS)) if (!PRESET_EXCLUDE.includes(k)) data[k] = s[k];
        set((st) => ({ presets: [...st.presets, { id: uid(), name, data: JSON.parse(JSON.stringify(data)) }] }));
      },
      loadPreset: (id) => {
        const p = get().presets.find((x) => x.id === id);
        if (p) set(JSON.parse(JSON.stringify(p.data)));
      },
      deletePreset: (id) => set((s) => ({ presets: s.presets.filter((p) => p.id !== id) })),
      resetAll: () => {
        const keep = { providers: get().providers, activeProvider: get().activeProvider, lang: get().lang };
        set({ ...JSON.parse(JSON.stringify(DEFAULTS)), ...keep });
      },
    }),
    {
      name: "novasmart.settings",
      version: 1,
      partialize: (s) => {
        // drop functions
        const out: Record<string, unknown> = {};
        for (const k of [...Object.keys(DEFAULTS), "presets"]) out[k] = (s as unknown as Record<string, unknown>)[k];
        return out as unknown as Store;
      },
      // Fill in keys added in newer versions.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Store>;
        // Deep-merge providers so newly added providers (novafree, groq, openrouter…) exist for old saves.
        const providers = { ...current.providers, ...(p.providers ?? {}) };
        if (!providers.novafree) {
          providers.novafree = { apiKey: "", model: "openai", status: "ok" };
        }
        // One-time upgrade: old 0.5b default → 3b, and free AI as default when nothing chosen.
        if (providers.ollama.model === "qwen2.5:0.5b") providers.ollama = { ...providers.ollama, model: "qwen2.5:3b", status: "unknown" };
        return { ...current, ...p, providers, activeProvider: p.activeProvider ?? "novafree" };
      },
    }
  )
);

// Keep the capsule window (separate webview) in sync.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "novasmart.settings") useSettings.persist.rehydrate();
  });
}

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
