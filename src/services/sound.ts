import { useSettings } from "@/stores/settings";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export type SoundType =
  | "click"
  | "tab"
  | "toggle"
  | "open"
  | "close"
  | "notification"
  | "success"
  | "delete"
  | "focusBell";

export function playSound(type: SoundType, customVol?: number) {
  const settings = useSettings.getState();
  if (settings.soundEnabled === false) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const baseVol = (settings.soundVolume ?? 0.8) * (customVol ?? 1);
  if (baseVol <= 0.001) return;

  const now = ctx.currentTime;

  switch (type) {
    case "click": {
      // Crisp subtle UI micro-tap / haptic click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.025);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.18 * baseVol, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.03);
      break;
    }

    case "tab": {
      // Soft organic pop for tab & navigation switching
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(840, now + 0.035);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.22 * baseVol, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
      break;
    }

    case "toggle": {
      // Satisfying two-tone toggle switch
      [900, 1350].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + i * 0.02);

        gain.gain.setValueAtTime(0.0001, now + i * 0.02);
        gain.gain.linearRampToValueAtTime(0.15 * baseVol, now + i * 0.02 + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.02 + 0.025);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.02);
        osc.stop(now + i * 0.02 + 0.03);
      });
      break;
    }

    case "open": {
      // Dynamic Island smooth expand whoosh
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.07);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.14 * baseVol, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.085);
      break;
    }

    case "close": {
      // Dynamic Island fold-in whoosh
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.06);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.12 * baseVol, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
      break;
    }

    case "notification": {
      // Crystal clear 2-tone Dynamic Island notification chime (E6 -> G#6)
      const notes = [
        { f: 1318.51, delay: 0, dur: 0.35 },
        { f: 1661.22, delay: 0.12, dur: 0.45 },
      ];
      notes.forEach(({ f, delay, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, now + delay);

        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.linearRampToValueAtTime(0.24 * baseVol, now + delay + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + dur + 0.05);
      });
      break;
    }

    case "success": {
      // Triad ascending success chime (C6 -> E6 -> G6)
      const triad = [1046.5, 1318.5, 1567.98];
      triad.forEach((freq, idx) => {
        const delay = idx * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + delay);

        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.linearRampToValueAtTime(0.2 * baseVol, now + delay + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.4);
      });
      break;
    }

    case "delete": {
      // Gentle delete / remove sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.04);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.18 * baseVol, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
      break;
    }

    case "focusBell": {
      // Calming harmonic meditation chime
      const harmonics = [528, 1056, 1584];
      harmonics.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        const amp = (0.22 / (idx + 1)) * baseVol;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(amp, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.9);
      });
      break;
    }
  }
}
