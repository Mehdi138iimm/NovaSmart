import { useRuntime } from "@/stores/runtime";
import type { AudioSession } from "@/types";
import { invoke } from "./native";

// ---------- Local player (works in any browser / webview; used when no SMTC session is available) ----------
interface Track { name: string; url: string }
const tracks: Track[] = [];
let index = -1;
let audio: HTMLAudioElement | null = null;
let lastPush = 0;

const clean = (n: string) => n.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ");

function push(force = false) {
  if (!audio) return;
  const now = Date.now();
  if (!force && now - lastPush < 900) return;
  lastPush = now;
  const t = tracks[index];
  useRuntime.setState({
    music: {
      source: "local", title: t ? clean(t.name) : "", artist: "Local file", playing: !audio.paused,
      position: audio.currentTime || 0, duration: Number.isFinite(audio.duration) ? audio.duration : 0, canControl: true, app: "NOVASMART",
    },
  });
}

function ensure() {
  if (audio) return audio;
  audio = new Audio();
  audio.volume = useRuntime.getState().musicVolume;
  audio.addEventListener("timeupdate", () => push());
  audio.addEventListener("play", () => push(true));
  audio.addEventListener("pause", () => push(true));
  audio.addEventListener("loadedmetadata", () => push(true));
  audio.addEventListener("ended", () => localPlayer.next());
  return audio;
}

export const localPlayer = {
  add(files: File[]) {
    const audios = files.filter((f) => f.type.startsWith("audio/") || /\.(mp3|wav|ogg|flac|m4a|aac|opus)$/i.test(f.name));
    if (!audios.length) return 0;
    const wasEmpty = tracks.length === 0;
    audios.forEach((f) => tracks.push({ name: f.name, url: URL.createObjectURL(f) }));
    if (wasEmpty) this.load(0, true);
    return audios.length;
  },
  load(i: number, play: boolean) {
    const a = ensure();
    index = (i + tracks.length) % tracks.length;
    a.src = tracks[index].url;
    if (play) a.play().catch(() => {});
    push(true);
  },
  toggle() {
    const a = ensure();
    if (!tracks.length) return;
    a.paused ? a.play().catch(() => {}) : a.pause();
  },
  next() { if (tracks.length) this.load(index + 1, true); },
  prev() {
    const a = ensure();
    if (a.currentTime > 3 || !tracks.length) a.currentTime = 0;
    else this.load(index - 1, true);
  },
  seek(sec: number) { ensure().currentTime = sec; push(true); },
  setVolume(v: number) { if (audio) audio.volume = v; },
  hasTracks: () => tracks.length > 0,
};

// ---------- Unified control surface ----------
export type MediaAction = "toggle" | "next" | "prev";

export async function mediaControl(action: MediaAction) {
  const m = useRuntime.getState().music;
  if (m.source === "local") {
    if (action === "toggle") localPlayer.toggle();
    else if (action === "next") localPlayer.next();
    else localPlayer.prev();
    return;
  }
  await invoke("media_control", { action });
  setTimeout(pollMedia, 250);
}

export async function mediaSeek(sec: number) {
  const m = useRuntime.getState().music;
  if (m.source === "local") return localPlayer.seek(sec);
  useRuntime.setState({ music: { ...m, position: sec } });
  await invoke("media_control", { action: "seek", position: sec });
}

export function setMusicVolume(v: number) {
  const vol = Math.max(0, Math.min(1, v));
  useRuntime.setState({ musicVolume: vol });
  localPlayer.setVolume(vol);
}

export async function setAppVolume(target: string, pid?: number, volume = 1.0) {
  const vol = Math.max(0, Math.min(1, volume));
  useRuntime.setState({ musicVolume: vol });
  await invoke("set_app_volume", { target, pid: pid ?? null, volume: vol });
}

export async function listAudioSessions(): Promise<AudioSession[]> {
  const list = await invoke<AudioSession[]>("list_audio_sessions");
  return list ?? [];
}

export async function setSystemVolume(v: number) {
  const vol = Math.max(0, Math.min(1, v));
  useRuntime.setState({ systemVolume: vol, volume: vol });
  await invoke("set_system_volume", { value: vol });
}

export async function setVolume(v: number) {
  setMusicVolume(v);
}

interface NativeMedia {
  title: string; artist: string; app: string; playing: boolean; position: number; duration: number; art?: string | null; canControl: boolean;
}

let lastTrackKey = "";

export async function pollMedia() {
  const cur = useRuntime.getState().music;
  if (cur.source === "local" && cur.playing) return;
  const r = await invoke<NativeMedia | null>("media_get");
  if (r && (r.title || r.artist)) {
    const trackKey = `${r.title} - ${r.artist}`;
    const isNewTrack = trackKey !== lastTrackKey && r.playing && r.title.length > 0;
    lastTrackKey = trackKey;

    useRuntime.setState({
      music: {
        source: "native", title: r.title, artist: r.artist, app: r.app, playing: r.playing, position: r.position, duration: r.duration,
        art: r.art ? `data:image/png;base64,${r.art}` : cur.title === r.title ? cur.art : undefined, canControl: r.canControl,
      },
    });

    if (isNewTrack && !useRuntime.getState().open) {
      const appLower = (r.app || "").toLowerCase();
      const titleLower = (r.title || "").toLowerCase();
      let source: "youtube" | "telegram" | "spotify" | "media" = "media";
      if (appLower.includes("telegram")) source = "telegram";
      else if (appLower.includes("youtube") || titleLower.includes("youtube")) source = "youtube";
      else if (appLower.includes("spotify")) source = "spotify";

      useRuntime.getState().showIslandBanner({
        source,
        title: r.title,
        body: r.artist || (source === "youtube" ? "YouTube" : source === "telegram" ? "Telegram Audio" : "Music"),
        actionTab: "music",
        durationMs: 4200,
      });
    }
  } else if (cur.source === "native") {
    useRuntime.setState({ music: { source: null, title: "", artist: "", playing: false, position: 0, duration: 0, canControl: false } });
  }
}
