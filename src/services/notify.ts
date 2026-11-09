import { useData } from "@/stores/data";
import { useRuntime } from "@/stores/runtime";
import { useSettings } from "@/stores/settings";
import type { NotifType } from "@/types";
import { getEffective } from "./effective";
import { invoke, isTauri } from "./native";
import { playSound } from "./sound";

export function playChime() {
  playSound("notification");
}

export function requestOsPermission() {
  if (!isTauri && "Notification" in window && Notification.permission === "default") Notification.requestPermission();
}

export function notify(type: NotifType, title: string, body?: string) {
  useData.getState().pushNotif({ type, title, body });
  const important = type === "error" || type === "approval";
  if (getEffective().quiet && !important) return;

  // Detect source for Dynamic Island Banner
  const fullText = `${title} ${body ?? ""}`.toLowerCase();
  let source: "telegram" | "youtube" | "spotify" | "system" | "ai" | "focus" | "agenda" | "mail" | "media" = "system";
  let actionTab: any = null;

  if (fullText.includes("telegram")) {
    source = "telegram";
  } else if (fullText.includes("youtube")) {
    source = "youtube";
  } else if (fullText.includes("spotify")) {
    source = "spotify";
  } else if (type === "ai" || type === "approval") {
    source = "ai";
    actionTab = "ai";
  } else if (type === "focus") {
    source = "focus";
    actionTab = "focus";
  } else if (type === "agenda") {
    source = "agenda";
    actionTab = "agenda";
  }

  // Trigger Dynamic Island Notification Banner
  useRuntime.getState().showIslandBanner({
    source,
    title,
    body,
    actionTab,
    durationMs: 5500,
  });

  useRuntime.getState().flashEyes(type === "error" ? "error" : type === "focus" ? "success" : "attention", 5000);
  if (!useSettings.getState().osNotifications) return;
  if (isTauri) invoke("notify", { title, body: body ?? "" });
  else if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, { body, silent: true });
    } catch {
      /* ignore */
    }
  }
}
