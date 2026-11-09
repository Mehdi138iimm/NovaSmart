import { useData } from "@/stores/data";
import { useRuntime } from "@/stores/runtime";
import { uid, useSettings } from "@/stores/settings";
import type { ProviderConfig, ProviderId } from "@/types";
import { getEffective } from "./effective";
import { notify } from "./notify";

export const PROVIDER_META: Record<ProviderId, { name: string; keyHint: string; docs: string; free?: boolean; local?: boolean; noKeyNeeded?: boolean }> = {
  novafree: { name: "NOVA Free AI", keyHint: "", docs: "100% Free · No API key needed · Unlimited", free: true, noKeyNeeded: true },
  ollama: { name: "Ollama", keyHint: "", docs: "ollama.com · runs on your PC", free: true, local: true, noKeyNeeded: true },
  gemini: { name: "Gemini", keyHint: "AIza…", docs: "aistudio.google.com/apikey · Free tier", free: true },
  groq: { name: "Groq", keyHint: "gsk_…", docs: "console.groq.com/keys · Free tier", free: true },
  openrouter: { name: "OpenRouter", keyHint: "sk-or-…", docs: "openrouter.ai/keys · Free models", free: true },
  openai: { name: "OpenAI", keyHint: "sk-…", docs: "platform.openai.com/api-keys" },
  anthropic: { name: "Claude", keyHint: "sk-ant-…", docs: "console.anthropic.com/settings/keys" },
};

/** Free providers first, then paid. Used for UI order and auto-selection. */
export const PROVIDER_ORDER: ProviderId[] = ["novafree", "ollama", "gemini", "groq", "openrouter", "openai", "anthropic"];

const OPENAI_COMPAT: Partial<Record<ProviderId, string>> = {
  openai: "https://api.openai.com/v1/chat/completions",
  groq: "https://api.groq.com/openai/v1/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
};

export const OLLAMA_DEFAULT_URL = "http://localhost:11434";

/** List models installed in a local Ollama server (empty if unreachable). */
export async function listOllamaModels(baseUrl = OLLAMA_DEFAULT_URL): Promise<string[]> {
  try {
    const r = await fetch(`${baseUrl.replace(/\/$/, "")}/api/tags`);
    if (!r.ok) return [];
    const j = await r.json();
    return (j.models ?? []).map((m: { name: string }) => m.name);
  } catch {
    return [];
  }
}

type Turn = { role: "user" | "assistant"; text: string };

async function parseError(r: Response): Promise<string> {
  try {
    const j = await r.json();
    return j?.error?.message ?? j?.message ?? `HTTP ${r.status}`;
  } catch {
    return `HTTP ${r.status}`;
  }
}

function formatGeminiTurns(turns: Turn[]) {
  const result: { role: "user" | "model"; parts: [{ text: string }] }[] = [];
  for (const t of turns) {
    const role = t.role === "user" ? "user" : "model";
    if (result.length === 0 && role !== "user") continue;
    if (result.length > 0 && result[result.length - 1].role === role) {
      result[result.length - 1].parts[0].text += `\n\n${t.text}`;
    } else {
      result.push({ role, parts: [{ text: t.text }] });
    }
  }
  if (result.length === 0 && turns.length > 0) {
    result.push({ role: "user", parts: [{ text: turns[turns.length - 1].text }] });
  }
  return result;
}

function formatAnthropicTurns(turns: Turn[]) {
  const result: { role: "user" | "assistant"; content: string }[] = [];
  for (const t of turns) {
    const role = t.role === "user" ? "user" : "assistant";
    if (result.length === 0 && role !== "user") continue;
    if (result.length > 0 && result[result.length - 1].role === role) {
      result[result.length - 1].content += `\n\n${t.text}`;
    } else {
      result.push({ role, content: t.text });
    }
  }
  if (result.length === 0 && turns.length > 0) {
    result.push({ role: "user", content: turns[turns.length - 1].text });
  }
  return result;
}

