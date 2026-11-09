import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActivityRecord, AgendaEvent, ClipItem, CustomAppItem, FocusRecord, NotifItem, Note, ShelfFile } from "@/types";
import { uid } from "./settings";

interface DataStore {
  notes: Note[];
  clips: ClipItem[];
  events: AgendaEvent[];
  files: ShelfFile[];
  notifs: NotifItem[];
  focusHistory: FocusRecord[];
  activity: ActivityRecord[];
  aiTasks: Record<string, number>; // yyyy-mm-dd -> count
  selectedNote: string | null;
  blockedClips: number;
  customApps: CustomAppItem[];

  addNote: () => string;
  patchNote: (id: string, patch: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  selectNote: (id: string | null) => void;

  addClip: (text: string) => boolean;
  toggleClipPin: (id: string) => void;
  deleteClip: (id: string) => void;
  clearClips: () => void;

  saveEvent: (e: Omit<AgendaEvent, "id"> & { id?: string }) => void;
  deleteEvent: (id: string) => void;
  markEventNotified: (id: string) => void;

  addFiles: (f: Omit<ShelfFile, "id" | "addedAt">[]) => ShelfFile[];
  removeFile: (id: string) => void;
  clearFiles: () => void;

  addCustomApp: (app: { name: string; path: string; icon?: string }) => CustomAppItem;
  removeCustomApp: (id: string) => void;

  pushNotif: (n: Omit<NotifItem, "id" | "ts" | "read">) => void;
  markRead: (id?: string) => void;
  clearNotifs: () => void;

  addFocusRecord: (r: Omit<FocusRecord, "id" | "ts">) => void;
  clearFocusHistory: () => void;
  addActivity: (a: Omit<ActivityRecord, "id" | "ts">) => void;
  bumpAiTask: () => void;
  clearActivity: () => void;
  wipeAll: () => void;
}

export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const useData = create<DataStore>()(
  persist(
    (set, get) => ({
      notes: [], clips: [], events: [], files: [], notifs: [], focusHistory: [], activity: [], aiTasks: {},
      selectedNote: null, blockedClips: 0, customApps: [],

      addNote: () => {
        const id = uid();
        const now = Date.now();
        set((s) => ({ notes: [{ id, title: "", body: "", createdAt: now, updatedAt: now }, ...s.notes], selectedNote: id }));
        return id;
      },
      patchNote: (id, patch) => set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)) })),
      deleteNote: (id) =>
        set((s) => {
          const notes = s.notes.filter((n) => n.id !== id);
          return { notes, selectedNote: s.selectedNote === id ? notes[0]?.id ?? null : s.selectedNote };
        }),
      selectNote: (id) => set({ selectedNote: id }),

      addClip: (text) => {
        const t = text.trim();
        if (!t || t.length > 20000) return false;
        const top = get().clips[0];
        if (top && top.text === t) return false;
        set((s) => ({ clips: [{ id: uid(), text: t, ts: Date.now() }, ...s.clips.filter((c) => c.text !== t || c.pinned)].slice(0, 150) }));
        return true;
      },
      toggleClipPin: (id) => set((s) => ({ clips: s.clips.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)) })),
      deleteClip: (id) => set((s) => ({ clips: s.clips.filter((c) => c.id !== id) })),
      clearClips: () => set((s) => ({ clips: s.clips.filter((c) => c.pinned) })),

      saveEvent: (e) =>
        set((s) => {
          if (e.id && s.events.some((x) => x.id === e.id)) return { events: s.events.map((x) => (x.id === e.id ? { ...x, ...e, id: x.id, notified: false } : x)) };
          return { events: [...s.events, { ...e, id: uid() }] };
        }),
      deleteEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
      markEventNotified: (id) => set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, notified: true } : e)) })),

      addFiles: (list) => {
        const created = list.map((f) => ({ ...f, id: uid(), addedAt: Date.now() }));
        set((s) => ({ files: [...created, ...s.files] }));
        return created;
      },
      removeFile: (id) => set((s) => ({ files: s.files.filter((f) => f.id !== id) })),
      clearFiles: () => set({ files: [] }),

      addCustomApp: ({ name, path, icon }) => {
        const item: CustomAppItem = { id: uid(), name, path, icon, addedAt: Date.now() };
        set((s) => ({ customApps: [...(s.customApps ?? []).filter((a) => a.path !== path), item] }));
        return item;
      },
      removeCustomApp: (id) => set((s) => ({ customApps: (s.customApps ?? []).filter((a) => a.id !== id) })),

      pushNotif: (n) => set((s) => ({ notifs: [{ ...n, id: uid(), ts: Date.now(), read: false }, ...s.notifs].slice(0, 200) })),
      markRead: (id) => set((s) => ({ notifs: s.notifs.map((n) => (!id || n.id === id ? { ...n, read: true } : n)) })),
      clearNotifs: () => set({ notifs: [] }),

      addFocusRecord: (r) => set((s) => ({ focusHistory: [{ ...r, id: uid(), ts: Date.now() }, ...s.focusHistory].slice(0, 500) })),
      clearFocusHistory: () => set({ focusHistory: [] }),
      addActivity: (a) => set((s) => ({ activity: [{ ...a, id: uid(), ts: Date.now() }, ...s.activity].slice(0, 100) })),
      bumpAiTask: () => set((s) => ({ aiTasks: { ...s.aiTasks, [dayKey()]: (s.aiTasks[dayKey()] ?? 0) + 1 } })),
      clearActivity: () => set({ activity: [], aiTasks: {} }),
      wipeAll: () =>
        set({ notes: [], clips: [], events: [], files: [], notifs: [], focusHistory: [], activity: [], aiTasks: {}, selectedNote: null, blockedClips: 0, customApps: [] }),
    }),
    { name: "novasmart.data", version: 1 }
  )
);

export const formatSize = (b: number) =>
  b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : b < 1073741824 ? `${(b / 1048576).toFixed(1)} MB` : `${(b / 1073741824).toFixed(2)} GB`;

export const todayAiTasks = (s: DataStore) => s.aiTasks[dayKey()] ?? 0;
