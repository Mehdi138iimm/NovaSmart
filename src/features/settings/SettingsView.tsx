import { useEffect, useState } from "react";
import { Check, ExternalLink, Globe, Heart, Info, KeyRound, MousePointerClick, Palette, Settings2, ShieldCheck, Sparkles, Unplug, Zap } from "lucide-react";
import { Row, Section, Segmented, SliderRow, Toggle } from "@/components/ui/controls";
import { useT } from "@/i18n";
import { PROVIDER_META, testProvider } from "@/services/ai";
import { invoke, isTauri, openExternalUrl } from "@/services/native";
import { useData } from "@/stores/data";
import { useSettings } from "@/stores/settings";
import type { ProviderId } from "@/types";
import { InteractionPanel, SubLayout } from "./panels";

type Sub = "general" | "appearance" | "language" | "interaction" | "performance" | "ai" | "privacy" | "about";

function General() {
  const t = useT();
  const s = useSettings();
  const [monitors, setMonitors] = useState<{ name: string; primary: boolean }[]>([]);
  useEffect(() => { invoke<{ name: string; primary: boolean }[]>("list_monitors").then((m) => m && setMonitors(m)); }, []);
  return (
    <>
      <Section title={t("General")}>
        <Row label={t("Launch at Windows startup")} hint={isTauri ? undefined : t("Desktop app only")}><Toggle checked={s.autostart} onChange={(v) => s.set({ autostart: v })} /></Row>
        <Row label={t("Start minimized (tray only)")}><Toggle checked={s.startMinimized} onChange={(v) => s.set({ startMinimized: v })} /></Row>
        <Row label={t("Show island")}><Toggle checked={s.showIsland} onChange={(v) => s.set({ showIsland: v })} /></Row>
        <Row label={t("Display")} hint={t("The island always stays centred on the top edge of this display.")}>
          <select className="input !w-[170px] !py-1" value={s.monitor} onChange={(e) => s.set({ monitor: +e.target.value })}>
            <option value={-1}>{t("Primary display")}</option>
            {monitors.map((m, i) => <option key={i} value={i}>{m.name || `${t("Display")} ${i + 1}`}{m.primary ? ` (${t("Primary")})` : ""}</option>)}
          </select>
        </Row>
        <SliderRow label={t("Vertical offset")} value={s.islandTop} min={0} max={40} unit=" px" onChange={(v) => s.set({ islandTop: v })} />
      </Section>
      <button className="btn btn-danger mb-4" onClick={() => { if (confirm(t("Reset all settings to defaults? (AI keys are kept)"))) s.resetAll(); }}>{t("Reset to default")}</button>
    </>
  );
}

function Appearance() {
  const t = useT();
  const s = useSettings();
  return (
    <>
      <Section title={t("Appearance")}>
        <Row label={t("Color mode")}><Segmented size="sm" value={s.colorMode} onChange={(v) => s.set({ colorMode: v })} options={[{ value: "dark", label: t("Dark") }, { value: "light", label: t("Light") }, { value: "system", label: t("System") }]} /></Row>
        <Row label={t("Accent color")}><input type="color" value={s.accent} onChange={(e) => s.set({ accent: e.target.value, theme: "custom" })} /></Row>
        <Row label={t("Eye color")}><input type="color" value={s.eyeColor} onChange={(e) => s.set({ eyeColor: e.target.value, theme: "custom" })} /></Row>
        <SliderRow label={t("Animation intensity")} value={s.animationIntensity} min={0} max={1.5} step={0.05} onChange={(v) => s.set({ animationIntensity: v })} />
        <SliderRow label={t("Panel opacity")} value={s.panelOpacity} min={0.5} max={1} step={0.01} onChange={(v) => s.set({ panelOpacity: v })} />
      </Section>
      <div className="faint mb-3 text-[11px]">{t("More options (themes, sizes, layout) live in Customize.")}</div>
    </>
  );
}

function Language() {
  const t = useT();
  const s = useSettings();
  return (
    <Section title={t("Language")}>
      <Row label={t("Language")} hint={t("Layout direction (RTL/LTR) follows the language automatically.")}><Segmented value={s.lang} onChange={(v) => s.set({ lang: v })} options={[{ value: "en", label: "English" }, { value: "fa", label: "فارسی" }]} /></Row>
      <Row label={t("Fonts")} hint={t("Inter for English, Vazirmatn for Persian (bundled, works offline).")}><span className="muted text-[12px]">{s.lang === "fa" ? "Vazirmatn" : "Inter"}</span></Row>
    </Section>
  );
}

