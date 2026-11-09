import { memo } from "react";
import { Bell, Cpu, MoreHorizontal, WifiOff } from "lucide-react";
import { Eyes } from "@/components/eyes/Eyes";
import { Tip } from "@/components/ui/controls";
import { useEyeMood } from "@/hooks/useEyeMood";
import { fmtClock, fmtDate, useClock } from "@/hooks/useClock";
import { num, useLang, useT } from "@/i18n";
import { useData } from "@/stores/data";
import { fmtTime, useRuntime } from "@/stores/runtime";
import { useSettings } from "@/stores/settings";
import { PROVIDER_META, resolveProvider } from "@/services/ai";

const SystemChip = memo(function SystemChip() {
  const sys = useRuntime((s) => s.sys);
  const lang = useLang();
  const t = useT();
  if (!sys.online) return <span className="chip"><WifiOff size={12} /> {t("Offline")}</span>;
  if (sys.native)
    return (
      <span className="chip" title="CPU / RAM">
        <Cpu size={12} />
        <span dir="ltr">{num(Math.round(sys.cpu ?? 0), lang)}% · {num(Math.round(((sys.ramUsed ?? 0) / (sys.ramTotal || 1)) * 100), lang)}%</span>
      </span>
    );
  return <span className="chip" title="Native system metrics require the desktop app"><Cpu size={12} /> Web</span>;
});

export const Header = memo(function Header({ onToggle, onMenu }: { onToggle: () => void; onMenu: () => void }) {
  const now = useClock();
  const lang = useLang();
  const t = useT();
  const mood = useEyeMood();
  const unread = useData((s) => s.notifs.reduce((n, x) => n + (x.read ? 0 : 1), 0));
  const focus = useRuntime((s) => s.focus);
  const music = useRuntime((s) => s.music);
  const aiBusy = useRuntime((s) => s.aiBusy);
  useSettings((s) => s.providers);
  useSettings((s) => s.activeProvider);
  const setTab = useRuntime((s) => s.setTab);
  const pid = resolveProvider();
  const connected = !!pid;

  const activity =
    focus.status !== "idle" ? `${t("Focus")} ${fmtTime(focus.remainingSec)}` : aiBusy ? t("Thinking") : music.playing ? t("Music") : t("Idle");

  return (
    <div className="relative flex h-[56px] shrink-0 items-center justify-between px-5">
      <div className="flex items-baseline gap-3">
        <span className="text-[22px] font-semibold leading-none tracking-tight tabular-nums" dir="ltr">{fmtClock(now, lang)}</span>
        <span className="muted text-[12px]">{fmtDate(now, lang)}</span>
      </div>

      <Tip label={t("Fold In")}>
        <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className="absolute left-1/2 top-1/2 flex h-8 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black shadow-sm transition-transform hover:scale-105 active:scale-95 cursor-pointer" aria-label="Fold in">
          <Eyes mood={mood} scale={0.75} />
        </button>
      </Tip>

      <div className="flex items-center gap-1.5">
        <SystemChip />
        <span className="chip" title={pid ? PROVIDER_META[pid].name : t("Not connected")}>
          <span className={`h-1.5 w-1.5 rounded-full ${aiBusy ? "pulse-dot" : ""}`} style={{ background: connected && pid ? "#4ade80" : "var(--fg-faint)" }} />
          {pid ? PROVIDER_META[pid].name : "AI"}
        </span>
        <span className="chip hidden min-[720px]:inline-flex">{activity}</span>
        <button className="icon-btn relative" onClick={() => setTab("notifications")} aria-label={t("Notifications")}>
          <Bell size={16} />
          {unread > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full px-1 text-[9px] font-bold" style={{ background: "var(--accent)", color: "#0a0a0a" }}>
              {num(Math.min(unread, 99), lang)}
            </span>
          )}
        </button>
        <button className="icon-btn" onClick={onMenu} aria-label={t("Quick Control")}>
          <MoreHorizontal size={18} />
        </button>
      </div>
    </div>
  );
});
