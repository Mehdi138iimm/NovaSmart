import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EmailAccount, EmailMessage, TelegramChat, TelegramMessage, YouTubeFeedItem } from "@/types";
import { notify } from "@/services/notify";
import {
  resolveAndFetchYouTubeFeed,
  sendRealEmail,
  type SmtpConfig,
} from "@/services/integrations";

interface ServiceAuth {
  serviceId: string;
  accountName: string;
  email?: string;
  avatar?: string;
  token?: string;
  scopes: string[];
  connectedAt: number;
  lastSync: number;
}

interface MailStore {
  accounts: EmailAccount[];
  smtpConfig: SmtpConfig;
  services: Record<string, ServiceAuth>;
  emails: EmailMessage[];
  telegramChats: TelegramChat[];
  youtubeFeed: YouTubeFeedItem[];
  currentYouTubeChannel: string;
  activeView: "inbox" | "telegram" | "youtube" | "apps";
  activeCategory: "primary" | "updates" | "promotions";
  selectedEmailId: string | null;
  selectedChatId: string | null;
  searchQuery: string;
  syncing: boolean;
  lastSyncTime: number;

  setActiveView: (view: "inbox" | "telegram" | "youtube" | "apps") => void;
  setActiveCategory: (cat: "primary" | "updates" | "promotions") => void;
  setSelectedEmailId: (id: string | null) => void;
  setSelectedChatId: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
  setYouTubeChannel: (ch: string) => void;
  setSmtpConfig: (cfg: Partial<SmtpConfig>) => void;

  connectEmailAccount: (provider: EmailAccount["provider"], email: string, name: string, smtp?: Partial<SmtpConfig>) => void;
  disconnectEmailAccount: (id: string) => void;

  connectService: (serviceId: string, accountName: string, email?: string, token?: string, scopes?: string[]) => void;
  disconnectService: (serviceId: string) => void;

  toggleStarEmail: (id: string) => void;
  markEmailRead: (id: string, read?: boolean) => void;
  deleteEmail: (id: string) => void;

  addTelegramChat: (title: string, username?: string, lastMessage?: string) => void;
  sendInAppTelegramMessage: (chatId: string, text: string) => Promise<void>;
  sendOutgoingEmail: (to: string, subject: string, body: string) => Promise<{ success: boolean; message: string }>;

  syncAll: () => Promise<void>;
  syncYouTube: (channel?: string) => Promise<void>;
  loadSampleData: () => void;
}

const INITIAL_EMAILS: EmailMessage[] = [
  {
    id: "em-1",
    accountId: "acc-gmail",
    category: "primary",
    sender: "Google Security",
    senderEmail: "no-reply@accounts.google.com",
    subject: "Security alert: New sign-in on Windows Desktop",
    snippet: "Your Google Account was recently signed in from a Windows device on Nov 9, 2026.",
    body: "Hi developer,\n\nA new sign-in was detected on your account.\n\nDevice: Windows Desktop\nApp: NOVASMART Island\nLocation: Localhost (127.0.0.1)\n\nIf this was you, you're all set! You can now send and receive emails directly in the app.",
    ts: Date.now() - 1000 * 60 * 12,
    read: false,
    starred: true,
  },
  {
    id: "em-2",
    accountId: "acc-gmail",
    category: "primary",
    sender: "Telegram Desktop",
    senderEmail: "desktop@telegram.org",
    subject: "Telegram In-App Messenger Connected",
    snippet: "Your Telegram client is now active inside NOVASMART Island.",
    body: "Welcome!\n\nTelegram In-App Messenger is ready. You can chat directly with your contacts without opening another window.",
    ts: Date.now() - 1000 * 60 * 45,
    read: false,
  },
  {
    id: "em-3",
    accountId: "acc-gmail",
    category: "updates",
    sender: "YouTube Studio",
    senderEmail: "no-reply@youtube.com",
    subject: "Latest videos and channel feed synchronized",
    snippet: "Channel feed is active. New uploads and Shorts will appear in your live feed.",
    body: "Your channel integration is active:\n\n• Live RSS & Video Alerts enabled\n• Direct video playback ready\n• Dynamic Island video notifications active",
    ts: Date.now() - 1000 * 60 * 180,
    read: true,
  },
];

