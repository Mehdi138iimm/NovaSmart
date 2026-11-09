import { motion } from "framer-motion";
import { ChevronsUp, Heart, LayoutGrid, Music2, Palette, Power, Settings, Volume2, VolumeX } from "lucide-react";
import { useOutside } from "@/components/ui/controls";
import { useT } from "@/i18n";
import { playSound } from "@/services/sound";
import { invoke, isTauri, openExternalUrl } from "@/services/native";
import { setMusicVolume, setSystemVolume } from "@/services/media";
import { notify } from "@/services/notify";
import { useRuntime } from "@/stores/runtime";
import type { TabId } from "@/types";

export function QuickMenu({ onClose }: { onClose: () => void }) {
  const t = useT();
  const musicVolume = useRuntime((s) => s.musicVolume);
  const systemVolume = useRuntime((s) => s.systemVolume);
  const setTab = useRuntime((s) => s.setTab);
  const ref = useOutside(onClose, true);
  const go = (tab: TabId) => { playSound("tab"); setTab(tab); onClose(); };

  const openDonate = () => {
    playSound("click");
    openExternalUrl("https://daramet.com/novasmart");
  };

  const Tile = ({ icon: Icon, label, onClick, danger, accent }: { icon: typeof Power; label: string; onClick: (e: React.MouseEvent) => void; danger?: boolean; accent?: boolean }) => (
    <button onClick={(e) => { playSound("click"); onClick(e); }} className="surface flex h-[58px] flex-col items-center justify-center gap-1 text-[11.5px] font-medium transition-colors hover:bg-[var(--surface-2)] cursor-pointer" style={{ borderRadius: 16, color: danger ? "#ff6b6b" : accent ? "var(--accent)" : "var(--fg)" }}>
      <Icon size={17} />
      <span>{label}</span>
    </button>
  );

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.94, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.16 }}
      style={{ transformOrigin: "top right", background: "var(--popup-bg)", border: "1px solid var(--popup-border)", borderRadius: 24, boxShadow: "0 22px 50px rgba(0,0,0,0.25)" }}
      className="absolute end-4 top-[52px] z-40 w-[254px] p-2.5 backdrop-blur-md"
    >
      <div className="surface mb-2 flex flex-col gap-2 px-3 py-2.5" style={{ borderRadius: 16 }}>
        <div>
          <div className="mb-1 flex items-center justify-between text-[10.5px] opacity-70">
            <span className="flex items-center gap-1"><Music2 size={11} /> {t("Music")}</span>
            <span className="tabular-nums">{Math.round(musicVolume * 100)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="icon-btn !h-6 !w-6" onClick={() => { playSound("click"); setMusicVolume(musicVolume > 0 ? 0 : 0.8); }} aria-label="Mute Music">
              {musicVolume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <input type="range" min={0} max={1} step={0.01} value={musicVolume} onChange={(e) => setMusicVolume(+e.target.value)} aria-label="Music Volume" />
          </div>
        </div>
        <div className="h-px bg-[var(--line)]" />
        <div>
          <div className="mb-1 flex items-center justify-between text-[10.5px] opacity-70">
            <span className="flex items-center gap-1"><Volume2 size={11} /> {t("System")}</span>
            <span className="tabular-nums">{Math.round(systemVolume * 100)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="icon-btn !h-6 !w-6" onClick={() => { playSound("click"); setSystemVolume(systemVolume > 0 ? 0 : 0.7); }} aria-label="Mute System">
              {systemVolume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <input type="range" min={0} max={1} step={0.01} value={systemVolume} onChange={(e) => setSystemVolume(+e.target.value)} aria-label="System Volume" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Tile icon={LayoutGrid} label={t("All Apps")} onClick={() => go("apps")} />
        <Tile icon={Palette} label={t("Customize")} onClick={() => go("customize")} />
        <Tile icon={Settings} label={t("Settings")} onClick={() => go("settings")} />
        <Tile icon={Heart} label={t("Support")} accent onClick={openDonate} />
        <Tile icon={ChevronsUp} label={t("Fold In")} onClick={(e) => { e.stopPropagation(); onClose(); useRuntime.getState().close(); }} />
        <Tile
          icon={Power}
          label={t("Quit")}
          danger
          onClick={() => {
            if (isTauri) invoke("quit_app");
            else { onClose(); notify("info", "Quit is only available in the desktop app", "In the browser preview there is no process to exit."); }
          }}
        />
      </div>
    </motion.div>
  );
}
