import { useEffect, useState } from "react";

/** Seconds elapsed since mount/activation, ticking once per second only while `active`. */
export function useServicesTick(active: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (!active) return;
    const id = setInterval(() => setN((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  return n;
}
