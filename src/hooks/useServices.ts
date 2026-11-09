import { useEffect } from "react";
import { useRuntime } from "@/stores/runtime";
import { useSettings, clamp } from "@/stores/settings";
import { useData, dayKey } from "@/stores/data";
import { focusApi } from "@/services/focus";
import { invoke, listen, isTauri } from "@/services/native";
import { pollMedia } from "@/services/media";
import { looksSensitive } from "@/services/sensitive";
import { handleAgentEvent, type AgentEventPayload } from "@/services/agents";
import { notify, requestOsPermission } from "@/services/notify";
import { useEffective } from "@/services/effective";
import type { SystemStats } from "@/types";

const hex2rgb = (h: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(h);
  if (!m) return "245, 184, 61";
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};

function isLightHex(hex: string): boolean {
  try {
    const parts = hex2rgb(hex).split(",").map((x) => Number(x.trim()));
    if (parts.length < 3 || parts.some(isNaN)) return false;
    const [r, g, b] = parts;
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.75;
  } catch {
    return false;
  }
}

/** Writes theme + customization to CSS variables so every control applies instantly. */
export function useTheme() {
  const accent = useSettings((s) => s.accent);
  const eye = useSettings((s) => s.eyeColor);
  const mode = useSettings((s) => s.colorMode);
  const lang = useSettings((s) => s.lang);
  const eff = useEffective();

  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => {
      const isLight = mode === "light" || (mode === "system" && mq.matches);
      root.classList.toggle("light", isLight);

      const effectiveAccent = isLight && isLightHex(accent) ? "#111114" : accent;
      root.style.setProperty("--accent", effectiveAccent);
      root.style.setProperty("--accent-rgb", hex2rgb(effectiveAccent));
      root.style.setProperty("--eye", eye);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [mode, accent, eye]);

  useEffect(() => {
    document.documentElement.classList.toggle("fa", lang === "fa");
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";
  }, [lang]);
  useEffect(() => {
    document.documentElement.classList.toggle("lowres", eff.lowResource);
  }, [eff.lowResource]);
}

async function readStats(): Promise<SystemStats> {
  const base: SystemStats = { cpu: null, ramUsed: null, ramTotal: null, gpu: null, battery: null, charging: null, online: navigator.onLine, native: false };
  const n = await invoke<{ cpu: number; ram_used: number; ram_total: number; gpu?: number | null; battery?: number | null; charging?: boolean | null }>("get_system_stats");
  if (n) {
    return { cpu: n.cpu, ramUsed: n.ram_used, ramTotal: n.ram_total, gpu: n.gpu ?? null, battery: n.battery ?? null, charging: n.charging ?? null, online: navigator.onLine, native: true };
  }
  const mem = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
  if (mem) { base.ramUsed = mem.usedJSHeapSize; base.ramTotal = mem.jsHeapSizeLimit; }
  try {
    const b = await (navigator as unknown as { getBattery?: () => Promise<{ level: number; charging: boolean }> }).getBattery?.();
    if (b) { base.battery = Math.round(b.level * 100); base.charging = b.charging; }
  } catch { /* unsupported */ }
  return base;
}

