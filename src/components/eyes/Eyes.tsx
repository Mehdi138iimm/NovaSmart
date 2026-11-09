import { memo, useEffect, useRef, useState } from "react";
import { listen, isTauri } from "@/services/native";
import { useSettings } from "@/stores/settings";
import type { EyeMood } from "@/types";

/** Natural blink at randomised intervals. A single timeout chain, cleaned up on unmount. */
function useBlink(enabled: boolean, speed: number) {
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let t: ReturnType<typeof setTimeout>;
    let alive = true;
    const loop = () => {
      const wait = (2200 + Math.random() * 4200) / Math.max(0.3, speed);
      t = setTimeout(() => {
        if (!alive) return;
        setBlink(true);
        t = setTimeout(() => {
          if (!alive) return;
          setBlink(false);
          // occasional double blink
          if (Math.random() < 0.18) {
            t = setTimeout(() => { setBlink(true); t = setTimeout(() => { setBlink(false); loop(); }, 110); }, 160);
          } else loop();
        }, 120);
      }, wait);
    };
    loop();
    return () => { alive = false; clearTimeout(t); };
  }, [enabled, speed]);
  return blink;
}

interface Props {
  mood: EyeMood;
  /** multiplies the user's eye size */
  scale?: number;
  gap?: number;
  className?: string;
}

export const Eyes = memo(function Eyes({ mood, scale = 1, gap, className = "" }: Props) {
  const eyeSize = useSettings((s) => s.eyeSize);
  const eyeGap = useSettings((s) => s.eyeGap);
  const blinkSpeed = useSettings((s) => s.blinkSpeed);
  const blink = useBlink(mood !== "sleep" && mood !== "success" && mood !== "happy", blinkSpeed);
  const es = eyeSize * scale;

  const containerRef = useRef<HTMLDivElement>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (mood === "sleep") {
      setLook({ x: 0, y: 0 });
      return;
    }

    const calcGaze = (clientX: number, clientY: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.hypot(dx, dy);

      if (dist < 1) {
        setLook({ x: 0, y: 0 });
        return;
      }

      const maxOffset = 3.6 * es;
      const factor = Math.min(1, dist / 180);
      const lx = (dx / dist) * maxOffset * factor;
      const ly = (dy / dist) * maxOffset * factor;
      setLook({ x: lx, y: ly });
    };

    const onPointerMove = (e: MouseEvent | PointerEvent) => {
      calcGaze(e.clientX, e.clientY);
    };

    const onMouseLeave = () => {
      if (!isTauri) setLook({ x: 0, y: 0 });
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("mouseleave", onMouseLeave);

    // Global desktop cursor listener in Tauri
    let unlisten: (() => void) | undefined;
    if (isTauri) {
      listen<[number, number]>("global-cursor", (pos) => {
        if (!pos || !containerRef.current) return;
        const [screenX, screenY] = pos;
        const winX = window.screenX ?? window.screenLeft ?? 0;
        const winY = window.screenY ?? window.screenTop ?? 0;
        const rect = containerRef.current.getBoundingClientRect();
        const eyeScreenX = winX + rect.left + rect.width / 2;
        const eyeScreenY = winY + rect.top + rect.height / 2;

        const dx = screenX - eyeScreenX;
        const dy = screenY - eyeScreenY;
        const dist = Math.hypot(dx, dy);

        if (dist < 2) {
          setLook({ x: 0, y: 0 });
          return;
        }

        const maxOffset = 3.8 * es;
        const factor = Math.min(1, dist / 220);
        const lx = (dx / dist) * maxOffset * factor;
        const ly = (dy / dist) * maxOffset * factor;
        setLook({ x: lx, y: ly });
      }).then((fn) => { unlisten = fn; });
    }

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      if (unlisten) unlisten();
    };
  }, [es, mood]);

  return (
    <div
      ref={containerRef}
      className={`eyes ${blink ? "blink" : ""} ${className}`}
      data-mood={mood}
      style={{
        ["--es" as string]: es,
        ["--lx" as string]: `${look.x.toFixed(2)}px`,
        ["--ly" as string]: `${look.y.toFixed(2)}px`,
        gap: (gap ?? eyeGap) * scale,
      }}
      aria-hidden
    >
      <span className="eye" />
      <span className="eye" />
    </div>
  );
});
