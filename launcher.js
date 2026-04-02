/**
 * Universal Launcher
 * Starts all 11 projects (backends + frontends where needed) concurrently.
 *
 * Usage:
 *   node launcher.js
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const net = require("net");
const NPM_CMD = process.platform === "win32" ? "npm.cmd" : "npm";
const DEBUG_ENDPOINT = "http://127.0.0.1:7702/ingest/cb27c6f4-7e52-4bfa-9fd9-a8571789694d";
const DEBUG_SESSION_ID = "d56b4c";

function exists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function resolvePython(startDir) {
  // The instruction says to use venv "if a .venv or venv folder exists in that sub-folder".
  // In practice venvs might be created at either:
  // - the exact folder we run from (cwd)
  // - or the project root (parent of cwd)
  const dirsToCheck = [
    startDir,
    path.dirname(startDir),
    path.dirname(path.dirname(startDir)),
  ];

  const candidates = [];
  for (const d of dirsToCheck) {
    candidates.push(path.join(d, ".venv", "Scripts", "python.exe"));
    candidates.push(path.join(d, "venv", "Scripts", "python.exe"));
  }

  for (const c of candidates) {
    if (exists(c)) return c;
  }

  return "python";
}

function spawnProcess({ name, cmd, args, cwd, env, shell = false }) {
  const pretty = `${name}: ${cmd} ${args.join(" ")}`;
  console.log(`\n[START] ${pretty}\n`);
  // #region agent log
  if (String(name).toLowerCase().includes("(frontend)")) {
    fetch(DEBUG_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": DEBUG_SESSION_ID,
      },
      body: JSON.stringify({
        sessionId: DEBUG_SESSION_ID,
        runId: "post-fix",
        hypothesisId: "H1",
        location: "launcher.js:spawnProcess:frontend",
        message: "spawning frontend process",
        data: { name, cmd, args, shell, platform: process.platform },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }
  // #endregion

  // Windows reliability: use cmd.exe for npm.cmd invocations.
  // This avoids ENOENT/EINVAL issues with direct spawn of npm.cmd.
  let spawnCmd = cmd;
  let spawnArgs = args;
  let spawnShell = shell;
  if (process.platform === "win32" && String(cmd).toLowerCase() === "npm.cmd") {
    spawnCmd = "cmd.exe";
    spawnArgs = ["/c", `${cmd} ${args.join(" ")}`];
    spawnShell = false;
  }

  // #region agent log
  if (String(name).toLowerCase().includes("(frontend)")) {
    fetch(DEBUG_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": DEBUG_SESSION_ID,
      },
      body: JSON.stringify({
        sessionId: DEBUG_SESSION_ID,
        runId: "post-fix",
        hypothesisId: "H4",
        location: "launcher.js:spawnProcess:frontendResolvedCommand",
        message: "resolved frontend spawn command",
        data: {
          name,
          requestedCmd: cmd,
          requestedArgs: args,
          spawnCmd,
          spawnArgs,
          spawnShell,
          cwd,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }
  // #endregion

  const child = spawn(spawnCmd, spawnArgs, {
    cwd,
    env: { ...process.env, ...(env || {}) },
    stdio: "inherit",
    shell: spawnShell,
  });

  child.on("error", (err) => {
    console.log(`\n[SPAWN-ERROR] ${name} failed: ${err && err.message ? err.message : String(err)}\n`);
    // #region agent log
    fetch(DEBUG_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": DEBUG_SESSION_ID,
      },
      body: JSON.stringify({
        sessionId: DEBUG_SESSION_ID,
        runId: "post-fix",
        hypothesisId: "H1",
        location: "launcher.js:spawnProcess:error",
        message: "child spawn error",
        data: { name, cmd, args, code: err && err.code, err: err && err.message },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  });

  child.on("exit", (code) => {
    console.log(`\n[EXIT] ${name} exited with code ${code}\n`);
  });
  return child;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function checkTcpPortOnceHost(port, host, timeoutMs = 600) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (ok) => {
      if (settled) return;
      settled = true;
      try {
        socket.destroy();
      } catch {
        // ignore
      }
      resolve(ok);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}

async function checkTcpPortOnce(port, timeoutMs = 600, hosts = ["127.0.0.1", "::1", "localhost"]) {
  for (const host of hosts) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await checkTcpPortOnceHost(port, host, timeoutMs);
    if (ok) return true;
  }
  return false;
}

async function waitForTcpPort(
  port,
  _hostIgnored,
  { timeoutMs = 45000, intervalMs = 500, shouldAbort = () => false } = {}
) {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (shouldAbort()) return false;
    const ok = await checkTcpPortOnce(port, 600);
    if (ok) return true;
    if (Date.now() - start > timeoutMs) return false;
    await sleep(intervalMs);
  }
}

const root = __dirname;

async function main() {
  // Sequential startup: start one project, wait for its port to be listening, then start the next.
  // This reduces the chance of connection errors during model downloads.
  const launchList = [
    {
      name: "ai-interview-coach",
      port: 5100,
      url: "http://localhost:5100/",
      start: () =>
        spawnProcess({
          name: "ai-interview-coach (backend)",
          cmd: resolvePython(path.join(root, "ai-interview-coach")),
          args: ["app.py"],
          cwd: path.join(root, "ai-interview-coach"),
        }),
    },
    {
      name: "Alt-Text Generator",
      port: 5101,
      url: "http://localhost:5101/",
      start: () =>
        spawnProcess({
          name: "Alt-Text Generator (backend)",
          cmd: resolvePython(path.join(root, "Alt-Text Generator", "backend")),
          args: ["app.py"],
          cwd: path.join(root, "Alt-Text Generator", "backend"),
          env: { PORT: "5101" },
        }),
    },
    {
      name: "email_chaser_pro",
      port: 5102,
      url: "http://localhost:5102/",
      start: () =>
        spawnProcess({
          name: "email_chaser_pro (backend)",
          cmd: resolvePython(path.join(root, "email_chaser_pro", "backend")),
          args: ["app.py"],
          cwd: path.join(root, "email_chaser_pro", "backend"),
        }),
    },
    {
      name: "Font_Generator",
      port: 5103,
      url: "http://localhost:5103/",
      start: () =>
        spawnProcess({
          name: "Font_Generator (backend)",
          cmd: resolvePython(path.join(root, "Font_Generator", "New folder")),
          args: ["app.py"],
          cwd: path.join(root, "Font_Generator", "New folder"),
        }),
    },
    {
      name: "Health_auditor",
      port: 5104,
      url: "http://localhost:5104/",
      start: () =>
        spawnProcess({
          name: "Health_auditor (backend)",
          cmd: resolvePython(path.join(root, "Health_auditor", "smart_log_app", "backend")),
          args: ["app.py"],
          cwd: path.join(root, "Health_auditor", "smart_log_app", "backend"),
        }),
    },
    {
      name: "Interior_AI",
      port: 5105,
      url: "http://localhost:5105/",
      start: () =>
        spawnProcess({
          name: "Interior_AI (backend)",
          cmd: resolvePython(path.join(root, "Interior_AI", "backend")),
          args: ["app.py"],
          cwd: path.join(root, "Interior_AI", "backend"),
          env: { PORT: "5105" },
        }),
    },
    {
      name: "QR_code_generator",
      port: 5106,
      url: "http://localhost:5106/",
      start: () =>
        spawnProcess({
          name: "QR_code_generator (backend)",
          cmd: resolvePython(path.join(root, "QR_code_generator", "backend")),
          args: ["app.py"],
          cwd: path.join(root, "QR_code_generator", "backend"),
          env: { PORT: "5106" },
        }),
    },
    {
      name: "Resume Screener & Talent Matcher",
      port: 5107,
      url: "http://localhost:5107/",
      start: () =>
        spawnProcess({
          name: "Resume Screener & Talent Matcher (backend)",
          cmd: resolvePython(path.join(root, "Resume Screener & Talent Matcher", "backend")),
          args: ["app.py"],
          cwd: path.join(root, "Resume Screener & Talent Matcher", "backend"),
        }),
    },
    {
      name: "Smart_Inventory",
      port: 5108,
      url: "http://localhost:5108/",
      start: () =>
        spawnProcess({
          name: "Smart_Inventory (backend)",
          cmd: resolvePython(path.join(root, "Smart_Inventory", "backend")),
          args: ["app.py"],
          cwd: path.join(root, "Smart_Inventory", "backend"),
        }),
    },
    {
      name: "Text-to-Image-generator",
      port: 5109,
      url: "http://localhost:5109/",
      start: () =>
        spawnProcess({
          name: "Text-to-Image-generator (backend)",
          cmd: resolvePython(path.join(root, "Text-to-Image-generator", "backend")),
          args: ["app.py"],
          cwd: path.join(root, "Text-to-Image-generator", "backend"),
          env: { FLASK_PORT: "5109", FRONTEND_ORIGIN: "http://localhost:3104" },
        }),
    },
    {
      name: "Voice_first_AI",
      port: 5110,
      url: "http://localhost:5110/",
      start: () =>
        spawnProcess({
          name: "Voice_first_AI (backend)",
          cmd: resolvePython(path.join(root, "Voice_first_AI", "backend")),
          args: ["app.py"],
          cwd: path.join(root, "Voice_first_AI", "backend"),
        }),
    },
    // Frontends
    {
      name: "Alt-Text Generator (frontend)",
      port: 3100,
      url: "http://localhost:3100/",
    start: () =>
        spawnProcess({
          name: "Alt-Text Generator (frontend)",
          cmd: process.platform === "win32" ? "cmd.exe" : NPM_CMD,
          args:
            process.platform === "win32" ? ["/c", `${NPM_CMD} run dev`] : ["run", "dev"],
          cwd: path.join(root, "Alt-Text Generator", "frontend"),
        }),
    },
    {
      name: "Interior_AI (frontend)",
      port: 3101,
      url: "http://localhost:3101/",
    start: () =>
        spawnProcess({
          name: "Interior_AI (frontend)",
          cmd: process.platform === "win32" ? "cmd.exe" : NPM_CMD,
          args:
            process.platform === "win32" ? ["/c", `${NPM_CMD} run dev`] : ["run", "dev"],
          cwd: path.join(root, "Interior_AI", "frontend"),
        }),
    },
    {
      name: "QR_code_generator (frontend)",
      port: 3102,
      url: "http://localhost:3102/",
    start: () =>
        spawnProcess({
          name: "QR_code_generator (frontend)",
          cmd: process.platform === "win32" ? "cmd.exe" : NPM_CMD,
          args:
            process.platform === "win32" ? ["/c", `${NPM_CMD} run dev`] : ["run", "dev"],
          cwd: path.join(root, "QR_code_generator", "frontend"),
        }),
    },
    {
      name: "Smart_Inventory (frontend)",
      port: 3103,
      url: "http://localhost:3103/",
    start: () =>
        spawnProcess({
          name: "Smart_Inventory (frontend)",
          cmd: process.platform === "win32" ? "cmd.exe" : NPM_CMD,
          args:
            process.platform === "win32" ? ["/c", `${NPM_CMD} run dev`] : ["run", "dev"],
          cwd: path.join(root, "Smart_Inventory", "frontend"),
        }),
    },
    {
      name: "Text-to-Image-generator (frontend)",
      port: 3104,
      url: "http://localhost:3104/",
    start: () =>
        spawnProcess({
          name: "Text-to-Image-generator (frontend)",
          cmd: process.platform === "win32" ? "cmd.exe" : NPM_CMD,
          args:
            process.platform === "win32" ? ["/c", `${NPM_CMD} run dev`] : ["run", "dev"],
          cwd: path.join(root, "Text-to-Image-generator", "frontend"),
        }),
    },
  ];

  console.log("\nLaunching projects (wait for ports before continuing)...\n");

  for (const item of launchList) {
    // If a previous run already left this port open, avoid rebinding and failing.
    const alreadyOpen = await checkTcpPortOnce(item.port, 250);
    if (alreadyOpen) {
      // #region agent log
      fetch(DEBUG_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": DEBUG_SESSION_ID,
        },
        body: JSON.stringify({
          sessionId: DEBUG_SESSION_ID,
          runId: "post-fix",
          hypothesisId: "H2",
          location: "launcher.js:main:skipAlreadyOpenPort",
          message: "port already listening; skipping spawn",
          data: { name: item.name, port: item.port, url: item.url },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion

      console.log(`${item.name} is live at ${item.url} (port already open; skipping start)`);
      await sleep(2000);
      continue;
    }

    let child;
    try {
      child = item.start();
    } catch (err) {
      console.log(`\n[FAIL] ${item.name} failed to start: ${err && err.message ? err.message : String(err)}\n`);
      await sleep(2000);
      continue;
    }

    const abort = { value: false };
    const portPromise = waitForTcpPort(item.port, "127.0.0.1", {
      timeoutMs: 45000,
      intervalMs: 500,
      shouldAbort: () => abort.value,
    }).then((ok) => ({ type: "port", ok }));

    const exitPromise = new Promise((resolve) => {
      child.once("exit", (code) => resolve({ type: "exit", code }));
    });
    const errorPromise = new Promise((resolve) => {
      child.once("error", (err) => resolve({ type: "error", err }));
    });

    const t0 = Date.now();
    const res = await Promise.race([portPromise, exitPromise, errorPromise]);
    const elapsedMs = Date.now() - t0;
    // #region agent log
    fetch(DEBUG_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": DEBUG_SESSION_ID,
      },
      body: JSON.stringify({
        sessionId: DEBUG_SESSION_ID,
        runId: "port-evidence",
        hypothesisId: "H5",
        location: "launcher.js:main:portRaceResult",
        message: "port readiness outcome",
        data: {
          name: item.name,
          port: item.port,
          url: item.url,
          type: res.type,
          ok: res.ok,
          code: res.code,
          errCode: res.err && res.err.code,
          elapsedMs,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    if (res.type === "port" && res.ok) {
      console.log(`${item.name} is live at ${item.url}`);
    } else {
      abort.value = true;
      if (res.type === "exit") {
        console.log(`${item.name} failed before becoming ready (port ${item.port}). exit code=${res.code}`);
      } else if (res.type === "error") {
        console.log(`${item.name} spawn error before becoming ready (port ${item.port}). code=${res.err && res.err.code}`);
      } else {
        console.log(`${item.name} did not become ready in time (port ${item.port}). Continuing...`);
      }
    }

    // Prevent CPU spike from rapid polling/spawning.
    await sleep(2000);
  }

  console.log("\nLauncher finished starting attempts. Keep this window open; logs are streaming above.\n");
}

main().catch((err) => {
  console.error("Launcher encountered an unexpected error:", err);
});

// Keep the launcher process alive.
setInterval(() => {}, 1 << 30);