/** All background work lives here, and only runs when it is actually needed. */
export function useServices() {
  const open = useRuntime((s) => s.open);
  const focusRunning = useRuntime((s) => s.focus.status === "running");
  const sysInterval = useSettings((s) => s.sysInterval);
  const clipEnabled = useSettings((s) => s.clipboardEnabled);
  const bgActivity = useSettings((s) => s.backgroundActivity);
  const autostart = useSettings((s) => s.autostart);
  const eff = useEffective();
  const slow = eff.lowResource ? 2.5 : 1;

  // Focus ticker — only while running.
  useEffect(() => {
    if (!focusRunning) return;
    const id = setInterval(() => focusApi.tick(), 1000);
    return () => clearInterval(id);
  }, [focusRunning]);

  // System stats — only while the panel is open.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    const run = async () => { const s = await readStats(); if (alive) useRuntime.setState({ sys: s }); };
    run();
    const id = setInterval(run, Math.max(1000, sysInterval * slow));
    return () => { alive = false; clearInterval(id); };
  }, [open, sysInterval, slow]);

  // Media session — poll in background so Dynamic Island live activity & notifications work
  useEffect(() => {
    if (!isTauri || !bgActivity) return;
    pollMedia();
    const id = setInterval(pollMedia, (open ? 1500 : 2500) * slow);
    return () => clearInterval(id);
  }, [open, bgActivity, slow]);

  // Clipboard history
  useEffect(() => {
    if (!clipEnabled || !bgActivity) return;
    const add = (text: string) => {
      if (!text) return;
      const st = useSettings.getState();
      const d = useData.getState();
      if (!st.allowSensitive && looksSensitive(text)) { useData.setState({ blockedClips: d.blockedClips + 1 }); return; }
      d.addClip(text);
    };
    if (isTauri) {
      const id = setInterval(async () => {
        const t = await invoke<string>("clipboard_read");
        if (t) add(t);
      }, 1500 * slow);
      return () => clearInterval(id);
    }
    const onCopy = () => add(document.getSelection()?.toString() ?? "");
    document.addEventListener("copy", onCopy);
    return () => { document.removeEventListener("copy", onCopy); };
  }, [clipEnabled, bgActivity, slow]);

  // Agenda reminders (30s granularity)
  useEffect(() => {
    if (!bgActivity) return;
    const check = () => {
      const now = new Date();
      const today = dayKey(now);
      const cur = now.getHours() * 60 + now.getMinutes();
      for (const e of useData.getState().events) {
        if (e.notified || e.date !== today) continue;
        const [h, m] = e.start.split(":").map(Number);
        const t = h * 60 + m;
        if (cur >= t && cur - t < 5) {
          useData.getState().markEventNotified(e.id);
          notify("agenda", e.title, `${e.start} – ${e.end}`);
        }
      }
    };
    check();
    const id = setInterval(check, 30000 * slow);
    return () => clearInterval(id);
  }, [bgActivity, slow]);

  // Idle → sleep eyes
  useEffect(() => {
    const id = setInterval(() => {
      const r = useRuntime.getState();
      if (!r.sleeping && !r.hovering && Date.now() - r.lastActivity > 90_000) useRuntime.setState({ sleeping: true });
    }, 15000);
    return () => clearInterval(id);
  }, []);

  // Escape closes the panel
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const r = useRuntime.getState();
      if (r.quickMenu) return useRuntime.setState({ quickMenu: false });
      if (r.open && useSettings.getState().closeOnEscape) r.close();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Explicit folds suppress hover-open until the pointer truly leaves the window.
  useEffect(() => {
    const h = () => useRuntime.setState({ suppressHover: false });
    document.documentElement.addEventListener("pointerleave", h);
    return () => document.documentElement.removeEventListener("pointerleave", h);
  }, []);

  // Fullscreen detection (only polled while the panel is closed and the option is enabled)
  const ignoreFs = useSettings((s) => s.ignoreHoverFullscreen);
  useEffect(() => {
    if (!ignoreFs) { useRuntime.setState({ fullscreen: false }); return; }
    if (!isTauri) {
      const h = () => useRuntime.setState({ fullscreen: !!document.fullscreenElement });
      document.addEventListener("fullscreenchange", h);
      return () => document.removeEventListener("fullscreenchange", h);
    }
    const run = async () => useRuntime.setState({ fullscreen: !!(await invoke<boolean>("is_fullscreen_app")) });
    run();
    const id = setInterval(run, 2500 * slow);
    return () => clearInterval(id);
  }, [ignoreFs, slow]);

  // Native events
  useEffect(() => {
    const offs: Array<() => void> = [];
    let dead = false;
    const add = (p: Promise<() => void>) => p.then((f) => (dead ? f() : offs.push(f)));
    add(listen<AgentEventPayload>("agent-event", handleAgentEvent));
    add(listen("quit-requested", () => {}));
    return () => { dead = true; offs.forEach((f) => f()); };
  }, []);

  // Autostart sync
  useEffect(() => { invoke("set_autostart", { enabled: autostart }); }, [autostart]);
  useEffect(() => { requestOsPermission(); }, []);

  // Sync initial Windows system volume
  useEffect(() => {
    if (!isTauri) return;
    invoke<number>("get_system_volume").then((v) => {
      if (typeof v === "number" && !isNaN(v)) {
        useRuntime.setState({ systemVolume: v, volume: v });
      }
    });
  }, []);
}

export function useStats() {
  return useRuntime((s) => s.sys);
}

export const percent = (v: number | null) => (v == null ? "—" : `${Math.round(clamp(v, 0, 100))}%`);
