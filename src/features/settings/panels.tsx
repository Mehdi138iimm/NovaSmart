import { Row, Section, Segmented, SliderRow, Toggle } from "@/components/ui/controls";
import { useT } from "@/i18n";
import { useSettings } from "@/stores/settings";
import type { LucideIcon } from "lucide-react";

export function SubLayout<T extends string>({ items, value, onChange, children }: { items: { id: T; label: string; icon: LucideIcon }[]; value: T; onChange: (v: T) => void; children: React.ReactNode }) {
  return (
    <div className="flex h-full gap-4">
      <div className="flex w-[158px] shrink-0 flex-col gap-0.5 overflow-y-auto">
        {items.map((i) => {
          const on = i.id === value;
          return (
            <button key={i.id} onClick={() => onChange(i.id)} className="flex items-center gap-2.5 rounded-[14px] px-3 py-2 text-start text-[12.5px] font-medium transition-colors" style={{ background: on ? "var(--surface-2)" : "transparent", color: on ? "var(--fg)" : "var(--fg-dim)" }}>
              <i.icon size={15} style={{ color: on ? "var(--accent)" : undefined }} /> {i.label}
            </button>
          );
        })}
      </div>
      <div className="w-px shrink-0" style={{ background: "var(--line)" }} />
      <div className="scroll min-w-0 flex-1 pe-1">{children}</div>
    </div>
  );
}

export function InteractionPanel() {
  const t = useT();
  const s = useSettings();
  return (
    <>
      <Section title={t("Interaction")}>
        <Row label={t("Interaction mode")} hint={t("Hover opens automatically, Click toggles, Both combines them.")}>
          <Segmented size="sm" value={s.interaction} onChange={(v) => s.set({ interaction: v })} options={[{ value: "hover", label: t("Hover") }, { value: "click", label: t("Click") }, { value: "both", label: t("Both") }]} />
        </Row>
        <SliderRow label={t("Open delay")} value={s.openDelay} min={0} max={1000} step={10} unit=" ms" onChange={(v) => s.set({ openDelay: v })} />
        <SliderRow label={t("Close delay")} value={s.closeDelay} min={100} max={2000} step={10} unit=" ms" onChange={(v) => s.set({ closeDelay: v })} />
        <Row label={t("Click to toggle")} hint={t("Allow the fold button / header eyes to close the panel.")}><Toggle checked={s.clickToggle} onChange={(v) => s.set({ clickToggle: v })} /></Row>
        <Row label={t("Auto close")} hint={t("Also close click-opened panels after the pointer leaves.")}><Toggle checked={s.autoClose} onChange={(v) => s.set({ autoClose: v })} /></Row>
        <Row label={t("Pin open")} hint={t("Never close automatically.")}><Toggle checked={s.pinOpen} onChange={(v) => s.set({ pinOpen: v })} /></Row>
        <Row label={t("Close on Escape")}><Toggle checked={s.closeOnEscape} onChange={(v) => s.set({ closeOnEscape: v })} /></Row>
        <Row label={t("Ignore hover while a fullscreen app is active")}><Toggle checked={s.ignoreHoverFullscreen} onChange={(v) => s.set({ ignoreHoverFullscreen: v })} /></Row>
      </Section>
      <Section title={t("Sound effects")}>
        <Row label={t("Sound effects")} hint={t("Menu clicks, toggles and island animations.")}>
          <Toggle checked={s.soundEnabled} onChange={(v) => s.set({ soundEnabled: v })} />
        </Row>
        <SliderRow label={t("Sound volume")} value={Math.round((s.soundVolume ?? 0.8) * 100)} min={0} max={100} step={5} unit="%" onChange={(v) => s.set({ soundVolume: v / 100 })} />
      </Section>
      <div className="faint mb-3 text-[11px]">{t("The island position is fixed — none of these options can make it draggable.")}</div>
    </>
  );
}
