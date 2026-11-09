export type TabId =
  | "home" | "ai" | "music" | "notes" | "focus" | "modes" | "files" | "clipboard" | "agenda" | "mail"
  | "notifications" | "settings" | "customize" | "apps";

export const NAV_TABS: TabId[] = ["home", "ai", "music", "notes", "focus", "modes", "files", "clipboard", "agenda", "mail"];

export type EyeMood =
  | "idle" | "thinking" | "working" | "attention" | "success" | "error" | "sleep" | "curious" | "happy";

export type AgentState =
  | "idle" | "starting" | "reading" | "thinking" | "editing" | "executing" | "waiting" | "completed" | "failed";

export type ProviderId = "novafree" | "ollama" | "gemini" | "groq" | "openrouter" | "openai" | "anthropic";
export type ThemeId = "pure" | "amber" | "purple" | "aurora" | "crimson" | "minimal" | "custom";
export type CardType = "ai" | "music" | "focus" | "system" | "clock" | "agenda" | "notes";
export type CardSize = "sm" | "md" | "lg";
export type ModeId = "work" | "study" | "sleep" | "game";

export interface HomeCard { uid: string; type: CardType; size: CardSize; enabled: boolean }

export interface ProviderConfig {
  apiKey: string;
  model: string;
  status: "unknown" | "ok" | "error";
  lastError?: string;
  checkedAt?: number;
  baseUrl?: string;
}

export interface ModeConfig {
  focusMin: number;
  breakMin: number;
  quietNotifications: boolean;
  dimEyes: boolean;
  lowResource: boolean;
  allowedProviders: ProviderId[];
  scheduleEnabled: boolean;
  scheduleStart: string;
  scheduleEnd: string;
}

export interface Note { id: string; title: string; body: string; createdAt: number; updatedAt: number }
export interface ClipItem { id: string; text: string; ts: number; pinned?: boolean }
export interface AgendaEvent { id: string; title: string; date: string; start: string; end: string; notes?: string; notified?: boolean }
export interface ShelfFile { id: string; name: string; path?: string; size: number; type: string; addedAt: number }
export type NotifType = "info" | "ai" | "approval" | "focus" | "error" | "agenda";
export interface NotifItem { id: string; type: NotifType; title: string; body?: string; ts: number; read: boolean }
export interface FocusRecord { id: string; ts: number; minutes: number; phase: "focus" | "short" | "long"; completed: boolean }
export interface ActivityRecord { id: string; ts: number; agent: string; state: AgentState; text: string }

export interface AgentInfo {
  id: string;
  name: string;
  state: AgentState;
  message?: string;
  lastSeen: number;
}

export interface Approval {
  id: string;
  agent: string;
  kind: string;
  description: string;
  target: string;
  ts: number;
}

export interface MusicState {
  source: "native" | "local" | null;
  title: string;
  artist: string;
  art?: string;
  playing: boolean;
  position: number;
  duration: number;
  app?: string;
  canControl: boolean;
}

export interface SystemStats {
  cpu: number | null;
  ramUsed: number | null;
  ramTotal: number | null;
  gpu: number | null;
  battery: number | null;
  charging: boolean | null;
  online: boolean;
  netDown?: number | null;
  netUp?: number | null;
  native: boolean;
}

export interface AudioSession {
  pid: number;
  name: string;
  volume: number;
  muted: boolean;
}

export interface EmailAccount {
  id: string;
  provider: "gmail" | "outlook" | "yahoo" | "custom";
  email: string;
  name: string;
  connectedAt: number;
  active: boolean;
}

export interface EmailMessage {
  id: string;
  accountId: string;
  category: "primary" | "updates" | "promotions";
  sender: string;
  senderEmail: string;
  avatar?: string;
  subject: string;
  snippet: string;
  body?: string;
  ts: number;
  read: boolean;
  starred?: boolean;
}

export interface TelegramMessage {
  id: string;
  chatId: string;
  sender: "me" | "them";
  senderName?: string;
  text: string;
  ts: number;
}

export interface TelegramChat {
  id: string;
  title: string;
  username?: string;
  avatar?: string;
  lastMessage: string;
  senderName?: string;
  ts: number;
  unreadCount: number;
  isChannel?: boolean;
  verified?: boolean;
  online?: boolean;
  messages?: TelegramMessage[];
}

export interface YouTubeFeedItem {
  id: string;
  channelTitle: string;
  channelAvatar?: string;
  videoTitle: string;
  thumbnail: string;
  videoUrl: string;
  publishedAt: number;
  views?: string;
  duration?: string;
}

export interface ConnectedApp {
  id: "gmail" | "outlook" | "telegram" | "youtube" | "spotify" | "discord" | "github";
  name: string;
  category: "email" | "chat" | "media" | "dev";
  connected: boolean;
  accountName?: string;
  lastSync?: number;
  status: "connected" | "disconnected" | "syncing";
}

export interface CustomAppItem {
  id: string;
  name: string;
  path: string;
  icon?: string;
  addedAt: number;
}

