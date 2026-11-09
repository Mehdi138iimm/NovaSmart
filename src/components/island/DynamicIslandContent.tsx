import { memo } from "react";
import { motion } from "framer-motion";
import { Bell, Calendar, Sparkles, Timer, X, ArrowUpRight } from "lucide-react";
import { useRuntime, type IslandBanner } from "@/stores/runtime";
import { useT } from "@/i18n";
import type { TabId } from "@/types";

// Authentic Service Badges
export function ServiceBadge({ source, size = 26 }: { source: IslandBanner["source"]; size?: number }) {
  if (source === "youtube") {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-full shadow-sm"
        style={{ width: size, height: size, background: "#ff0000", color: "#fff" }}
      >
        <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      </div>
    );
  }

  if (source === "telegram") {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-full shadow-sm"
        style={{ width: size, height: size, background: "linear-gradient(135deg, #2AABEE, #229ED9)", color: "#fff" }}
      >
        <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      </div>
    );
  }

  if (source === "spotify") {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-full shadow-sm"
        style={{ width: size, height: size, background: "#1DB954", color: "#000" }}
      >
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.498 17.306a.753.753 0 0 1-1.037.249c-2.84-1.735-6.415-2.128-10.627-1.166a.75.75 0 0 1-.334-1.463c4.608-1.053 8.563-.61 11.75 1.343.348.213.46.669.248 1.037zm1.467-3.26a.94.94 0 0 1-1.294.312c-3.25-1.998-8.204-2.578-12.049-1.411a.938.938 0 1 1-.546-1.794c4.393-1.334 9.855-.688 13.577 1.599a.94.94 0 0 1 .312 1.294zm.126-3.41c-3.898-2.315-10.327-2.528-14.05-1.397a1.125 1.125 0 0 1-.652-2.155c4.275-1.298 11.378-1.045 15.86 1.618a1.125 1.125 0 0 1-1.158 1.934z" />
        </svg>
      </div>
    );
  }

  if (source === "ai") {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-full shadow-sm"
        style={{ width: size, height: size, background: "linear-gradient(135deg, #a855f7, #6366f1)", color: "#fff" }}
      >
        <Sparkles size={size * 0.55} />
      </div>
    );
  }

  if (source === "focus") {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-full shadow-sm"
        style={{ width: size, height: size, background: "#8b5cf6", color: "#fff" }}
      >
        <Timer size={size * 0.55} />
      </div>
    );
  }

  if (source === "agenda") {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-full shadow-sm"
        style={{ width: size, height: size, background: "#3b82f6", color: "#fff" }}
      >
        <Calendar size={size * 0.55} />
      </div>
    );
  }

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full shadow-sm"
      style={{ width: size, height: size, background: "var(--accent)", color: "#000" }}
    >
      <Bell size={size * 0.55} />
    </div>
  );
}

// 4-Bar Animated Equalizer Visualizer (Dynamic Island style)
export const AudioEqualizer = memo(function AudioEqualizer({ color = "var(--accent)" }: { color?: string }) {
  return (
    <div className="flex items-end justify-center gap-[2.5px] px-1 py-1" style={{ height: 16 }}>
      {[0.45, 0.85, 0.6, 1.0].map((h, i) => (
        <motion.span
          key={i}
          className="w-[2.5px] rounded-full"
          style={{ background: color, minHeight: 3 }}
          animate={{
            height: [4, 14 * h, 6, 15 * (1.1 - h * 0.3), 4],
          }}
          transition={{
            duration: 0.7 + i * 0.12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
});

// Compact Live Activity Pill Content (Now Playing Music / YouTube / Telegram audio)
export const DynamicIslandLiveActivity = memo(function DynamicIslandLiveActivity({ onOpen }: { onOpen: () => void }) {
  const music = useRuntime((s) => s.music);
  const appLower = (music.app || "").toLowerCase();
  const titleLower = (music.title || "").toLowerCase();

  let source: IslandBanner["source"] = "media";
  if (appLower.includes("telegram")) source = "telegram";
  else if (appLower.includes("youtube") || titleLower.includes("youtube")) source = "youtube";
  else if (appLower.includes("spotify")) source = "spotify";

  return (
    <div
      onClick={onOpen}
      className="flex h-full w-full items-center justify-between gap-2 px-3 text-white cursor-pointer select-none"
    >
      {/* Left: Album Art or App Badge */}
      <div className="flex shrink-0 items-center gap-2">
        {music.art ? (
          <img
            src={music.art}
            alt="Art"
            className="h-6 w-6 rounded-full object-cover shadow-sm ring-1 ring-white/10"
          />
        ) : (
          <ServiceBadge source={source} size={22} />
        )}
      </div>

      {/* Middle: Track Title */}
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="truncate text-[11.5px] font-medium leading-none text-white/95" dir="auto">
          {music.title || "Playing"}
        </div>
        {music.artist && (
          <div className="truncate text-[9.5px] text-white/60 leading-tight mt-0.5" dir="auto">
            {music.artist}
          </div>
        )}
      </div>

      {/* Right: Audio Waveform Equalizer */}
      <div className="flex shrink-0 items-center">
        <AudioEqualizer color={source === "spotify" ? "#1DB954" : source === "youtube" ? "#ff4d4d" : "var(--accent)"} />
      </div>
    </div>
  );
});

// Interactive Dynamic Island Notification Banner
export const DynamicIslandNotificationBanner = memo(function DynamicIslandNotificationBanner({
  banner,
  onOpenTab,
  onDismiss,
}: {
  banner: IslandBanner;
  onOpenTab: (tab: TabId) => void;
  onDismiss: () => void;
}) {
  const t = useT();

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (banner.actionTab) {
      onOpenTab(banner.actionTab);
    } else {
      useRuntime.getState().setOpen(true, "click");
    }
    useRuntime.getState().dismissIslandBanner();
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss();
  };

  const getSourceLabel = () => {
    switch (banner.source) {
      case "youtube": return "YouTube";
      case "telegram": return "Telegram";
      case "spotify": return "Spotify";
      case "ai": return "NOVASMART AI";
      case "focus": return "Focus Session";
      case "agenda": return "Agenda";
      default: return "NOVASMART";
    }
  };

  return (
    <div className="flex h-full w-full items-center justify-between gap-2.5 px-3 py-1 text-white select-none">
      {/* Left: App Logo / Service Badge */}
      <div className="flex shrink-0 items-center">
        <ServiceBadge source={banner.source} size={28} />
      </div>

      {/* Middle: Content */}
      <div className="min-w-0 flex-1 overflow-hidden text-start">
        <div className="flex items-center gap-1.5">
          <span className="text-[10.5px] font-semibold text-white/60 uppercase tracking-wider">
            {getSourceLabel()}
          </span>
          <span className="text-[9px] text-white/40">· now</span>
        </div>
        <div className="truncate text-[12px] font-medium leading-tight text-white" dir="auto">
          {banner.title}
        </div>
        {banner.body && (
          <div className="truncate text-[10.5px] text-white/70 leading-tight mt-0.5" dir="auto">
            {banner.body}
          </div>
        )}
      </div>

      {/* Right: Quick Interactive Actions */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={handleAction}
          className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold transition-all hover:scale-105 active:scale-95"
          style={{ background: "rgba(255, 255, 255, 0.16)", color: "#fff" }}
        >
          <span>{t("Open") || "مشاهده"}</span>
          <ArrowUpRight size={12} />
        </button>
        <button
          onClick={handleClose}
          className="flex h-6 w-6 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
          aria-label="Dismiss"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
});
