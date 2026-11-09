import { useEffect, useState } from "react";

/** Clock that ticks once per minute (aligned to the minute boundary), or per second if requested. */
export function useClock(perSecond = false) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const step = () => {
      const d = new Date();
      setNow(d);
      const wait = perSecond ? 1000 - d.getMilliseconds() : 60000 - (d.getSeconds() * 1000 + d.getMilliseconds());
      t = setTimeout(step, wait + 20);
    };
    step();
    return () => clearTimeout(t);
  }, [perSecond]);
  return now;
}

export function fmtClock(d: Date, lang: "en" | "fa") {
  return new Intl.DateTimeFormat(lang === "fa" ? "fa-IR-u-nu-latn" : "en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}

export function fmtDate(d: Date, lang: "en" | "fa") {
  return new Intl.DateTimeFormat(lang === "fa" ? "fa-IR-u-ca-persian" : "en-US", { weekday: "long", day: "numeric", month: "short" }).format(d);
}
