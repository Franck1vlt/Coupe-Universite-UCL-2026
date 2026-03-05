/**
 * Script de dÃ©bogage + lancement du serveur Next.js dev.
 * DÃ©sactive Turbopack (qui crashe avec 0xC0000005 sur Windows/OneDrive)
 * et capture tous les crashs silencieux.
 * Logs Ã©crits dans: dev-debug.log
 */

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const LOG_FILE = path.join(__dirname, "dev-debug.log");
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5 MB : seuil de rotation
const KEEP_ON_ROTATE = 2 * 1024 * 1024; // garde les 2 derniers MB après rotation

fs.writeFileSync(
  LOG_FILE,
  `=== DEV DEBUG LOG - ${new Date().toISOString()} ===\n\n`,
);

// Écrit dans le log en faisant tourner le fichier si nécessaire (rolling log)
function safeAppend(text) {
  try {
    const size = fs.statSync(LOG_FILE).size;
    if (size >= MAX_LOG_SIZE) {
      // Lire les derniers KEEP_ON_ROTATE octets et réécrire le fichier
      const fd = fs.openSync(LOG_FILE, "r");
      const buf = Buffer.alloc(KEEP_ON_ROTATE);
      const bytesRead = fs.readSync(fd, buf, 0, KEEP_ON_ROTATE, size - KEEP_ON_ROTATE);
      fs.closeSync(fd);
      const notice = `\n=== [ROTATION - ${new Date().toISOString()}] logs anciens supprimés ===\n\n`;
      fs.writeFileSync(LOG_FILE, notice + buf.subarray(0, bytesRead).toString());
    }
    fs.appendFileSync(LOG_FILE, text);
  } catch {
    // Impossible d'écrire dans le log
  }
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  safeAppend(line);
}

function logMemory() {
  const mem = process.memoryUsage();
  log(
    `MEMORY - RSS: ${Math.round(mem.rss / 1024 / 1024)}MB | Heap: ${Math.round(mem.heapUsed / 1024 / 1024)}/${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
  );
}

log("DÃ©marrage du serveur Next.js dev...");
log(`Node.js version: ${process.version}`);
log(`Platform: ${process.platform}`);
log(`CWD: ${process.cwd()}`);
logMemory();

// Env vars pour dÃ©sactiver Turbopack (Next.js 16 l'active par dÃ©faut)
// 0xC0000005 = crash natif Rust/Turbopack sur Windows avec chemin OneDrive
const childEnv = {
  ...process.env,
  FORCE_COLOR: "1",
};

log(`Webpack forcé via --webpack`);

process.on("uncaughtException", (err) => {
  // EPIPE = le terminal est fermé, on sort proprement sans essayer de logger
  // (évite la boucle infinie EPIPE → log → EPIPE → log → ...)
  if (err.code === "EPIPE") {
    process.exit(0);
  }
  try {
    fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] UNCAUGHT EXCEPTION: ${err.message}\n${err.stack || ""}\n`);
  } catch {
    // Impossible d'écrire dans le log, abandonner
  }
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  log(`UNHANDLED REJECTION dans wrapper: ${reason}`);
});

const nextProcess = spawn(
  process.execPath,
  [
    "--max-old-space-size=4096",
    "./node_modules/next/dist/bin/next",
    "dev",
    "--webpack",
  ],
  {
    stdio: ["inherit", "pipe", "pipe"],
    env: childEnv,
  },
);

log(`Next.js PID: ${nextProcess.pid}`);

nextProcess.stdout.on("data", (data) => {
  const text = data.toString();
  process.stdout.write(text);
  safeAppend(text);

  // DÃ©tecter si Turbopack est encore actif malgrÃ© les env vars
  if (text.includes("Turbopack")) {
    log(
      "AVERTISSEMENT: Turbopack est toujours actif malgrÃ© NEXT_TURBOPACK=0 !",
    );
  }
  if (text.includes("webpack")) {
    log("OK: webpack est utilisÃ© (Turbopack dÃ©sactivÃ©)");
  }
});

nextProcess.stderr.on("data", (data) => {
  const text = data.toString();
  process.stderr.write(text);
  safeAppend(`[STDERR] ${text}`);
});

const memInterval = setInterval(logMemory, 10000);

nextProcess.on("close", (code, signal) => {
  clearInterval(memInterval);
  log(`\n========================================`);
  log(`Next.js process TERMINÃ‰`);
  log(
    `  code de sortie : ${code}${code === 3221225477 ? " (0xC0000005 = ACCESS_VIOLATION Turbopack)" : ""}`,
  );
  log(`  signal         : ${signal}`);
  log(`========================================\n`);
  logMemory();
  log(`Log complet : ${LOG_FILE}`);
});

nextProcess.on("error", (err) => {
  clearInterval(memInterval);
  log(`ERREUR spawn Next.js: ${err.message}`);
  log(err.stack || "");
});
