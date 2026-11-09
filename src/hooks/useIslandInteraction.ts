import { useCallback, useEffect, useRef } from "react";
import { useRuntime } from "@/stores/runtime";
import { useSettings } from "@/stores/settings";

/**
 * Hover / Click / Both interaction with configurable delays.
 * Handlers read settings via getState() so they never go stale and no extra re-renders happen.
 * Nothing here moves the window — the island position is owned by the native layer.
 */
export function useIslandInteraction() {
  const openT = useRef<ReturnType<typeof setTimeout>>(undefined);
  const closeT = useRef<ReturnType<typeof setTimeout>>(undefined);

  const clear = () => {
    clearTimeout(openT.current);
    clearTimeout(closeT.current);
  };
  useEffect(() => clear, []);

  const onPointerEnter = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    const st = useSettings.getState();
    const rt = useRuntime.getState();
    clear();
    useRuntime.setState({ hovering: true, sleeping: false, lastActivity: Date.now() });
    if (st.interaction === "click" || rt.open || rt.suppressHover) return;
    if (st.ignoreHoverFullscreen && rt.fullscreen) return;
    openT.current = setTimeout(() => useRuntime.getState().setOpen(true, "hover"), st.openDelay);
  }, []);

  const onPointerLeave = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    const st = useSettings.getState();
    clear();
    useRuntime.setState({ hovering: false });
    const rt = useRuntime.getState();
    if (!rt.open || st.pinOpen || rt.pinned || rt.quickMenu) return;
    const byHover = rt.openedBy === "hover" && st.interaction !== "click";
    if (byHover || st.autoClose) {
      closeT.current = setTimeout(() => {
        const r = useRuntime.getState();
        if (!r.pinned && !r.hovering) r.setOpen(false);
      }, st.closeDelay);
    }
  }, []);

  /** Click anywhere on the island surface. */
  const onClick = useCallback(() => {
    const st = useSettings.getState();
    const rt = useRuntime.getState();
    rt.touch();
    if (!rt.open) {
      if (st.interaction !== "hover") {
        clear();
        rt.setOpen(true, "click");
      }
      return;
    }
    // A click on the open panel stabilises a hover-opened panel.
    if (rt.openedBy === "hover" && st.interaction === "both") {
      clearTimeout(closeT.current);
      useRuntime.setState({ openedBy: "click" });
    }
  }, []);

  /** Explicit toggle (header eyes / fold button). */
  const toggle = useCallback(() => {
    const st = useSettings.getState();
    const rt = useRuntime.getState();
    clear();
    if (rt.open) {
      if (st.clickToggle || st.interaction === "hover") rt.close();
    } else rt.setOpen(true, "click");
  }, []);

  return { onPointerEnter, onPointerLeave, onClick, toggle };
}