function Performance() {
  const t = useT();
  const s = useSettings();
  return (
    <Section title={t("Performance")}>
      <Row label={t("Low resource mode")} hint={t("Simpler animations and slower polling.")}><Toggle checked={s.lowResource} onChange={(v) => s.set({ lowResource: v })} /></Row>
      <Row label={t("Animation quality")}><Segmented size="sm" value={s.animationQuality} onChange={(v) => s.set({ animationQuality: v })} options={[{ value: "high", label: t("High") }, { value: "balanced", label: t("Balanced") }, { value: "low", label: t("Low") }]} /></Row>
      <Row label={t("Background activity")} hint={t("Clipboard recording, media session, reminders.")}><Toggle checked={s.backgroundActivity} onChange={(v) => s.set({ backgroundActivity: v })} /></Row>
      <SliderRow label={t("System monitoring interval")} value={s.sysInterval} min={1000} max={10000} step={500} unit=" ms" onChange={(v) => s.set({ sysInterval: v })} />
      <div className="faint pb-2 text-[11px]">{t("Metrics are only sampled while the panel is open; nothing runs while it is folded.")}</div>
    </Section>
  );
}

function AISettings() {
  const t = useT();
  const s = useSettings();
  const [busy, setBusy] = useState<ProviderId | null>(null);
  const [show, setShow] = useState<ProviderId | null>(null);
  return (
    <>
      {(Object.keys(PROVIDER_META) as ProviderId[]).map((id) => {
        const p = s.providers[id] || { apiKey: "", model: "openai", status: "unknown" };
        const isFree = id === "novafree";
        const local = id === "ollama";
        const badKey = id === "anthropic" && p.apiKey.startsWith("sk-ant-") && !p.apiKey.startsWith("sk-ant-api");

        if (isFree) {
          const st = p.status === "error" ? "Error" : t("Connected");
          const c = p.status === "error" ? "#f87171" : "#4ade80";
          return (
            <Section key={id} title={`${PROVIDER_META[id].name} · ${t("100% Free · Active")}`} right={<span className="flex items-center gap-1.5 text-[11px]" style={{ color: c }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: "currentColor" }} />{st}</span>}>
              <div className="space-y-2 py-2">
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="muted">{t("Default Model")}</span>
                  <select className="input !w-[200px] !py-1" value={p.model || "openai"} onChange={(e) => s.setProvider(id, { model: e.target.value })}>
                    <option value="openai">OpenAI (Fast & Smart)</option>
                    <option value="qwen">Qwen 2.5 (Multilingual)</option>
                    <option value="mistral">Mistral Nemo</option>
                    <option value="deepseek">DeepSeek Chat</option>
                    <option value="llama">Llama 3.3</option>
                  </select>
                </div>
                {p.status === "error" && p.lastError && <div className="text-[11.5px]" style={{ color: "#f87171" }}>{p.lastError}</div>}
                <div className="flex flex-wrap items-center gap-2">
                  <button className="btn btn-accent" disabled={busy === id} onClick={async () => { setBusy(id); await testProvider(id); setBusy(null); }}>{busy === id ? t("Testing…") : t("Test connection")}</button>
                  <button className="btn" disabled={s.activeProvider === id} onClick={() => s.set({ activeProvider: id })}>{s.activeProvider === id ? <><Check size={13} /> {t("Default")}</> : t("Make default")}</button>
                  <span className="faint text-[10.5px]" dir="ltr">{t("No key, no fees · Free forever")}</span>
                </div>
              </div>
            </Section>
          );
        }

        if (local) {
          const st = p.status === "ok" ? t("Connected") : p.status === "error" ? "Error" : t("Untested");
          const c = p.status === "ok" ? "#4ade80" : p.status === "error" ? "#f87171" : "#facc15";
          return (
            <Section key={id} title={`${PROVIDER_META[id].name} · Free, local`} right={<span className="flex items-center gap-1.5 text-[11px]" style={{ color: c }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: "currentColor" }} />{st}</span>}>
              <div className="space-y-2 py-2">
                <input className="input" dir="ltr" placeholder={t("Server URL")} value={p.baseUrl ?? ""} onChange={(e) => s.setProvider(id, { baseUrl: e.target.value.trim(), status: "unknown" })} />
                <input className="input" dir="ltr" placeholder={t("Model")} value={p.model} onChange={(e) => s.setProvider(id, { model: e.target.value.trim(), status: "unknown" })} />
                {p.status === "error" && p.lastError && <div className="text-[11.5px]" style={{ color: "#f87171" }}>{p.lastError}</div>}
                <div className="flex flex-wrap items-center gap-2">
                  <button className="btn btn-accent" disabled={busy === id} onClick={async () => { setBusy(id); await testProvider(id); setBusy(null); }}>{busy === id ? t("Testing…") : t("Test connection")}</button>
                  <button className="btn" disabled={s.activeProvider === id || p.status !== "ok"} onClick={() => s.set({ activeProvider: id })}>{s.activeProvider === id ? <><Check size={13} /> {t("Default")}</> : t("Make default")}</button>
                  <span className="faint text-[10.5px]" dir="ltr">No key, no cost · ollama.com → ollama pull {p.model}</span>
                </div>
              </div>
            </Section>
          );
        }

        const status = !p.apiKey ? t("Disconnected") : p.status === "ok" ? t("Connected") : p.status === "error" ? "Error" : t("Untested");
        const color = !p.apiKey ? "var(--fg-faint)" : p.status === "ok" ? "#4ade80" : p.status === "error" ? "#f87171" : "#facc15";
        return (
          <Section key={id} title={`${PROVIDER_META[id].name}${PROVIDER_META[id].free ? ` · ${t("Free key")}` : ` · ${t("Custom Key")}`}`} right={<span className="flex items-center gap-1.5 text-[11px]" style={{ color }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: "currentColor" }} />{status}</span>}>
            <div className="space-y-2 py-2">
              <div className="flex gap-2">
                <input className="input" dir="ltr" type={show === id ? "text" : "password"} placeholder={`${t("API key")} (${PROVIDER_META[id].keyHint})`} value={p.apiKey} onChange={(e) => s.setProvider(id, { apiKey: e.target.value.trim(), status: "unknown", lastError: undefined })} autoComplete="off" />
                <button className="btn" onClick={() => setShow(show === id ? null : id)}><KeyRound size={13} /></button>
              </div>
              <input className="input" dir="ltr" placeholder={t("Model")} value={p.model} onChange={(e) => s.setProvider(id, { model: e.target.value.trim() })} />
              {badKey && <div className="text-[11.5px]" style={{ color: "#facc15" }}>This doesn't look like an API key (they start with sk-ant-api03-). Create one at console.anthropic.com/settings/keys.</div>}
              {p.status === "error" && p.lastError && <div className="text-[11.5px]" style={{ color: "#f87171" }}>{p.lastError}</div>}
              <div className="flex flex-wrap items-center gap-2">
                <button className="btn btn-accent" disabled={!p.apiKey || busy === id} onClick={async () => { setBusy(id); await testProvider(id); setBusy(null); }}>{busy === id ? t("Testing…") : t("Test connection")}</button>
                <button className="btn" disabled={!p.apiKey} onClick={() => s.setProvider(id, { apiKey: "", status: "unknown", lastError: undefined })}><Unplug size={13} /> {t("Disconnect")}</button>
                <button className="btn" disabled={!p.apiKey || s.activeProvider === id} onClick={() => s.set({ activeProvider: id })}>{s.activeProvider === id ? <><Check size={13} /> {t("Default")}</> : t("Make default")}</button>
                <span className="faint text-[10.5px]" dir="ltr">{PROVIDER_META[id].docs}</span>
              </div>
            </div>
          </Section>
        );
      })}
      <div className="faint mb-4 text-[11px] leading-relaxed">{t("Keys are stored locally on this device and are only sent to the provider you choose. Free AI is active out of the box with zero setup.")}</div>
    </>
  );
}

