import { useEffect, useState } from "react";
import { AppWindow, LayoutGrid, Plus, Trash2 } from "lucide-react";
import { TAB_META } from "@/components/navigation/tabs";
import { useT } from "@/i18n";
import { invoke, isTauri, onFileDrop } from "@/services/native";
import { notify } from "@/services/notify";
import { playSound } from "@/services/sound";
import { useData } from "@/stores/data";
import { useRuntime } from "@/stores/runtime";
import type { TabId } from "@/types";

const SYSTEM_MODULES: TabId[] = [
  "home",
  "ai",
  "music",
  "notes",
  "focus",
  "modes",
  "files",
  "clipboard",
  "agenda",
  "mail",
  "notifications",
  "customize",
  "settings",
];

function extractExeName(fullPath: string): string {
  const clean = fullPath.replace(/\\/g, "/");
  const filename = clean.split("/").pop() || "Application";
  return filename.replace(/\.(exe|lnk|bat|cmd)$/i, "");
}

export default function AppsView() {
  const t = useT();
  const setTab = useRuntime((s) => s.setTab);
  const unread = useData((s) => s.notifs.filter((n) => !n.read).length);
  const customApps = useData((s) => s.customApps ?? []);
  const addCustomApp = useData((s) => s.addCustomApp);
  const removeCustomApp = useData((s) => s.removeCustomApp);

  const [activeTab, setActiveTab] = useState<"all" | "exe" | "system">("all");

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    onFileDrop((paths, phase) => {
      if (phase === "drop" && paths.length > 0) {
        for (const p of paths) {
          const name = extractExeName(p);
          addCustomApp({ name, path: p });
          notify("info", t("Add .exe Program"), `${name}`);
        }
        playSound("success");
      }
    }).then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, [addCustomApp, t]);

  const handlePickExe = async () => {
    playSound("click");
    if (!isTauri) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".exe,.lnk,.bat,.cmd";
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const name = extractExeName(file.name);
          addCustomApp({ name, path: `C:\\Program Files\\${file.name}` });
          playSound("success");
          notify("info", t("Add .exe Program"), `${name}`);
        }
      };
      input.click();
      return;
    }

    try {
      const selectedPath = await invoke<string>("pick_exe_file");
      if (selectedPath) {
        const name = extractExeName(selectedPath);
        addCustomApp({ name, path: selectedPath });
        playSound("success");
        notify("info", t("Add .exe Program"), `${name}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLaunch = async (path: string, name: string) => {
    playSound("click");
    try {
      if (isTauri) {
        await invoke("open_path", { path });
      } else {
        notify("info", t("Launch App"), `${name} (${path})`);
      }
    } catch {
      notify("error", t("Launch App"), `Could not open ${path}`);
    }
  };

  return (
    <div className="scroll flex h-full flex-col gap-3.5 pr-1">
      {/* Top Filter & Add Exe Action Bar */}
      <div className="surface flex items-center justify-between gap-2 px-3 py-2" style={{ borderRadius: 18 }}>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { playSound("click"); setActiveTab("all"); }}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-medium transition-colors ${
              activeTab === "all" ? "bg-[var(--accent)] text-[var(--panel)] shadow-sm" : "muted hover:text-[var(--fg)]"
            }`}
          >
            <LayoutGrid size={13} />
            <span>{t("All")}</span>
          </button>
          <button
            onClick={() => { playSound("click"); setActiveTab("exe"); }}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-medium transition-colors ${
              activeTab === "exe" ? "bg-[var(--accent)] text-[var(--panel)] shadow-sm" : "muted hover:text-[var(--fg)]"
            }`}
          >
            <AppWindow size={13} />
            <span>{t("My Apps (.exe)")}</span>
            {customApps.length > 0 && <span className="rounded-full bg-white/20 px-1 text-[10px]">{customApps.length}</span>}
          </button>
          <button
            onClick={() => { playSound("click"); setActiveTab("system"); }}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-medium transition-colors ${
              activeTab === "system" ? "bg-[var(--accent)] text-[var(--panel)] shadow-sm" : "muted hover:text-[var(--fg)]"
            }`}
          >
            <span>{t("System Modules")}</span>
          </button>
        </div>

        <button
          onClick={handlePickExe}
          className="btn btn-accent !h-7 !px-3 !text-[11.5px] font-semibold"
          title={t("Choose .exe file")}
        >
          <Plus size={13} />
          <span>{t("Add Program (.exe)")}</span>
        </button>
      </div>

      {/* Custom Exe Programs Grid (Shown when "all" or "exe" is active) */}
      {activeTab !== "system" && (
        <div>
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="label">{t("My Apps (.exe)")} · {customApps.length}</span>
          </div>

          <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5">
            {/* Add New App Tile */}
            <button
              onClick={handlePickExe}
              className="surface group flex h-[82px] flex-col items-center justify-center gap-2 border-dashed text-[11.5px] font-medium transition-all hover:border-[var(--accent)] hover:bg-[var(--surface-2)] cursor-pointer"
              style={{ borderRadius: 20 }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-2)] transition-transform group-hover:scale-110">
                <Plus size={16} style={{ color: "var(--accent)" }} />
              </div>
              <span className="faint group-hover:text-[var(--fg)]">{t("Add Program (.exe)")}</span>
            </button>

            {/* Custom Added Exe Tiles */}
            {customApps.map((app) => (
              <div
                key={app.id}
                className="surface group relative flex h-[82px] flex-col items-center justify-center gap-1.5 p-2 text-[11.5px] font-medium transition-all hover:bg-[var(--surface-2)] cursor-pointer"
                style={{ borderRadius: 20 }}
                onClick={() => handleLaunch(app.path, app.name)}
                title={app.path}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--accent)] shadow-sm">
                  <AppWindow size={18} />
                </div>
                <span className="truncate max-w-[85px] text-center" dir="auto">{app.name}</span>

                {/* Delete Shortcut Action */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playSound("delete");
                    removeCustomApp(app.id);
                  }}
                  className="icon-btn absolute end-1.5 top-1.5 !h-5 !w-5 opacity-0 transition-opacity group-hover:opacity-100 hover:!text-[#ff6b6b]"
                  title="Remove shortcut"
                  aria-label="Remove shortcut"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Internal Modules Grid */}
      {activeTab !== "exe" && (
        <div>
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="label">{t("System Modules")}</span>
          </div>

          <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5">
            {SYSTEM_MODULES.map((id) => {
              const { icon: Icon, label } = TAB_META[id];
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className="surface relative flex h-[82px] flex-col items-center justify-center gap-2 text-[12px] font-medium transition-colors hover:bg-[var(--surface-2)] cursor-pointer"
                  style={{ borderRadius: 20 }}
                >
                  <Icon size={21} style={{ color: "var(--accent)" }} />
                  <span>{t(label)}</span>
                  {id === "notifications" && unread > 0 && (
                    <span className="absolute end-3 top-3 h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