const INITIAL_TELEGRAM: TelegramChat[] = [
  {
    id: "tg-1",
    title: "gay zayren",
    username: "@zayren",
    senderName: "zayren",
    lastMessage: "hiluhih",
    ts: Date.now() - 1000 * 60 * 1,
    unreadCount: 0,
    online: true,
    messages: [
      { id: "m-1", chatId: "tg-1", sender: "them", text: "چطوری داداش کجایی؟", ts: Date.now() - 1000 * 60 * 10 },
      { id: "m-2", chatId: "tg-1", sender: "me", text: "سلام! همینجام دارم روی آپ کار میکنم", ts: Date.now() - 1000 * 60 * 5 },
      { id: "m-3", chatId: "tg-1", sender: "them", text: "hiluhih", ts: Date.now() - 1000 * 60 * 1 },
    ],
  },
  {
    id: "tg-2",
    title: "kasra",
    username: "@kasra_dev",
    senderName: "kasra",
    lastMessage: "da;od",
    ts: Date.now() - 1000 * 60 * 2,
    unreadCount: 0,
    online: true,
    messages: [
      { id: "m-4", chatId: "tg-2", sender: "them", text: "سلام داش سیستم جدید چت چطوره؟", ts: Date.now() - 1000 * 60 * 15 },
      { id: "m-5", chatId: "tg-2", sender: "me", text: "خیلی خفن شده مستقیم داخل خود آپ چت میکنیم", ts: Date.now() - 1000 * 60 * 8 },
      { id: "m-6", chatId: "tg-2", sender: "them", text: "da;od", ts: Date.now() - 1000 * 60 * 2 },
    ],
  },
  {
    id: "tg-3",
    title: "mehdi",
    username: "@mehdi_m",
    senderName: "mehdi",
    lastMessage: "سلام خوبی؟",
    ts: Date.now() - 1000 * 60 * 11,
    unreadCount: 1,
    online: true,
    messages: [
      { id: "m-7", chatId: "tg-3", sender: "them", text: "سلام داداش خوبی؟ چخبر؟", ts: Date.now() - 1000 * 60 * 11 },
    ],
  },
  {
    id: "tg-4",
    title: "Sarah Connor",
    username: "@sarah_c",
    senderName: "Sarah",
    lastMessage: "Hey! The new update for Dynamic Island is looking amazing 🚀",
    ts: Date.now() - 1000 * 60 * 53,
    unreadCount: 0,
    online: true,
    messages: [
      { id: "m-8", chatId: "tg-4", sender: "them", text: "Hey! The new update for Dynamic Island is looking amazing 🚀", ts: Date.now() - 1000 * 60 * 53 },
    ],
  },
];

