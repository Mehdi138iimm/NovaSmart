import { useState, useEffect } from "react";
import {
  Video,
  RefreshCw,
  ExternalLink,
  Play,
  Globe,
  Search,
  Film,
  Sparkles,
  Flame,
} from "lucide-react";
import { openExternalUrl } from "@/services/native";
import { openProviderSignIn } from "@/services/integrations";
import { useT, useLang } from "@/i18n";
import { useMail } from "@/stores/mail";

const ago = (ts: number, isFa: boolean) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return isFa ? "هم‌اکنون" : "Just now";
  if (s < 3600) return isFa ? `${Math.floor(s / 60)} دقیقه پیش` : `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return isFa ? `${Math.floor(s / 3600)} ساعت پیش` : `${Math.floor(s / 3600)}h ago`;
  return isFa ? `${Math.floor(s / 86400)} روز پیش` : `${Math.floor(s / 86400)}d ago`;
};

const POPULAR_CHANNELS = [
  { label: "MKBHD", handle: "@MKBHD" },
  { label: "MrBeast", handle: "@MrBeast" },
  { label: "Fireship", handle: "@Fireship" },
  { label: "Veritasium", handle: "@veritasium" },
];

export default function MailView() {
  const t = useT();
  const lang = useLang();
  const isFa = lang === "fa";

  const {
    youtubeFeed,
    currentYouTubeChannel,
    syncing,
    syncYouTube,
  } = useMail();

  const [channelInput, setChannelInput] = useState(currentYouTubeChannel || "@MKBHD");
  const [filterType, setFilterType] = useState<"all" | "shorts" | "videos">("all");
  const [isSyncing, setIsSyncing] = useState(false);

  // Initial feed load
  useEffect(() => {
    if (youtubeFeed.length === 0) {
      syncYouTube(channelInput || "@MKBHD");
    }
  }, []);

  const handleFetchChannel = async (targetHandle?: string) => {
    const handle = targetHandle || channelInput;
    if (!handle.trim()) return;
    setIsSyncing(true);
    await syncYouTube(handle.trim());
    setIsSyncing(false);
  };

  // Filtered videos
  const filteredVideos = youtubeFeed.filter((v) => {
    const isShort = v.duration === "Shorts";
    if (filterType === "shorts" && !isShort) return false;
    if (filterType === "videos" && isShort) return false;
    return true;
  });

  return (
    <div className="relative flex h-full flex-col gap-2.5">
      {/* Top Header & Search Bar */}
      <div className="surface flex flex-wrap items-center justify-between gap-2 px-3 py-2" style={{ borderRadius: 18 }}>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#ff0000] text-white shadow-sm">
            <Video size={14} />
          </div>
          <div>
            <div className="text-[12.5px] font-bold" style={{ color: "var(--fg)" }}>{t("YouTube Hub")}</div>
            <div className="faint text-[10px]">
              {isFa ? "دریافت و پخش جدیدترین ویدیوها و شورت‌های کانال‌ها" : "Fetch and watch latest videos & Shorts"}
            </div>
          </div>
        </div>

        {/* Channel Handle Input & Actions */}
        <div className="flex items-center gap-1.5">
          <div className="surface flex h-7 items-center gap-1.5 rounded-xl px-2.5" style={{ width: 160 }}>
            <Search size={12} className="muted" />
            <input
              className="w-full bg-transparent text-[11px] outline-none placeholder:text-[var(--fg-faint)]"
              style={{ color: "var(--fg)" }}
              placeholder={isFa ? "@handle یا نام کانال..." : "@handle or channel..."}
              value={channelInput}
              onChange={(e) => setChannelInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleFetchChannel();
              }}
            />
          </div>

          <button
            onClick={() => handleFetchChannel()}
            disabled={isSyncing || syncing || !channelInput.trim()}
            className="btn !h-7 !px-2.5 text-[11px] font-semibold !bg-[#ff0000] !text-white hover:opacity-90 active:scale-95"
          >
            <RefreshCw size={11} className={isSyncing || syncing ? "animate-spin" : ""} />
            <span>{t("Fetch Videos")}</span>
          </button>

          <button
            onClick={() => openProviderSignIn("youtube")}
            className="btn !h-7 !px-2 text-[10.5px]"
            title={isFa ? "ورود به حساب کاربری یوتیوب در مرورگر" : "Sign in to YouTube account in browser"}
          >
            <Globe size={11} />
            <span>{t("Sign in with Account")}</span>
          </button>
        </div>
      </div>

      {/* Quick Channel Presets & Video Type Filters */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setFilterType("all")}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${
              filterType === "all" ? "bg-[var(--surface-2)] text-[var(--fg)]" : "muted hover:text-[var(--fg)]"
            }`}
          >
            <Sparkles size={11} />
            <span>{t("All")}</span>
          </button>

          <button
            onClick={() => setFilterType("videos")}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${
              filterType === "videos" ? "bg-[var(--surface-2)] text-[var(--fg)]" : "muted hover:text-[var(--fg)]"
            }`}
          >
            <Film size={11} />
            <span>{t("Full Videos")}</span>
          </button>

          <button
            onClick={() => setFilterType("shorts")}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${
              filterType === "shorts" ? "bg-[#ff0000]/20 text-[#ff4d4d]" : "muted hover:text-[var(--fg)]"
            }`}
          >
            <Flame size={11} />
            <span>{t("Shorts")}</span>
          </button>
        </div>

        {/* Quick Channel Chips */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] faint">{t("Quick Channels")}:</span>
          {POPULAR_CHANNELS.map((ch) => (
            <button
              key={ch.handle}
              onClick={() => {
                setChannelInput(ch.handle);
                handleFetchChannel(ch.handle);
              }}
              className={`rounded-lg px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                channelInput === ch.handle ? "bg-[#ff0000] text-white" : "bg-[var(--surface)] text-[var(--fg-dim)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)]"
              }`}
            >
              {ch.label}
            </button>
          ))}
        </div>
      </div>

      {/* Video Feed Cards List */}
      <div className="scroll min-h-0 flex-1 space-y-2 pr-0.5">
        {filteredVideos.length === 0 ? (
          <div className="flex h-44 flex-col items-center justify-center gap-2 text-center faint">
            <Video size={32} />
            <div className="text-[12px]">
              {isSyncing
                ? (isFa ? "در حال دریافت ویدیوهای کانال..." : "Fetching channel videos...")
                : t("No videos found. Enter a channel name to load videos.")}
            </div>
          </div>
        ) : (
          filteredVideos.map((v) => (
            <div
              key={v.id}
              className="surface flex items-center gap-3 p-2.5 transition-all hover:bg-[var(--surface-2)]"
              style={{ borderRadius: 18 }}
            >
              {/* Thumbnail with Play Hover Overlay */}
              <div
                className="relative shrink-0 cursor-pointer overflow-hidden rounded-xl"
                onClick={() => openExternalUrl(v.videoUrl)}
              >
                <img
                  src={v.thumbnail}
                  alt={v.videoTitle}
                  className="h-16 w-24 object-cover ring-1 ring-[var(--line)]"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                  <Play size={20} className="fill-white text-white" />
                </div>
              </div>

              {/* Video Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10.5px] font-bold text-[#ff4d4d]">{v.channelTitle}</span>
                  <span className="text-[9px] faint">· YouTube</span>
                </div>
                <div className="truncate text-[12px] font-medium leading-snug" style={{ color: "var(--fg)" }} dir="auto">
                  {v.videoTitle}
                </div>
                <div className="mt-1 flex items-center gap-2 text-[10px] faint">
                  <span>{v.views}</span>
                  <span>·</span>
                  <span>{ago(v.publishedAt, isFa)}</span>
                  <span>·</span>
                  <span
                    className={`rounded px-1.5 py-0.2 font-mono font-bold ${
                      v.duration === "Shorts"
                        ? "bg-[#ff0000]/20 text-[#ff4d4d]"
                        : "bg-[var(--surface-2)] text-[var(--fg-dim)]"
                    }`}
                  >
                    {v.duration}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => openExternalUrl(v.videoUrl)}
                className="btn !h-7 !px-2.5 text-[11px] font-semibold"
                title={t("Watch on YouTube")}
              >
                <ExternalLink size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
