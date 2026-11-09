import { Suspense, lazy, useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion, type Transition } from "framer-motion";
import { Eyes } from "@/components/eyes/Eyes";
import { DynamicIslandLiveActivity, DynamicIslandNotificationBanner } from "./DynamicIslandContent";
import { Header } from "./Header";
import { QuickMenu } from "./QuickMenu";
import { NavBar } from "@/components/navigation/NavBar";
import { useEyeMood } from "@/hooks/useEyeMood";
import { useIslandInteraction } from "@/hooks/useIslandInteraction";
import { useEffective } from "@/services/effective";
import { invoke, isTauri } from "@/services/native";
import { useRuntime } from "@/stores/runtime";
import { useSettings } from "@/stores/settings";
import type { TabId } from "@/types";

const views: Record<TabId, React.LazyExoticComponent<React.ComponentType>> = {
  home: lazy(() => import("@/features/home/Home")),
  ai: lazy(() => import("@/features/ai/AICenter")),
  music: lazy(() => import("@/features/music/MusicView")),
  notes: lazy(() => import("@/features/notes/NotesView")),
  focus: lazy(() => import("@/features/focus/FocusView")),
  modes: lazy(() => import("@/features/modes/ModesView")),
  files: lazy(() => import("@/features/files/FilesView")),
  clipboard: lazy(() => import("@/features/clipboard/ClipboardView")),
  agenda: lazy(() => import("@/features/agenda/AgendaView")),
  mail: lazy(() => import("@/features/mail/MailView")),
  notifications: lazy(() => import("@/features/notifications/NotificationsView")),
  settings: lazy(() => import("@/features/settings/SettingsView")),
  customize: lazy(() => import("@/features/settings/CustomizeView")),
  apps: lazy(() => import("@/features/apps/AppsView")),
};

const PAD = 28; // room for the shadow around the island inside the native window

const hexRgb = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

