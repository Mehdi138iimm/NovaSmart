import { memo, useEffect, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { AppWindow, CalendarPlus, FilePlus, LayoutGrid, Music2, Plus, StickyNote, Volume2, VolumeX } from "lucide-react";
import { Tip, useOutside } from "@/components/ui/controls";
import { useT } from "@/i18n";
import { playSound } from "@/services/sound";
import { listAudioSessions, setAppVolume, setMusicVolume, setSystemVolume } from "@/services/media";
import { useData } from "@/stores/data";
import { useRuntime } from "@/stores/runtime";
import { useSettings } from "@/stores/settings";
import type { AudioSession } from "@/types";
import { TAB_META } from "./tabs";

function AddPop({ onClose }: { onClose: () => void }) {
  const t = useT();
  const setTab = useRuntime((s) => s.setTab);
  const addNote = useData((s) => s.addNote);
  const ref = useOutside(onClose, true);
  const items = [
    { label: t("New note"), icon: StickyNote, run: () => { addNote(); setTab("notes"); } },
    { label: t("Add") + " (Agenda)", icon: CalendarPlus, run: () => setTab("agenda") },
    { label: t("Files"), icon: FilePlus, run: () => setTab("files") },
    { label: t("Add Program (.exe)"), icon: AppWindow, run: () => setTab("apps") },
  ];
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.15 }}
      className="absolute bottom-[58px] start-4 z-40 w-[210px] rounded-[20px] p-1.5 shadow-2xl backdrop-blur-md" style={{ background: "var(--popup-bg)", border: "1px solid var(--popup-border)", color: "var(--fg)" }}>
      {items.map((i) => (
        <button key={i.label} onClick={() => { playSound("click"); i.run(); onClose(); }} className="flex w-full items-center gap-2.5 rounded-[14px] px-3 py-2 text-start text-[12.5px] transition-colors hover:bg-[var(--surface-2)]">
          <i.icon size={15} className="opacity-70" /> {i.label}
        </button>
      ))}
    </motion.div>
  );
}