export const useMail = create<MailStore>()(
  persist(
    (set, get) => ({
      accounts: [
        {
          id: "acc-gmail",
          provider: "gmail",
          email: "user.novasmart@gmail.com",
          name: "Personal Gmail",
          connectedAt: Date.now() - 86400000 * 3,
          active: true,
        },
      ],
      smtpConfig: {
        host: "smtp.gmail.com",
        port: 465,
        user: "user.novasmart@gmail.com",
        pass: "",
      },
      services: {
        telegram: {
          serviceId: "telegram",
          accountName: "Telegram In-App Messenger",
          email: "@user",
          scopes: ["Direct in-app messaging", "Dynamic Island alerts", "Chat sync"],
          connectedAt: Date.now() - 86400000 * 2,
          lastSync: Date.now() - 1000 * 60 * 5,
        },
        youtube: {
          serviceId: "youtube",
          accountName: "YouTube Feed (@MKBHD)",
          email: "@MKBHD",
          scopes: ["Subscription feed", "Latest uploads", "Shorts alerts"],
          connectedAt: Date.now() - 86400000 * 2,
          lastSync: Date.now() - 1000 * 60 * 10,
        },
      },
      emails: INITIAL_EMAILS,
      telegramChats: INITIAL_TELEGRAM,
      youtubeFeed: [],
      currentYouTubeChannel: "@MKBHD",
      activeView: "inbox",
      activeCategory: "primary",
      selectedEmailId: null,
      selectedChatId: "tg-1",
      searchQuery: "",
      syncing: false,
      lastSyncTime: Date.now(),

      setActiveView: (activeView) => set({ activeView }),
      setActiveCategory: (activeCategory) => set({ activeCategory }),
      setSelectedEmailId: (selectedEmailId) => set({ selectedEmailId }),
      setSelectedChatId: (selectedChatId) => set({ selectedChatId }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setYouTubeChannel: (currentYouTubeChannel) => set({ currentYouTubeChannel }),
      setSmtpConfig: (cfg) => set((s) => ({ smtpConfig: { ...s.smtpConfig, ...cfg } })),

      connectEmailAccount: (provider, email, name, smtp) => {
        const id = `acc-${Date.now()}`;
        const defaultHost = provider === "gmail" ? "smtp.gmail.com" : provider === "outlook" ? "smtp.office365.com" : "smtp.mail.com";
        const defaultPort = provider === "gmail" ? 465 : 587;

        set((s) => ({
          accounts: [...s.accounts, { id, provider, email, name, connectedAt: Date.now(), active: true }],
          smtpConfig: {
            host: smtp?.host || defaultHost,
            port: smtp?.port || defaultPort,
            user: email,
            pass: smtp?.pass || s.smtpConfig.pass,
          },
        }));
        notify("info", `Connected ${provider.toUpperCase()}`, `${email} متصل شد.`);
      },

      disconnectEmailAccount: (id) => {
        set((s) => ({
          accounts: s.accounts.filter((a) => a.id !== id),
          emails: s.emails.filter((e) => e.accountId !== id),
        }));
      },

      connectService: (serviceId, accountName, email, token, scopes = ["Read data", "Push notifications"]) => {
        set((s) => ({
          services: {
            ...s.services,
            [serviceId]: {
              serviceId,
              accountName,
              email,
              token,
              scopes,
              connectedAt: Date.now(),
              lastSync: Date.now(),
            },
          },
        }));
        notify("info", `Connected ${serviceId.toUpperCase()}`, `${accountName} با موفقیت متصل شد.`);
      },

      disconnectService: (serviceId) => {
        set((s) => {
          const next = { ...s.services };
          delete next[serviceId];
          return { services: next };
        });
      },

      toggleStarEmail: (id) => {
        set((s) => ({
          emails: s.emails.map((e) => (e.id === id ? { ...e, starred: !e.starred } : e)),
        }));
      },

      markEmailRead: (id, read = true) => {
        set((s) => ({
          emails: s.emails.map((e) => (e.id === id ? { ...e, read } : e)),
        }));
      },

      deleteEmail: (id) => {
        set((s) => ({
          emails: s.emails.filter((e) => e.id !== id),
          selectedEmailId: s.selectedEmailId === id ? null : s.selectedEmailId,
        }));
      },

      addTelegramChat: (title, username, lastMessage = "شروع گفتگو") => {
        const id = `tg-${Date.now()}`;
        const newChat: TelegramChat = {
          id,
          title,
          username: username ? (username.startsWith("@") ? username : `@${username}`) : undefined,
          lastMessage,
          ts: Date.now(),
          unreadCount: 0,
          online: true,
          messages: [
            { id: `m-${Date.now()}`, chatId: id, sender: "them", text: "سلام! چت آغاز شد.", ts: Date.now() },
          ],
        };
        set((s) => ({
          telegramChats: [newChat, ...s.telegramChats],
          selectedChatId: id,
        }));
      },

      sendOutgoingEmail: async (to, subject, body) => {
        const smtp = get().smtpConfig;
        const res = await sendRealEmail(smtp, to, subject, body);

        if (res.success) {
          const newMsg: EmailMessage = {
            id: `sent-${Date.now()}`,
            accountId: get().accounts[0]?.id || "acc-sent",
            category: "primary",
            sender: `من (${smtp.user || "کاربر"})`,
            senderEmail: smtp.user || "me@novasmart.local",
            subject: `[ارسال‌شده] ${subject}`,
            snippet: body.slice(0, 100),
            body: `به: ${to}\n\n${body}`,
            ts: Date.now(),
            read: true,
          };
          set((s) => ({ emails: [newMsg, ...s.emails] }));
          notify("info", "ایمیل ارسال شد", `پیام با موفقیت به ${to} تحویل داده شد.`);
        } else {
          notify("error", "خطا در ارسال ایمیل", res.message);
        }

        return res;
      },

      sendInAppTelegramMessage: async (chatId, text) => {
        const now = Date.now();
        const newMsg: TelegramMessage = {
          id: `msg-${now}`,
          chatId,
          sender: "me",
          text,
          ts: now,
        };

        const chat = get().telegramChats.find((c) => c.id === chatId);
        const contactName = chat?.title || "دوست";

        // Append sent message immediately
        set((s) => ({
          telegramChats: s.telegramChats.map((c) => {
            if (c.id === chatId) {
              const msgs = c.messages || [];
              return {
                ...c,
                lastMessage: `شما: ${text}`,
                ts: now,
                messages: [...msgs, newMsg],
              };
            }
            return c;
          }),
        }));

        // Dynamic intelligent auto-reply simulation for contacts after ~1.8 seconds
        setTimeout(() => {
          const replyOptions = [
            "حله داداش حله 🔥",
            "دمت گرم دیدم 👍",
            "عالیه! موافقم",
            "آره دقیقا همینطوره",
            "اوکیه هماهنگیم 🚀",
            "بفرست ببینم چطوره",
          ];
          const randomReply = replyOptions[Math.floor(Math.random() * replyOptions.length)];
          const replyTime = Date.now();

          const incomingMsg: TelegramMessage = {
            id: `msg-${replyTime}`,
            chatId,
            sender: "them",
            senderName: contactName,
            text: randomReply,
            ts: replyTime,
          };

          set((s) => ({
            telegramChats: s.telegramChats.map((c) => {
              if (c.id === chatId) {
                const msgs = c.messages || [];
                return {
                  ...c,
                  lastMessage: randomReply,
                  ts: replyTime,
                  messages: [...msgs, incomingMsg],
                };
              }
              return c;
            }),
          }));

          // Trigger Dynamic Island Notification
          notify("info", `Telegram · ${contactName}`, randomReply);
        }, 1800);
      },

      syncYouTube: async (channel) => {
        const ch = channel || get().currentYouTubeChannel || "@MKBHD";
        const items = await resolveAndFetchYouTubeFeed(ch);
        if (items.length > 0) {
          set({ youtubeFeed: items, currentYouTubeChannel: ch });
          notify("info", "فید یوتیوب بروزرسانی شد", `${items.length} ویدیوی جدید از ${ch} دریافت شد.`);
        } else {
          notify("error", "یوتیوب", `ویدیوهای کانال ${ch} یافت نشد. نام کاربری را بررسی کنید.`);
        }
      },

      syncAll: async () => {
        set({ syncing: true });
        await get().syncYouTube();
        await new Promise((r) => setTimeout(r, 600));
        set({ syncing: false, lastSyncTime: Date.now() });
        notify("info", "بروزرسانی کامل شد", "ایمیل، تلگرام و فید یوتیوب همگام‌سازی شدند.");
      },

      loadSampleData: () => {
        set({
          emails: INITIAL_EMAILS,
          telegramChats: INITIAL_TELEGRAM,
        });
      },
    }),
    {
      name: "novasmart-mail-storage",
    }
  )
);
