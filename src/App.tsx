import { useEffect, useRef } from "react";
import { Island } from "@/components/island/Island";
import { useServices, useTheme } from "@/hooks/useServices";
import { invoke, listen, isTauri } from "@/services/native";
import { useData } from "@/stores/data";
import { useRuntime } from "@/stores/runtime";
import { useSettings } from "@/stores/settings";

function Main() {
  useTheme();
  useServices();
  const showIsland = useSettings((s) => s.showIsland);
  const set = useSettings((s) => s.set);
  const open = useRuntime((s) => s.open);

  useEffect(() => {
    if (!useSettings.getState().filesPersist) useData.getState().clearFiles();
  }, []);

  const first = useRef(true);
  useEffect(() => {
    const startMin = first.current && useSettings.getState().startMinimized;
    first.current = false;
    invoke("set_island_visible", { visible: showIsland && !startMin });
  }, [showIsland]);

  useEffect(() => {
    let off: (() => void) | undefined;
    listen<boolean>("island-visibility-changed", (visible) => {
      set({ showIsland: visible });
    }).then((f) => (off = f));
    return () => {
      off?.();
    };
  }, [set]);

  return (
    <div className={`h-full w-full ${isTauri ? "" : "preview-desktop"}`}>
      {showIsland && <Island />}
      {!isTauri && !open && showIsland && (
        <div className="pointer-events-none fixed inset-x-0 top-24 text-center text-[13px]" style={{ color: "rgba(255,255,255,.45)" }}>
          NOVASMART · browser preview<br />
          <span style={{ color: "rgba(255,255,255,.3)", fontSize: 12 }}>Hover or click the notch at the top of the screen.</span>
        </div>
      )}
      {!isTauri && !showIsland && (
        <button className="btn fixed right-4 top-4" onClick={() => set({ showIsland: true })}>Show island</button>
      )}
    </div>
  );
}

export default function App() {
  return <Main />;
}