export async function callProvider(id: ProviderId, cfg: ProviderConfig, turns: Turn[], maxTokens = 1024): Promise<string> {
  if (id === "novafree") {
    const model = cfg.model || "openai";
    // 1. Try Pollinations OpenAI-compatible endpoint
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      const r = await fetch("https://text.pollinations.ai/openai/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: turns.map((t) => ({ role: t.role, content: t.text })),
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (r.ok) {
        const j = await r.json();
        const content = j.choices?.[0]?.message?.content;
        if (content) return content.trim();
      }
    } catch {
      // fallback below
    }

    // 2. Direct Pollinations GET/POST fallback
    const lastUserTurn = [...turns].reverse().find((t) => t.role === "user")?.text || turns[turns.length - 1]?.text || "";
    const systemHistory = turns.length > 1
      ? turns.slice(0, -1).map((t) => `${t.role === "user" ? "User" : "Assistant"}: ${t.text}`).join("\n\n")
      : "";
    const prompt = systemHistory ? `${systemHistory}\n\nUser: ${lastUserTurn}` : lastUserTurn;

    const r2 = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=${encodeURIComponent(model)}&seed=${Date.now()}`);
    if (!r2.ok) throw new Error(await parseError(r2));
    const txt = await r2.text();
    return txt.trim() || "(empty response)";
  }

  if (id === "ollama") {
    const base = (cfg.baseUrl || OLLAMA_DEFAULT_URL).replace(/\/$/, "");
    const r = await fetch(`${base}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: cfg.model, max_tokens: maxTokens, stream: false, messages: turns.map((t) => ({ role: t.role, content: t.text })) }),
    });
    if (!r.ok) throw new Error(await parseError(r));
    const j = await r.json();
    return j.choices?.[0]?.message?.content ?? "";
  }

  if (!cfg.apiKey) throw new Error("No API key configured");
  const compat = OPENAI_COMPAT[id];
  if (compat) {
    const headers: Record<string, string> = { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` };
    if (id === "openrouter") { headers["HTTP-Referer"] = "https://novasmart.local"; headers["X-Title"] = "NOVASMART"; }
    const r = await fetch(compat, {
      method: "POST",
      headers,
      body: JSON.stringify({ model: cfg.model, max_tokens: maxTokens, messages: turns.map((t) => ({ role: t.role, content: t.text })) }),
    });
    if (!r.ok) throw new Error(await parseError(r));
    const j = await r.json();
    return j.choices?.[0]?.message?.content ?? "";
  }
  if (id === "anthropic") {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": cfg.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({ model: cfg.model, max_tokens: maxTokens, messages: formatAnthropicTurns(turns) }),
    });
    if (!r.ok) throw new Error(await parseError(r));
    const j = await r.json();
    return (j.content ?? []).map((c: { text?: string }) => c.text ?? "").join("");
  }
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": cfg.apiKey },
    body: JSON.stringify({
      contents: formatGeminiTurns(turns),
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  });
  if (!r.ok) throw new Error(await parseError(r));
  const j = await r.json();
  return (j.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
}

export async function testProvider(id: ProviderId) {
  const st = useSettings.getState();
  try {
    const cfg = st.providers[id] || { apiKey: "", model: "openai", status: "unknown" };
    await callProvider(id, cfg, [{ role: "user", text: "Reply with the single word: OK" }], 8);
    st.setProvider(id, { status: "ok", lastError: undefined, checkedAt: Date.now() });
    if (!st.activeProvider) st.set({ activeProvider: id });
    return true;
  } catch (e) {
    st.setProvider(id, { status: "error", lastError: friendlyError(id, (e as Error).message || "Request failed"), checkedAt: Date.now() });
    return false;
  }
}

/** Turns raw provider errors into actionable messages. */
export function friendlyError(id: ProviderId, msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("credit balance") || m.includes("insufficient_quota") || m.includes("billing") || m.includes("exceeded your current quota"))
    return `${PROVIDER_META[id].name}: no credit on this account. Automatically switching to free provider.`;
  if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("load failed"))
    return id === "ollama" ? "Ollama is not running. Start D:\\Ollama\\app\\ollama.exe (or run: ollama serve)" : `${PROVIDER_META[id].name}: network error (check internet / VPN).`;
  if (m.includes("invalid x-api-key") || m.includes("api key not valid") || m.includes("incorrect api key") || m.includes("authentication"))
    return `${PROVIDER_META[id].name}: API key is invalid.`;
  if (m.includes("not found") && m.includes("model")) return `${PROVIDER_META[id].name}: model "${useSettings.getState().providers[id]?.model}" not found.`;
  if (m.includes("rate") && m.includes("limit")) return `${PROVIDER_META[id].name}: rate limit reached, wait a minute.`;
  return `${PROVIDER_META[id].name}: ${msg}`;
}

/** Usable providers in priority order (active first). novafree is always available and free! */
export function candidateProviders(): ProviderId[] {
  const st = useSettings.getState();
  const allowed = getEffective().cfg?.allowedProviders ?? (Object.keys(st.providers) as ProviderId[]);
  const usable = (id: ProviderId) => {
    if (!allowed.includes(id)) return false;
    const p = st.providers[id];
    if (id === "novafree") return true;
    if (id === "ollama") return p?.status === "ok" || st.activeProvider === "ollama";
    return !!p?.apiKey;
  };
  const order = st.activeProvider ? [st.activeProvider, ...PROVIDER_ORDER.filter((x) => x !== st.activeProvider)] : PROVIDER_ORDER;
  const list = order.filter(usable);
  // Guarantee at least novafree is present so AI is always free and ready
  if (!list.includes("novafree") && allowed.includes("novafree")) list.push("novafree");
  return list;
}

export function resolveProvider(): ProviderId | null {
  return candidateProviders()[0] ?? null;
}

export async function sendChat(prompt: string) {
  const rt = useRuntime.getState();
  const data = useData.getState();
  const text = prompt.trim();
  if (!text || rt.aiBusy) return;
  const candidates = candidateProviders();
  const userMsg = { id: uid(), role: "user" as const, text };
  if (!candidates.length) {
    candidates.push("novafree");
  }
  const history = [...rt.chat, userMsg].filter((m) => m.role !== "error").slice(-12);
  const turns = history.map((m) => ({ role: (m.role === "user" ? "user" : "assistant") as Turn["role"], text: m.text }));
  useRuntime.setState({ chat: [...rt.chat, userMsg], aiBusy: true, aiState: "thinking", aiLast: text });
  data.addActivity({ agent: PROVIDER_META[candidates[0]]?.name || "NOVA AI", state: "thinking", text });

  const errors: string[] = [];
  // Try each usable provider in turn: a paid one without credit falls back to a free one automatically.
  for (const id of candidates) {
    const name = PROVIDER_META[id]?.name || id;
    try {
      const cfg = useSettings.getState().providers[id] || { apiKey: "", model: "openai", status: "ok" };
      const out = await callProvider(id, cfg, turns);
      useRuntime.setState((s) => ({ chat: [...s.chat, { id: uid(), role: "assistant", text: out || "(empty response)", provider: name }], aiBusy: false, aiState: "completed", aiLast: out.slice(0, 120) }));
      data.bumpAiTask();
      data.addActivity({ agent: name, state: "completed", text: out.slice(0, 140) });
      useSettings.getState().setProvider(id, { status: "ok", lastError: undefined });
      if (!useRuntime.getState().open) notify("ai", `${name} finished`, out.slice(0, 100));
      else useRuntime.getState().flashEyes("success", 3500);
      setTimeout(() => useRuntime.getState().aiBusy || useRuntime.setState({ aiState: "idle" }), 8000);
      return;
    } catch (e) {
      const msg = friendlyError(id, (e as Error).message || "Request failed");
      errors.push(msg);
      useSettings.getState().setProvider(id, { status: "error", lastError: msg });
    }
  }

  // Final fallback to 100% Free AI if all previous candidates errored
  if (!candidates.includes("novafree")) {
    try {
      const freeCfg = useSettings.getState().providers.novafree || { apiKey: "", model: "openai", status: "ok" };
      const out = await callProvider("novafree", freeCfg, turns);
      const name = PROVIDER_META.novafree.name;
      useRuntime.setState((s) => ({ chat: [...s.chat, { id: uid(), role: "assistant", text: out || "(empty response)", provider: name }], aiBusy: false, aiState: "completed", aiLast: out.slice(0, 120) }));
      data.bumpAiTask();
      data.addActivity({ agent: name, state: "completed", text: out.slice(0, 140) });
      useSettings.getState().setProvider("novafree", { status: "ok", lastError: undefined });
      if (!useRuntime.getState().open) notify("ai", `${name} finished`, out.slice(0, 100));
      else useRuntime.getState().flashEyes("success", 3500);
      setTimeout(() => useRuntime.getState().aiBusy || useRuntime.setState({ aiState: "idle" }), 8000);
      return;
    } catch (e) {
      errors.push(`Free AI fallback: ${(e as Error).message || "Failed"}`);
    }
  }

  const msg = errors.join("\n");
  useRuntime.setState((s) => ({ chat: [...s.chat, { id: uid(), role: "error", text: msg }], aiBusy: false, aiState: "failed", aiLast: errors[0] }));
  data.addActivity({ agent: "AI", state: "failed", text: errors[0] });
  notify("error", "AI request failed", errors[0]);
  setTimeout(() => useRuntime.getState().aiBusy || useRuntime.setState({ aiState: "idle" }), 8000);
}
