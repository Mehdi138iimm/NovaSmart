import { Bell, BellOff, CalendarClock, CheckCheck, CircleAlert, ShieldQuestion, Sparkles, Timer, Trash2, Send, Video, Music, type LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/controls";
import { useT } from "@/i18n";
import { useData } from "@/stores/data";
import { useRuntime } from "@/stores/runtime";
import { notify } from "@/services/notify";
import type { NotifType, TabId } from "@/types";

const META: Record<NotifType, { icon: LucideIcon; color: string; tab: TabId | null }> = {
  info: { icon: Bell, color: "var(--fg-dim)", tab: null },
  ai: { icon: Sparkles, color: "#c084fc", tab: "ai" },
  approval: { icon: ShieldQuestion, color: "#facc15", tab: "ai" },
  focus: { icon: Timer, color: "#8b5cf6", tab: "focus" },
  error: { icon: CircleAlert, color: "#f87171", tab: null },
  agenda: { icon: CalendarClock, color: "#60a5fa", tab: "agenda" },
};

const ago = (ts: number) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

export default function NotificationsView() {
  const t = useT();
  const list = useData((s) => s.notifs);
  const markRead = useData((s) => s.markRead);
  const clear = useData((s) => s.clearNotifs);
  const setTab = useRuntime((s) => s.setTab);
  const unread = list.filter((n) => !n.read).length;

  const testTelegram = () => {
    notify("info", "Telegram · Sarah", "Hey! Check out this new update 🚀");
  };

  const testYoutube = () => {
    notify("info", "YouTube · MKBHD", "Apple Dynamic Island on Desktop Review!");
  };

  const testSpotify = () => {
    notify("info", "Spotify · The Weeknd", "Blinding Lights · After Hours");
  };

  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="label">{t("Notifications")} · {unread}</span>
        <div className="flex gap-2">
          <button className="btn" onClick={() => markRead()} disabled={!unread}><CheckCheck size={13} /> {t("Mark all read")}</button>
          <button className="btn btn-danger" onClick={clear} disabled={!list.length}><Trash2 size={13} /> {t("Clear all")}</button>
        </div>
      </div>

      {/* Dynamic Island Quick Test Bar */}
      <div className="surface flex items-center justify-between gap-2 px-3 py-2" style={{ borderRadius: 16 }}>
        <span className="text-[11.5px] font-medium muted">{t("Dynamic Island Test:")}</span>
        <div className="flex gap-1.5">
          <button className="btn !h-7 !px-2 text-[11px] !bg-[#2AABEE]/20 hover:!bg-[#2AABEE]/30 !text-[#2AABEE]" onClick={testTelegram}>
            <Send size={11} /> Telegram
          </button>
          <button className="btn !h-7 !px-2 text-[11px] !bg-[#ff0000]/20 hover:!bg-[#ff0000]/30 !text-[#ff4d4d]" onClick={testYoutube}>
            <Video size={12} /> YouTube
          </button>
          <button className="btn !h-7 !px-2 text-[11px] !bg-[#1DB954]/20 hover:!bg-[#1DB954]/30 !text-[#1DB954]" onClick={testSpotify}>
            <Music size={11} /> Music
          </button>
        </div>
      </div>

      {list.length === 0 ? <EmptyState icon={BellOff} title={t("You're all caught up")} hint={t("AI completions, approval requests, focus sessions and errors will show up here.")} /> : (
        <div className="scroll min-h-0 flex-1 space-y-1.5">
          {list.map((n) => {
            const m = META[n.type];
            return (
              <button key={n.id} className="surface flex w-full items-center gap-3 px-3 py-2.5 text-start transition-colors hover:bg-[var(--surface-2)]" style={{ borderRadius: 18, opacity: n.read ? 0.6 : 1 }}
                onClick={() => { markRead(n.id); if (m.tab) setTab(m.tab); }}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--surface-2)", color: m.color }}><m.icon size={15} /></span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold" dir="auto">{n.title}</div>
                  {n.body && <div className="muted truncate text-[11.5px]" dir="auto">{n.body}</div>}
                </div>
                <span className="faint text-[11px]">{ago(n.ts)}</span>
                {!n.read && <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
