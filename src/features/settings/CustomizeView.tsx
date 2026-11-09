import { useState } from "react";
import { ArrowDown, ArrowUp, Bookmark, Eye, EyeOff, LayoutGrid, MousePointerClick, Navigation, PanelTop, Plus, RotateCcw, Sparkles, SwatchBook, Trash2 } from "lucide-react";
import { Eyes } from "@/components/eyes/Eyes";
import { TAB_META } from "@/components/navigation/tabs";
import { Row, Section, Segmented, SliderRow, Toggle } from "@/components/ui/controls";
import { useT } from "@/i18n";
import { DEFAULTS, THEMES, useSettings } from "@/stores/settings";
import type { CardType, ThemeId } from "@/types";
import { InteractionPanel, SubLayout } from "./panels";

type Sub = "island" | "panel" | "nav" | "modules" | "interaction" | "themes" | "presets";

const CARD_LABEL: Record<CardType, string> = { ai: "AI", music: "Music", focus: "Focus", system: "System", clock: "Clock", agenda: "Agenda", notes: "Notes" };

function IslandPanel() {
  const t = useT();
  const s = useSettings();
  return (
    <>
      <div className="mb-3 flex h-[88px] items-start justify-center overflow-hidden rounded-[20px]" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
        <div className="flex items-center justify-center bg-black" style={{ width: s.islandW, height: s.islandH, marginTop: s.islandTop, borderRadius: `${s.islandTop < 2 ? 0 : s.islandRadius}px ${s.islandTop < 2 ? 0 : s.islandRadius}px ${s.islandRadius}px ${s.islandRadius}px`, boxShadow: "0 0 0 1px rgba(255,255,255,.08)" }}>
          <Eyes mood="idle" scale={s.islandH / 34} />
        </div>
      </div>
      <Section title={t("Island")}>
        <SliderRow label={t("Width")} value={s.islandW} min={90} max={260} unit=" px" onChange={(v) => s.set({ islandW: v })} />
        <SliderRow label={t("Height")} value={s.islandH} min={26} max={52} unit=" px" onChange={(v) => s.set({ islandH: v })} />
        <SliderRow label={t("Distance from top edge")} value={s.islandTop} min={0} max={40} unit=" px" onChange={(v) => s.set({ islandTop: v })} />
        <SliderRow label={t("Corner radius")} value={s.islandRadius} min={8} max={30} unit=" px" onChange={(v) => s.set({ islandRadius: v })} />
      </Section>
      <Section title={t("Eyes")}>
        <SliderRow label={t("Eye size")} value={s.eyeSize} min={0.6} max={1.8} step={0.05} onChange={(v) => s.set({ eyeSize: v })} />
        <SliderRow label={t("Eye spacing")} value={s.eyeGap} min={6} max={32} unit=" px" onChange={(v) => s.set({ eyeGap: v })} />
        <SliderRow label={t("Blink speed")} value={s.blinkSpeed} min={0.3} max={2.5} step={0.05} onChange={(v) => s.set({ blinkSpeed: v })} />
        <Row label={t("Eye color")}><input type="color" value={s.eyeColor} onChange={(e) => s.set({ eyeColor: e.target.value, theme: "custom" })} /></Row>
      </Section>
    </>
  );
}

function PanelPanel() {
  const t = useT();
  const s = useSettings();
  return (
    <Section title={t("Panel")}>
      <SliderRow label={t("Width")} value={s.panelW} min={600} max={1000} step={10} unit=" px" onChange={(v) => s.set({ panelW: v })} />
      <SliderRow label={t("Height")} value={s.panelH} min={340} max={560} step={10} unit=" px" onChange={(v) => s.set({ panelH: v })} />
      <SliderRow label={t("Opacity")} value={s.panelOpacity} min={0.5} max={1} step={0.01} onChange={(v) => s.set({ panelOpacity: v })} />
      <SliderRow label={t("Blur")} value={s.panelBlur} min={0} max={24} unit=" px" onChange={(v) => s.set({ panelBlur: v })} />
      <SliderRow label={t("Corner radius")} value={s.panelRadius} min={16} max={48} unit=" px" onChange={(v) => s.set({ panelRadius: v })} />
      <Row label={t("Accent color")}><input type="color" value={s.accent} onChange={(e) => s.set({ accent: e.target.value, theme: "custom" })} /></Row>
      <Row label={t("Background style")} hint="Blur only affects content inside the window, not the desktop behind it."><Segmented size="sm" value={s.bgStyle} onChange={(v) => s.set({ bgStyle: v })} options={[{ value: "solid", label: t("Solid") }, { value: "tinted", label: t("Tinted") }, { value: "glass", label: t("Glass") }]} /></Row>
    </Section>
  );
}