function Privacy() {
  const t = useT();
  const s = useSettings();
  const d = useData();
  return (
    <>
      <Section title={t("Privacy")}>
        <Row label={t("Record clipboard history")}><Toggle checked={s.clipboardEnabled} onChange={(v) => s.set({ clipboardEnabled: v })} /></Row>
        <Row label={t("Store sensitive-looking text")} hint={t("Passwords, tokens and card numbers are skipped unless you allow it.")}><Toggle checked={s.allowSensitive} onChange={(v) => s.set({ allowSensitive: v })} /></Row>
        <Row label={t("Keep file shelf between launches")}><Toggle checked={s.filesPersist} onChange={(v) => s.set({ filesPersist: v })} /></Row>
        <Row label={t("OS notifications")}><Toggle checked={s.osNotifications} onChange={(v) => s.set({ osNotifications: v })} /></Row>
      </Section>
      <Section title={t("Local data")}>
        <Row label={`${t("Clipboard history")} (${d.clips.length})`}><button className="btn" onClick={d.clearClips}>{t("Clear")}</button></Row>
        <Row label={`${t("Notifications")} (${d.notifs.length})`}><button className="btn" onClick={d.clearNotifs}>{t("Clear")}</button></Row>
        <Row label={`${t("Focus history")} (${d.focusHistory.length})`}><button className="btn" onClick={d.clearFocusHistory}>{t("Clear")}</button></Row>
        <Row label={`${t("AI activity")} (${d.activity.length})`}><button className="btn" onClick={d.clearActivity}>{t("Clear")}</button></Row>
        <Row label={t("Everything (notes, events, files…)")}><button className="btn btn-danger" onClick={() => { if (confirm(t("Delete ALL local NOVASMART data? This cannot be undone."))) d.wipeAll(); }}>{t("Delete all")}</button></Row>
      </Section>
    </>
  );
}

