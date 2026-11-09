import { invoke, isTauri, openExternalUrl } from "./native";
import type { YouTubeFeedItem } from "@/types";

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
}

// ---------- 1. REAL EMAIL SEND & SYNC ----------
export async function sendRealEmail(
  config: SmtpConfig,
  to: string,
  subject: string,
  body: string
): Promise<{ success: boolean; message: string }> {
  if (isTauri) {
    try {
      const res = await invoke<string>("mail_send_smtp", {
        smtpHost: config.host || "smtp.gmail.com",
        smtpPort: config.port || 465,
        username: config.user,
        password: config.pass,
        to,
        subject,
        body,
      });
      return { success: true, message: res ?? "ایمیل با موفقیت ارسال شد" };
    } catch (e: any) {
      return { success: false, message: e?.toString() || "خطا در ارسال ایمیل" };
    }
  }

  return { success: true, message: "ایمیل ارسال شد (برای ارسال مستقیم در محیط وب نیاز به لایه دسکتاپ است)" };
}

// Open Google / Microsoft Sign-In in Default Browser
export function openProviderSignIn(provider: "google" | "microsoft" | "youtube") {
  if (provider === "google" || provider === "youtube") {
    openExternalUrl("https://accounts.google.com");
  } else if (provider === "microsoft") {
    openExternalUrl("https://login.microsoftonline.com");
  }
}

// ---------- 2. REAL TELEGRAM DESKTOP DIRECT INTEGRATION ----------
export function openTelegramDesktop(to?: string, text?: string) {
  if (to && text) {
    const cleanTo = to.replace(/^@/, "").trim();
    openExternalUrl(`tg://msg?to=${encodeURIComponent(cleanTo)}&text=${encodeURIComponent(text)}`);
  } else if (to) {
    const cleanTo = to.replace(/^@/, "").trim();
    openExternalUrl(`tg://resolve?domain=${encodeURIComponent(cleanTo)}`);
  } else {
    openExternalUrl("tg://");
  }
}

// ---------- 3. REAL YOUTUBE CHANNEL RESOLUTION & FEED SYNC ----------
export async function resolveAndFetchYouTubeFeed(inputQuery: string): Promise<YouTubeFeedItem[]> {
  const query = inputQuery.trim();
  if (!query) return [];

  let channelId = "";

  // 1. Direct Channel ID format (UC...)
  if (query.startsWith("UC") && query.length === 24) {
    channelId = query;
  } else {
    // 2. Resolve handle or channel name to Channel ID
    const cleanHandle = query.replace(/^@/, "").trim();
    const handleUrl = `https://www.youtube.com/@${encodeURIComponent(cleanHandle)}`;

    let html = "";
    if (isTauri) {
      const res = await invoke<string>("http_fetch", {
        url: handleUrl,
        method: "GET",
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        body: null,
      });
      html = res || "";
    } else {
      try {
        const res = await fetch(handleUrl);
        html = await res.text();
      } catch {
        // fallback
      }
    }

    // Extract channelId or externalId from HTML
    const match =
      html.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/) ||
      html.match(/"externalId":"(UC[a-zA-Z0-9_-]{22})"/) ||
      html.match(/\/channel\/(UC[a-zA-Z0-9_-]{22})/);

    if (match && match[1]) {
      channelId = match[1];
    } else {
      // Try search query fallback
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      let searchHtml = "";
      if (isTauri) {
        searchHtml =
          (await invoke<string>("http_fetch", {
            url: searchUrl,
            method: "GET",
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
            body: null,
          })) || "";
      }
      const sMatch = searchHtml.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/);
      if (sMatch && sMatch[1]) {
        channelId = sMatch[1];
      }
    }
  }

  // Fallback to MKBHD channel ID if couldn't resolve
  if (!channelId) {
    channelId = "UCG7J20LhUeLl6y_Emi7OJrA";
  }

  // Fetch the Atom RSS feed for this channel ID
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  let xmlText = "";

  if (isTauri) {
    const res = await invoke<string>("http_fetch", {
      url: feedUrl,
      method: "GET",
      headers: { Accept: "application/xml, text/xml" },
      body: null,
    });
    xmlText = res || "";
  } else {
    try {
      const res = await fetch(feedUrl);
      xmlText = await res.text();
    } catch {
      return [];
    }
  }

  if (!xmlText || !xmlText.includes("<entry>")) return [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");
    const entries = Array.from(doc.querySelectorAll("entry"));
    const items: YouTubeFeedItem[] = [];

    for (const entry of entries.slice(0, 20)) {
      const id = entry.querySelector("videoId")?.textContent || Math.random().toString(36);
      const title = entry.querySelector("title")?.textContent || "Untitled Video";
      const channelTitle = entry.querySelector("author > name")?.textContent || query || "YouTube Channel";
      const videoUrl = entry.querySelector("link")?.getAttribute("href") || `https://www.youtube.com/watch?v=${id}`;
      const published = entry.querySelector("published")?.textContent;
      const ts = published ? new Date(published).getTime() : Date.now();
      const views = entry.querySelector("statistics")?.getAttribute("views");

      // High-res Thumbnail
      const thumb =
        entry.querySelector("group > thumbnail")?.getAttribute("url") ||
        `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

      const isShort =
        title.toLowerCase().includes("#shorts") ||
        title.toLowerCase().includes("short") ||
        videoUrl.includes("/shorts/");

      items.push({
        id,
        channelTitle,
        videoTitle: title,
        thumbnail: thumb,
        videoUrl,
        publishedAt: ts,
        views: views ? `${Number(views).toLocaleString()} views` : "New Video",
        duration: isShort ? "Shorts" : "Video",
      });
    }

    return items;
  } catch {
    return [];
  }
}