function NavPanel() {
  const t = useT();
  const s = useSettings();
  return (
    <>
      <Section title={t("Tabs (order & visibility)")}>
        {s.navOrder.map((id, i) => {
          const hidden = s.navHidden.includes(id);
          const I = TAB_META[id].icon;
          return (
            <div key={id} className="flex items-center justify-between py-1" style={{ opacity: hidden ? 0.5 : 1 }}>
              <span className="flex items-center gap-2.5 text-[13px]"><I size={15} /> {t(TAB_META[id].label)}</span>
              <span className="flex items-center gap-0.5">
                <button className="icon-btn !h-7 !w-7" disabled={i === 0} onClick={() => s.moveTab(id, -1)} aria-label="Up"><ArrowUp size={13} /></button>
                <button className="icon-btn !h-7 !w-7" disabled={i === s.navOrder.length - 1} onClick={() => s.moveTab(id, 1)} aria-label="Down"><ArrowDown size={13} /></button>
                <button className="icon-btn !h-7 !w-7" disabled={id === "home" && !hidden} onClick={() => s.set({ navHidden: hidden ? s.navHidden.filter((x) => x !== id) : [...s.navHidden, id] })} aria-label="Toggle">{hidden ? <EyeOff size={14} /> : <Eye size={14} />}</button>
              </span>
            </div>
          );
        })}
      </Section>
      <Section title={t("Appearance")}>
        <SliderRow label={t("Icon size")} value={s.navIconSize} min={14} max={24} unit=" px" onChange={(v) => s.set({ navIconSize: v })} />
        <SliderRow label={t("Spacing between icons")} value={s.navGap} min={0} max={14} unit=" px" onChange={(v) => s.set({ navGap: v })} />
        <Row label={t("Show active tab name")}><Toggle checked={s.navShowLabel} onChange={(v) => s.set({ navShowLabel: v })} /></Row>
      </Section>
    </>
  );
}

function ModulesPanel() {
  const t = useT();
  const s = useSettings();
  const [type, setType] = useState<CardType>("system");
  return (
    <>
      <Section title={t("Home cards")}>
        {s.homeCards.length === 0 && <div className="faint py-3 text-[12px]">{t("No cards — add one below.")}</div>}
        {s.homeCards.map((c, i) => (
          <div key={c.uid} className="flex items-center justify-between gap-2 py-1.5">
            <span className="min-w-[70px] text-[13px] font-medium" style={{ opacity: c.enabled ? 1 : 0.5 }}>{t(CARD_LABEL[c.type])}</span>
            <Segmented size="sm" value={c.size} onChange={(v) => s.patchCard(c.uid, { size: v })} options={[{ value: "sm", label: "S" }, { value: "md", label: "M" }, { value: "lg", label: "L" }]} />
            <span className="flex items-center gap-0.5">
              <Toggle checked={c.enabled} onChange={(v) => s.patchCard(c.uid, { enabled: v })} />
              <button className="icon-btn !h-7 !w-7" disabled={i === 0} onClick={() => s.moveCard(c.uid, -1)} aria-label="Up"><ArrowUp size={13} /></button>
              <button className="icon-btn !h-7 !w-7" disabled={i === s.homeCards.length - 1} onClick={() => s.moveCard(c.uid, 1)} aria-label="Down"><ArrowDown size={13} /></button>
              <button className="icon-btn !h-7 !w-7" onClick={() => s.removeCard(c.uid)} aria-label="Remove"><Trash2 size={13} /></button>
            </span>
          </div>
        ))}
      </Section>
      <Section title={t("Add card")}>
        <div className="flex items-center gap-2 py-2">
          <select className="input" value={type} onChange={(e) => setType(e.target.value as CardType)}>{(Object.keys(CARD_LABEL) as CardType[]).map((k) => <option key={k} value={k}>{t(CARD_LABEL[k])}</option>)}</select>
          <button className="btn btn-accent" onClick={() => s.addCard(type)}><Plus size={14} /> {t("Add")}</button>
        </div>
      </Section>
      <div className="faint mb-3 text-[11px]">{t("Menu (tab) order is under Navigation.")}</div>
    </>
  );
}