function VolumePop({ onClose }: { onClose: () => void }) {
  const t = useT();
  const music = useRuntime((s) => s.music);
  const musicVolume = useRuntime((s) => s.musicVolume);
  const systemVolume = useRuntime((s) => s.systemVolume);
  const [sessions, setSessions] = useState<AudioSession[]>([]);
  const ref = useOutside(onClose, true);

  useEffect(() => {
    let alive = true;
    listAudioSessions().then((list) => {
      if (alive && list) setSessions(list);
    });
    return () => { alive = false; };
  }, []);

  const handleAppVol = (session: AudioSession, v: number) => {
    setSessions((prev) => prev.map((s) => (s.pid === session.pid ? { ...s, volume: v } : s)));
    setAppVolume(session.name, session.pid, v);
  };

  const handleMusicVol = (v: number) => {
    if (music.source === "local" || !music.app) {
      setMusicVolume(v);
    } else {
      setAppVolume(music.app, undefined, v);
    }
  };

  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.15 }}
      className="scroll absolute bottom-[58px] end-4 z-40 flex max-h-[320px] w-[260px] flex-col gap-2.5 overflow-y-auto rounded-[20px] p-3 shadow-2xl backdrop-blur-md" style={{ background: "var(--popup-bg)", border: "1px solid var(--popup-border)", color: "var(--fg)" }}>
      <div>
        <div className="mb-1 flex items-center justify-between text-[11px] opacity-70">
          <span className="flex items-center gap-1"><Music2 size={12} /> {music.app || t("Music")}</span>
          <span className="tabular-nums">{Math.round(musicVolume * 100)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="icon-btn !h-6 !w-6" onClick={() => { playSound("click"); handleMusicVol(musicVolume > 0 ? 0 : 0.8); }}>{musicVolume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}</button>
          <input type="range" min={0} max={1} step={0.01} value={musicVolume} onChange={(e) => handleMusicVol(+e.target.value)} aria-label="Music Volume" />
        </div>
      </div>

      <div className="h-px bg-[var(--line)]" />

      <div>
        <div className="mb-1 flex items-center justify-between text-[11px] opacity-70">
          <span className="flex items-center gap-1"><Volume2 size={12} /> {t("System Master")}</span>
          <span className="tabular-nums">{Math.round(systemVolume * 100)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="icon-btn !h-6 !w-6" onClick={() => { playSound("click"); setSystemVolume(systemVolume > 0 ? 0 : 0.7); }}>{systemVolume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}</button>
          <input type="range" min={0} max={1} step={0.01} value={systemVolume} onChange={(e) => setSystemVolume(+e.target.value)} aria-label="System Volume" />
        </div>
      </div>

      {sessions.length > 0 && (
        <>
          <div className="h-px bg-[var(--line)]" />
          <div className="text-[10px] font-semibold uppercase tracking-wider faint">{t("Apps Volume Mixer")}</div>
          <div className="space-y-2">
            {sessions.map((sess) => (
              <div key={sess.pid || sess.name}>
                <div className="mb-1 flex items-center justify-between text-[10.5px] opacity-75">
                  <span className="flex items-center gap-1 truncate"><AppWindow size={11} /> {sess.name}</span>
                  <span className="tabular-nums">{Math.round(sess.volume * 100)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="icon-btn !h-5 !w-5" onClick={() => { playSound("click"); handleAppVol(sess, sess.volume > 0 ? 0 : 0.8); }}>
                    {sess.volume === 0 ? <VolumeX size={12} /> : <Volume2 size={12} />}
                  </button>
                  <input type="range" min={0} max={1} step={0.01} value={sess.volume} onChange={(e) => handleAppVol(sess, +e.target.value)} aria-label={sess.name} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}

export const NavBar = memo(function NavBar() {
  const t = useT();
  const tab = useRuntime((s) => s.tab);
  const setTab = useRuntime((s) => s.setTab);
  const order = useSettings((s) => s.navOrder);
  const hidden = useSettings((s) => s.navHidden);
  const size = useSettings((s) => s.navIconSize);
  const gap = useSettings((s) => s.navGap);
  const showLabel = useSettings((s) => s.navShowLabel);
  const systemVolume = useRuntime((s) => s.systemVolume);
  const [pop, setPop] = useState<"add" | "vol" | null>(null);
  const tabs = order.filter((x) => !hidden.includes(x));

  return (
    <div className="relative flex h-[56px] shrink-0 items-center justify-between px-4">
      <div className="flex items-center gap-1">
        <Tip label={t("All Apps")}>
          <button className="icon-btn" onClick={() => { playSound("tab"); setTab("apps"); }} aria-label={t("All Apps")} style={tab === "apps" ? { color: "var(--accent)" } : undefined}><LayoutGrid size={16} /></button>
        </Tip>
        <Tip label={t("Add")}>
          <button className="icon-btn" onClick={() => { playSound("click"); setPop(pop === "add" ? null : "add"); }} aria-label={t("Add")}><Plus size={17} /></button>
        </Tip>
      </div>

      <LayoutGroup id="nav">
        <nav className="flex items-center rounded-full p-1" style={{ gap, background: "var(--surface)", border: "1px solid var(--line)" }}>
          {tabs.map((id) => {
            const { icon: Icon, label } = TAB_META[id];
            const active = tab === id;
            return (
              <Tip key={id} label={t(label)}>
                <button
                  onClick={() => setTab(id)}
                  aria-label={t(label)}
                  aria-current={active}
                  className="relative flex items-center justify-center rounded-full transition-colors duration-150"
                  style={{ height: size + 14, minWidth: size + 14, padding: active && showLabel ? "0 12px 0 10px" : 0, color: active ? "var(--accent)" : "var(--fg-dim)" }}
                >
                  {active && (
                    <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full" style={{ background: "rgba(var(--accent-rgb), 0.14)", boxShadow: "inset 0 0 0 1px rgba(var(--accent-rgb), 0.28)" }} transition={{ type: "spring", stiffness: 520, damping: 38 }} />
                  )}
                  <span className="relative flex items-center gap-1.5">
                    <Icon size={size} />
                    <AnimatePresence initial={false}>
                      {active && showLabel && (
                        <motion.span initial={{ width: 0, opacity: 0 }} animate={{ width: "auto", opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden whitespace-nowrap text-[12px] font-semibold">
                          {t(label)}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                </button>
              </Tip>
            );
          })}
        </nav>
      </LayoutGroup>

      <div className="flex items-center">
        <Tip label={t("Volume")}>
          <button className="icon-btn" onClick={() => { playSound("click"); setPop(pop === "vol" ? null : "vol"); }} aria-label={t("Volume")}>{systemVolume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
        </Tip>
      </div>

      <AnimatePresence>
        {pop === "add" && <AddPop key="add" onClose={() => setPop(null)} />}
        {pop === "vol" && <VolumePop key="vol" onClose={() => setPop(null)} />}
      </AnimatePresence>
    </div>
  );
});