function ViewHost() {
  const tab = useRuntime((s) => s.tab);
  const View = views[tab];
  return (
    <div className="relative min-h-0 flex-1">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          className="scroll absolute inset-0 px-4 pb-1 pt-1"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          <Suspense fallback={null}>
            <View />
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function Island() {
  const open = useRuntime((s) => s.open);
  const quick = useRuntime((s) => s.quickMenu);
  const islandBanner = useRuntime((s) => s.islandBanner);
  const music = useRuntime((s) => s.music);
  const setTab = useRuntime((s) => s.setTab);
  const dismissIslandBanner = useRuntime((s) => s.dismissIslandBanner);
  const mood = useEyeMood();
  const eff = useEffective();
  const { onPointerEnter, onPointerLeave, onClick, toggle } = useIslandInteraction();

  const S = useSettings;
  const islandW = S((s) => s.islandW), islandH = S((s) => s.islandH), top = S((s) => s.islandTop), iR = S((s) => s.islandRadius);
  const panelW = S((s) => s.panelW), panelH = S((s) => s.panelH), pR = S((s) => s.panelRadius);
  const opacity = S((s) => s.panelOpacity), blur = S((s) => s.panelBlur);
  const panelColor = S((s) => s.panelColor), bgStyle = S((s) => s.bgStyle), intensity = S((s) => s.animationIntensity);
  const quality = S((s) => s.animationQuality), lang = S((s) => s.lang), monitor = S((s) => s.monitor);
  const colorMode = S((s) => s.colorMode);

  const screenW = isTauri ? window.screen.availWidth : window.innerWidth;
  const screenH = isTauri ? window.screen.availHeight : window.innerHeight;
  const W = Math.min(panelW, screenW - PAD * 2);
  const H = Math.min(panelH, screenH - top - PAD);
  const light = document.documentElement.classList.contains("light") && open;

  const isBannerActive = !open && !!islandBanner;
  const isMusicActive = !open && !islandBanner && music.playing && !!(music.title || music.artist);

  const closedW = isBannerActive
    ? Math.min(380, screenW - PAD * 2)
    : isMusicActive
    ? Math.min(240, screenW - PAD * 2)
    : islandW;

  const closedH = isBannerActive
    ? Math.max(50, islandH + 8)
    : islandH;

  const currentW = open ? W : closedW;
  const currentH = open ? H : closedH;

  // Native: window is exactly the island rect (+ shadow padding). Grow before animating, shrink after.
  const shrinkT = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (!isTauri) return;
    clearTimeout(shrinkT.current);
    const send = (w: number, h: number, pad: number) => invoke("set_island_layout", { width: Math.round(w + pad * 2), height: Math.round(h + top + pad), monitor });
    if (open) {
      send(W, H, PAD);
    } else {
      const pad = isBannerActive || isMusicActive ? 14 : 8;
      send(closedW, closedH, pad);
    }
    return () => clearTimeout(shrinkT.current);
  }, [open, W, H, closedW, closedH, isBannerActive, isMusicActive, top, monitor]);

  const transition: Transition = useMemo(() => {
    if (intensity <= 0.05) return { duration: 0.01 };
    if (quality === "low" || eff.lowResource) return { type: "tween", duration: open ? 0.25 : 0.2, ease: "easeOut" };
    const k = 0.6 + intensity * 0.6;
    const spring = open
      ? { type: "spring" as const, stiffness: 300 * k, damping: 27, mass: 0.9 }
      : { type: "spring" as const, stiffness: 380 * k, damping: 32, mass: 0.85 };
    return {
      ...spring,
      height: { ...spring, delay: open ? 0 : 0.02 },
      width: { ...spring, delay: open ? 0.02 : 0 },
    };
  }, [open, intensity, quality, eff.lowResource]);

  const [r, g, b] = hexRgb(light ? "#f6f6f8" : panelColor);
  const bg = open ? `rgba(${r}, ${g}, ${b}, ${bgStyle === "glass" ? Math.min(opacity, 0.78) : opacity})` : "rgba(0, 0, 0, 1)";
  const flat = top < 2;
  const topR = open ? (flat ? 0 : pR) : flat ? 0 : iR;
  const botR = open ? pR : iR;

  return (
    <div className="pointer-events-none fixed inset-x-0 flex justify-center" style={{ top }} dir={lang === "fa" ? "rtl" : "ltr"}>
      <motion.div
        className="ns-island pointer-events-auto relative overflow-hidden"
        initial={false}
        animate={{
          width: currentW,
          height: currentH,
          backgroundColor: bg,
          borderTopLeftRadius: topR, borderTopRightRadius: topR, borderBottomLeftRadius: botR, borderBottomRightRadius: botR,
          boxShadow: "none",
        }}
        transition={transition}
        style={{
          backdropFilter: blur > 0 && open ? `blur(${blur}px)` : undefined,
          cursor: open ? "default" : "pointer",
          ["--panel" as string]: panelColor,
          color: light ? "#111114" : undefined,
        }}
        data-color-mode={colorMode}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onClick={onClick}
        onDragStart={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Closed: Dynamic Island Modes (Interactive Notification Banner / Live Activity / Eyes) */}
        {!open && (
          <AnimatePresence mode="wait">
            {isBannerActive && islandBanner ? (
              <motion.div
                key={`banner-${islandBanner.id}`}
                className="absolute inset-0 flex items-center"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <DynamicIslandNotificationBanner
                  banner={islandBanner}
                  onOpenTab={(t) => {
                    setTab(t);
                    useRuntime.getState().setOpen(true, "click");
                  }}
                  onDismiss={dismissIslandBanner}
                />
              </motion.div>
            ) : isMusicActive ? (
              <motion.div
                key="live-activity"
                className="absolute inset-0 flex items-center"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <DynamicIslandLiveActivity
                  onOpen={() => {
                    setTab("music");
                    useRuntime.getState().setOpen(true, "click");
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="eyes"
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <Eyes mood={mood} scale={islandH / 34} />
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {bgStyle === "tinted" && open && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40" style={{ background: "radial-gradient(60% 100% at 50% 0%, rgba(var(--accent-rgb), 0.12), transparent)" }} />
        )}

        {/* Open: fixed-size content so nothing reflows while the shell animates */}
        <AnimatePresence>
          {open && (
            <motion.div
              key="content"
              className="absolute left-1/2 top-0 flex flex-col"
              style={{ width: W, height: H, x: "-50%" }}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.24, delay: intensity <= 0.05 ? 0 : 0.14, ease: [0.22, 1, 0.36, 1] } }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
            >
              <Header onToggle={toggle} onMenu={() => useRuntime.setState({ quickMenu: !quick })} />
              <ViewHost />
              <NavBar />
              <AnimatePresence>{quick && <QuickMenu key="qm" onClose={() => useRuntime.setState({ quickMenu: false })} />}</AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