function ThemesPanel() {
  const t = useT();
  const s = useSettings();
  return (
    <>
      <Section title={t("Themes")}>
        <div className="grid grid-cols-3 gap-2 py-2.5">
          {(Object.keys(THEMES) as ThemeId[]).map((id) => {
            const th = THEMES[id];
            const on = s.theme === id;
            return (
              <button key={id} onClick={() => { s.applyTheme(id); }} className="rounded-[18px] p-2.5 text-start transition-colors cursor-pointer" style={{ background: "var(--surface)", border: `1.5px solid ${on ? "var(--accent)" : "var(--line)"}` }}>
                <div className="mb-2 flex h-10 items-center justify-center gap-2 rounded-xl" style={{ background: id === "custom" ? s.panelColor : th.panel, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.08)" }}>
                  <span className="h-3 w-1.5 rounded-full" style={{ background: id === "custom" ? s.eyeColor : th.eye }} /><span className="h-3 w-1.5 rounded-full" style={{ background: id === "custom" ? s.eyeColor : th.eye }} />
                  <span className="ms-2 h-2.5 w-2.5 rounded-full" style={{ background: id === "custom" ? s.accent : th.accent }} />
                </div>
                <div className="text-[12px] font-semibold">{t(th.name)}</div>
              </button>
            );
          })}
        </div>
      </Section>
      <Section title={t("Custom theme")}>
        <Row label={t("Accent")}><input type="color" value={s.accent} onChange={(e) => s.set({ accent: e.target.value, theme: "custom" })} /></Row>
        <Row label={t("Eye color")}><input type="color" value={s.eyeColor} onChange={(e) => s.set({ eyeColor: e.target.value, theme: "custom" })} /></Row>
        <Row label={t("Panel background")}><input type="color" value={s.panelColor} onChange={(e) => s.set({ panelColor: e.target.value, theme: "custom" })} /></Row>
      </Section>
    </>
  );
}

function PresetsPanel() {
  const t = useT();
  const s = useSettings();
  const [name, setName] = useState("");
  return (
    <>
      <Section title={t("Save current setup")}>
        <div className="flex gap-2 py-2.5">
          <input className="input" dir="auto" placeholder="e.g. Gaming Setup" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) { s.savePreset(name.trim()); setName(""); } }} />
          <button className="btn btn-accent" disabled={!name.trim()} onClick={() => { s.savePreset(name.trim()); setName(""); }}><Bookmark size={13} /> {t("Save")}</button>
        </div>
        <div className="faint pb-2 text-[11px]">{t("Presets store look, layout and interaction — never API keys or accounts.")}</div>
      </Section>
      <Section title={t("Saved presets")}>
        {s.presets.length === 0 && <div className="faint py-3 text-[12px]">{t("No presets yet.")}</div>}
        {s.presets.map((p) => (
          <div key={p.id} className="flex items-center justify-between py-1.5">
            <span className="text-[13px] font-medium" dir="auto">{p.name}</span>
            <span className="flex gap-1.5"><button className="btn" onClick={() => s.loadPreset(p.id)}>{t("Load")}</button><button className="icon-btn" onClick={() => s.deletePreset(p.id)} aria-label="Delete"><Trash2 size={14} /></button></span>
          </div>
        ))}
      </Section>
    </>
  );
}

export default function CustomizeView() {
  const t = useT();
  const [sub, setSub] = useState<Sub>("island");
  const reset = useSettings((s) => s.set);
  const items = [
    { id: "island" as const, label: t("Island & Eyes"), icon: Sparkles },
    { id: "panel" as const, label: t("Panel"), icon: PanelTop },
    { id: "nav" as const, label: t("Navigation"), icon: Navigation },
    { id: "modules" as const, label: t("Modules"), icon: LayoutGrid },
    { id: "interaction" as const, label: t("Interaction"), icon: MousePointerClick },
    { id: "themes" as const, label: t("Themes"), icon: SwatchBook },
    { id: "presets" as const, label: t("Presets"), icon: Bookmark },
  ];
  const resetVisuals = () => {
    const keys = Object.keys(DEFAULTS).filter((k) => !["providers", "activeProvider", "mailClientId", "modes", "activeMode", "lang", "autostart", "monitor"].includes(k));
    const patch: Record<string, unknown> = {};
    for (const k of keys) patch[k] = JSON.parse(JSON.stringify((DEFAULTS as unknown as Record<string, unknown>)[k]));
    reset(patch);
  };
  return (
    <SubLayout items={items} value={sub} onChange={setSub}>
      {sub === "island" && <IslandPanel />}
      {sub === "panel" && <PanelPanel />}
      {sub === "nav" && <NavPanel />}
      {sub === "modules" && <ModulesPanel />}
      {sub === "interaction" && <InteractionPanel />}
      {sub === "themes" && <ThemesPanel />}
      {sub === "presets" && <PresetsPanel />}
      <button className="btn mb-4" onClick={resetVisuals}><RotateCcw size={13} /> {t("Reset to default")}</button>
    </SubLayout>
  );
}

