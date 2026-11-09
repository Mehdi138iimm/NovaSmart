import {
  House, Sparkles, Music2, StickyNote, Timer, SlidersHorizontal, FolderOpen, ClipboardList, CalendarDays, Video,
  Bell, Settings, Palette, LayoutGrid, type LucideIcon,
} from "lucide-react";
import type { TabId } from "@/types";

export const TAB_META: Record<TabId, { label: string; icon: LucideIcon }> = {
  home: { label: "Home", icon: House },
  ai: { label: "AI", icon: Sparkles },
  music: { label: "Music", icon: Music2 },
  notes: { label: "Notes", icon: StickyNote },
  focus: { label: "Focus", icon: Timer },
  modes: { label: "Modes", icon: SlidersHorizontal },
  files: { label: "Files", icon: FolderOpen },
  clipboard: { label: "Clipboard", icon: ClipboardList },
  agenda: { label: "Agenda", icon: CalendarDays },
  mail: { label: "YouTube", icon: Video },
  notifications: { label: "Notifications", icon: Bell },
  settings: { label: "Settings", icon: Settings },
  customize: { label: "Customize", icon: Palette },
  apps: { label: "All Apps", icon: LayoutGrid },
};