function About() {
  const lang = useSettings((s) => s.lang);
  const openDonate = () => {
    openExternalUrl("https://daramet.com/novasmart");
  };
  const openWebsite = () => {
    openExternalUrl("https://mehdi138iimm.github.io/NovaSmart/");
  };

  const isFa = lang === "fa";

  return (
    <div className="scroll max-h-[440px] space-y-3.5 pr-1">
      {/* Official Website Card */}
      <div
        className="rounded-[22px] p-3.5 shadow-lg"
        style={{
          background: "linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.1))",
          border: "1px solid rgba(59, 130, 246, 0.3)",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
              <Globe size={18} />
            </div>
            <div>
              <div className="text-[13px] font-bold" style={{ color: "var(--fg)" }}>
                {isFa ? "وب‌سایت رسمی NOVASMART" : "NOVASMART Official Website"}
              </div>
              <div className="faint text-[10.5px]">
                mehdi138iimm.github.io/NovaSmart
              </div>
            </div>
          </div>
          <button
            className="btn btn-accent flex shrink-0 items-center gap-1.5 !bg-[#3b82f6] !text-[#fff] !font-semibold"
            onClick={openWebsite}
          >
            <span>{isFa ? "مشاهده وب‌سایت" : "Visit Website"}</span>
            <ExternalLink size={13} />
          </button>
        </div>
      </div>

      {/* Donate Card */}
      <div
        className="rounded-[22px] p-3.5 shadow-lg"
        style={{
          background: "linear-gradient(135deg, rgba(250, 204, 21, 0.12), rgba(245, 158, 11, 0.06))",
          border: "1px solid rgba(250, 204, 21, 0.25)",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <Heart size={18} />
            </div>
            <div>
              <div className="text-[13px] font-bold" style={{ color: "var(--fg)" }}>
                {isFa ? "حمایت از توسعه NOVASMART" : "Support NOVASMART Development"}
              </div>
              <div className="faint text-[10.5px]">
                {isFa ? "توسعه مستقل و رایگان برای همه کاربران" : "Independent development, 100% free"}
              </div>
            </div>
          </div>
          <button
            className="btn btn-accent flex shrink-0 items-center gap-1.5 !bg-[#facc15] !text-[#000] !font-semibold"
            onClick={openDonate}
          >
            <span>{isFa ? "حمایت مالی" : "Donate"}</span>
            <ExternalLink size={13} />
          </button>
        </div>
      </div>

      {/* About Content */}
      <Section title={isFa ? "درباره NOVASMART" : "About NOVASMART"}>
        <div className="space-y-2 py-1 text-[12px] leading-relaxed">
          <div className="text-[13.5px] font-bold text-[var(--accent)]">
            {isFa ? "فناوری هوشمند، تجربه‌ای ساده‌تر" : "Smart Technology, Simpler Life"}
          </div>
          <p className="muted">
            {isFa
              ? "NOVASMART یک پروژه مستقل در زمینه توسعه نرم‌افزارهای دسکتاپ و ابزارهای هوشمند برای سیستم‌عامل ویندوز است."
              : "NOVASMART is an independent desktop project bringing Apple-like Smart Island & productivity suite to Windows."}
          </p>
          <p className="muted">
            {isFa
              ? "هدف ما ساخت تجربه‌ای متفاوت از تعامل با کامپیوتر است؛ تجربه‌ای که در آن فناوری، طراحی و هوشمندی در کنار یکدیگر قرار می‌گیرند تا کارهای روزمره ساده‌تر، سریع‌تر و لذت‌بخش‌تر شوند."
              : "Our vision is to elevate daily computing with seamless multitasking, AI assistance, media widgets, and native performance."}
          </p>
        </div>
      </Section>

      <Section title={isFa ? "ارزش‌های ما" : "Our Values"}>
        <ul className="space-y-1.5 py-1 text-[12px]">
          <li className="flex items-start gap-2">
            <span className="font-semibold text-[var(--fg)]">• {isFa ? "سادگی:" : "Simplicity:"}</span>
            <span className="muted">{isFa ? "تجربه کاربری روان و بدون پیچیدگی." : "Clean, distraction-free user experience."}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold text-[var(--fg)]">• {isFa ? "نوآوری:" : "Innovation:"}</span>
            <span className="muted">{isFa ? "استفاده از فناوری‌های مدرن برای خلق امکانات جدید." : "Modern architecture and fluid spring physics."}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold text-[var(--fg)]">• {isFa ? "عملکرد:" : "Performance:"}</span>
            <span className="muted">{isFa ? "توجه ویژه به سرعت و مصرف بهینه منابع سیستم." : "Ultra-lightweight Rust backend and zero lag."}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold text-[var(--fg)]">• {isFa ? "حریم خصوصی:" : "Privacy:"}</span>
            <span className="muted">{isFa ? "احترام به اطلاعات و امنیت کاربران." : "100% local storage and data isolation."}</span>
          </li>
        </ul>
      </Section>

      <Section title={isFa ? "سازنده پروژه" : "Project Founder"}>
        <div className="space-y-1.5 py-1 text-[12px]">
          <p className="muted">{isFa ? "NOVASMART با تلاش و علاقه مستقل توسعه داده می‌شود." : "NOVASMART is independently developed with passion."}</p>
          <div className="flex items-center justify-between rounded-xl bg-white/5 p-2.5">
            <div>
              <div className="text-[13px] font-bold text-[var(--fg)]">Mehdi Jafari</div>
              <div className="faint text-[11px]">Founder & Developer</div>
            </div>
            <div className="faint text-[10.5px]">NOVASMART v1.4.1</div>
          </div>
        </div>
      </Section>

      <div className="faint text-center text-[11px] leading-relaxed pt-2">
        <div>{isFa ? "از همراهی و اعتماد شما سپاسگزاریم." : "Thank you for your support and trust."}</div>
        <div className="font-semibold text-[var(--fg)] mt-1">NOVASMART — Smarter Experience, Simpler Life.</div>
      </div>
    </div>
  );
}

export default function SettingsView() {
  const t = useT();
  const [sub, setSub] = useState<Sub>("general");
  const items = [
    { id: "general" as const, label: t("General"), icon: Settings2 },
    { id: "appearance" as const, label: t("Appearance"), icon: Palette },
    { id: "language" as const, label: t("Language"), icon: Globe },
    { id: "interaction" as const, label: t("Interaction"), icon: MousePointerClick },
    { id: "performance" as const, label: t("Performance"), icon: Zap },
    { id: "ai" as const, label: t("AI Settings"), icon: Sparkles },
    { id: "privacy" as const, label: t("Privacy"), icon: ShieldCheck },
    { id: "about" as const, label: t("About"), icon: Info },
  ];
  return (
    <SubLayout items={items} value={sub} onChange={setSub}>
      {sub === "general" && <General />}
      {sub === "appearance" && <Appearance />}
      {sub === "language" && <Language />}
      {sub === "interaction" && <InteractionPanel />}
      {sub === "performance" && <Performance />}
      {sub === "ai" && <AISettings />}
      {sub === "privacy" && <Privacy />}
      {sub === "about" && <About />}
    </SubLayout>
  );
}
