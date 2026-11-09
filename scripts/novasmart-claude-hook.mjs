#!/usr/bin/env node
// Claude Code hook → NOVASMART agent bridge (127.0.0.1:47821).
// Reads the hook JSON from stdin and reports real status to the island.
//
//   node novasmart-claude-hook.mjs            -> status only
//   node novasmart-claude-hook.mjs --approve  -> (PreToolUse) ask for Allow / Deny in NOVASMART
//
// If NOVASMART is not running the script exits silently (exit code 0) and Claude Code continues normally.

const URL_ = process.env.NOVASMART_BRIDGE || "http://127.0.0.1:47821/agent-event";
const approve = process.argv.includes("--approve");

let raw = "";
for await (const chunk of process.stdin) raw += chunk;
let input = {};
try { input = JSON.parse(raw); } catch { process.exit(0); }

const event = input.hook_event_name;
const tool = input.tool_name ?? "";
const ti = input.tool_input ?? {};
const target = ti.command ?? ti.file_path ?? ti.path ?? ti.pattern ?? ti.url ?? "";

const stateForTool = (t) =>
  /^(Read|Grep|Glob|LS|NotebookRead)$/.test(t) ? "reading"
  : /^(Edit|Write|MultiEdit|NotebookEdit)$/.test(t) ? "editing"
  : t === "Bash" ? "executing"
  : "thinking";

let payload = { agent: "Claude Code", state: "idle" };
switch (event) {
  case "UserPromptSubmit": payload = { agent: "Claude Code", state: "thinking", message: "Working on your prompt" }; break;
  case "PreToolUse": payload = { agent: "Claude Code", state: stateForTool(tool), message: `${tool}: ${String(target).slice(0, 120)}` }; break;
  case "PostToolUse": payload = { agent: "Claude Code", state: "thinking", message: `${tool} finished` }; break;
  case "Notification": payload = { agent: "Claude Code", state: "waiting", message: input.message ?? "Needs your attention" }; break;
  case "Stop": payload = { agent: "Claude Code", state: "completed", message: "Finished responding" }; break;
  default: process.exit(0);
}

if (approve && event === "PreToolUse") {
  payload.state = "waiting";
  payload.approval = {
    id: `${input.session_id ?? "s"}-${Date.now()}`,
    kind: tool,
    description: `Claude Code wants to run ${tool}`,
    target: String(target).slice(0, 300),
  };
}

try {
  const res = await fetch(URL_, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(130_000) });
  const out = await res.json();
  if (payload.approval && (out.decision === "allow" || out.decision === "deny")) {
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: out.decision,
        permissionDecisionReason: out.decision === "allow" ? "Approved in NOVASMART" : "Denied in NOVASMART",
      },
    }));
  }
} catch {
  /* NOVASMART not running — do nothing */
}
process.exit(0);
