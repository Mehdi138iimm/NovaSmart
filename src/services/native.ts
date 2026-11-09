// Thin, safe bridge to the Rust backend. In a plain browser every call resolves to null.
export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export async function invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
  if (!isTauri) return null;
  try {
    const mod = await import("@tauri-apps/api/core");
    return await mod.invoke<T>(cmd, args);
  } catch (e) {
    console.warn(`[native] ${cmd} failed`, e);
    return null;
  }
}

export async function listen<T = unknown>(event: string, cb: (payload: T) => void): Promise<() => void> {
  if (!isTauri) return () => {};
  const mod = await import("@tauri-apps/api/event");
  return mod.listen<T>(event, (e) => cb(e.payload));
}

export async function emit(event: string, payload?: unknown) {
  if (!isTauri) return;
  const mod = await import("@tauri-apps/api/event");
  await mod.emit(event, payload);
}

export async function onFileDrop(cb: (paths: string[], phase: "enter" | "drop" | "leave") => void): Promise<() => void> {
  if (!isTauri) return () => {};
  const mod = await import("@tauri-apps/api/webview");
  return mod.getCurrentWebview().onDragDropEvent((e) => {
    const p = e.payload;
    if (p.type === "drop") cb(p.paths, "drop");
    else if (p.type === "enter") cb(p.paths, "enter");
    else if (p.type === "leave") cb([], "leave");
  });
}

export async function openExternalUrl(url: string) {
  if (isTauri) {
    try {
      await invoke("open_url", { url });
    } catch {
      window.open(url, "_blank");
    }
  } else {
    window.open(url, "_blank");
  }
}
