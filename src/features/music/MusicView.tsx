import { Disc3, FolderPlus, Music2, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { EmptyState } from "@/components/ui/controls";
import { AudioPicker } from "@/features/home/Home";
import { useServicesTick } from "@/features/home/useTick";
import { useT } from "@/i18n";
import { mediaControl, mediaSeek, setAppVolume, setMusicVolume } from "@/services/media";
import { fmtTime, useRuntime } from "@/stores/runtime";

export default function MusicView() {
  const t = useT();
  const m = useRuntime((s) => s.music);
  const musicVolume = useRuntime((s) => s.musicVolume);
  const tick = useServicesTick(m.playing && m.source === "native");
  const pos = m.source === "native" && m.playing ? Math.min(m.duration || Infinity, m.position + tick) : m.position;

  const isLocal = m.source === "local";
  const changeVolume = (v: number) => {
    if (isLocal) {
      setMusicVolume(v);
    } else {
      setAppVolume(m.app || "", undefined, v);
    }
  };

  if (!m.title)
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <EmptyState icon={Music2} title={t("Nothing playing")} hint={t("NOVASMART reads the Windows media session (Spotify, browsers, media players). You can also play local audio files.")} />
        <AudioPicker>{(open) => <button className="btn btn-accent -mt-4" onClick={open}><FolderPlus size={14} /> {t("Play local files")}</button>}</AudioPicker>
      </div>
    );

  return (
    <div className="flex h-full items-center gap-7 px-3">
      <div className="flex aspect-square h-full max-h-[260px] shrink-0 items-center justify-center overflow-hidden rounded-[28px]" style={{ background: "var(--surface-2)", boxShadow: "0 18px 40px rgba(0,0,0,.35)" }}>
        {m.art ? <img src={m.art} alt="" className="h-full w-full object-cover" /> : <Disc3 size={72} className={`faint ${m.playing ? "spin" : ""}`} style={{ animationDuration: "6s" }} />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-4">
        <div>
          <div className="faint text-[10.5px] font-semibold uppercase tracking-wider">{m.playing ? t("Playing") : t("Paused")}{m.app ? ` · ${m.app}` : ""}</div>
          <div className="mt-1 truncate text-[26px] font-semibold leading-tight" dir="auto">{m.title}</div>
          <div className="muted truncate text-[14px]" dir="auto">{m.artist}</div>
        </div>
        <div dir="ltr">
          <input type="range" min={0} max={Math.max(1, m.duration)} step={1} value={pos} disabled={!m.duration || !m.canControl} onChange={(e) => mediaSeek(+e.target.value)} aria-label="Seek" />
          <div className="muted mt-1 flex justify-between text-[11px] tabular-nums"><span>{fmtTime(pos)}</span><span>{m.duration ? `-${fmtTime(Math.max(0, m.duration - pos))}` : "--:--"}</span></div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3" dir="ltr">
            <button className="icon-btn !h-10 !w-10" onClick={() => mediaControl("prev")} aria-label="Previous"><SkipBack size={21} /></button>
            <button className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "var(--fg)", color: "var(--panel, #000)" }} onClick={() => mediaControl("toggle")} aria-label={m.playing ? t("Pause") : t("Play")}>
              {m.playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
            </button>
            <button className="icon-btn !h-10 !w-10" onClick={() => mediaControl("next")} aria-label="Next"><SkipForward size={21} /></button>
          </div>
          <div className="flex w-36 items-center gap-2">
            <button className="icon-btn !h-7 !w-7" onClick={() => changeVolume(musicVolume > 0 ? 0 : 0.8)} aria-label="Mute">
              {musicVolume === 0 ? <VolumeX size={15} className="muted" /> : <Volume2 size={15} className="muted" />}
            </button>
            <input type="range" min={0} max={1} step={0.01} value={musicVolume} onChange={(e) => changeVolume(+e.target.value)} aria-label="Music Volume" title={m.app ? `${m.app} Volume` : "Music Volume"} />
          </div>
        </div>
        <AudioPicker>{(open) => <button className="btn w-fit !h-7 !text-[11.5px]" onClick={open}><FolderPlus size={13} /> {t("Add local files")}</button>}</AudioPicker>
      </div>
    </div>
  );
}
