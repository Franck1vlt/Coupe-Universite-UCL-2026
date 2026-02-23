/**
 * Script de débogage + lancement du serveur Next.js dev.
 * Désactive Turbopack (qui crashe avec 0xC0000005 sur Windows/OneDrive)
 * et capture tous les crashs silencieux.
 * Logs écrits dans: dev-debug.log
 */

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const LOG_FILE = path.join(__dirname, "dev-debug.log");

fs.writeFileSync(LOG_FILE, `=== DEV DEBUG LOG - ${new Date().toISOString()} ===\n\n`);

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  fs.appendFileSync(LOG_FILE, line);
}

function logMemory() {
  const mem = process.memoryUsage();
  log(
    `MEMORY - RSS: ${Math.round(mem.rss / 1024 / 1024)}MB | Heap: ${Math.round(mem.heapUsed / 1024 / 1024)}/${Math.round(mem.heapTotal / 1024 / 1024)}MB`
  );
}

log("Démarrage du serveur Next.js dev...");
log(`Node.js version: ${process.version}`);
log(`Platform: ${process.platform}`);
log(`CWD: ${process.cwd()}`);
logMemory();

// Env vars pour désactiver Turbopack (Next.js 16 l'active par défaut)
// 0xC0000005 = crash natif Rust/Turbopack sur Windows avec chemin OneDrive
const childEnv = {
  ...process.env,
  FORCE_COLOR: "1",
  NEXT_TURBOPACK: "0",          // désactive Turbopack dans Next.js 16
  __NEXT_TURBOPACK: "0",        // fallback selon version interne
  TURBOPACK: "0",               // fallback générique
};

log(`NEXT_TURBOPACK forcé à 0 pour utiliser webpack`);

process.on("uncaughtException", (err) => {
  log(`UNCAUGHT EXCEPTION dans wrapper: ${err.message}`);
  log(err.stack || "");
});

process.on("unhandledRejection", (reason) => {
  log(`UNHANDLED REJECTION dans wrapper: ${reason}`);
});

const nextProcess = spawn(
  process.execPath,
  ["--max-old-space-size=4096", "./node_modules/next/dist/bin/next", "dev"],
  {
    stdio: ["inherit", "pipe", "pipe"],
    env: childEnv,
  }
);

log(`Next.js PID: ${nextProcess.pid}`);

nextProcess.stdout.on("data", (data) => {
  const text = data.toString();
  process.stdout.write(text);
  fs.appendFileSync(LOG_FILE, text);

  // Détecter si Turbopack est encore actif malgré les env vars
  if (text.includes("Turbopack")) {
    log("AVERTISSEMENT: Turbopack est toujours actif malgré NEXT_TURBOPACK=0 !");
  }
  if (text.includes("webpack")) {
    log("OK: webpack est utilisé (Turbopack désactivé)");
  }
});

nextProcess.stderr.on("data", (data) => {
  const text = data.toString();
  process.stderr.write(text);
  fs.appendFileSync(LOG_FILE, `[STDERR] ${text}`);
});

const memInterval = setInterval(logMemory, 10000);

nextProcess.on("close", (code, signal) => {
  clearInterval(memInterval);
  log(`\n========================================`);
  log(`Next.js process TERMINÉ`);
  log(`  code de sortie : ${code}${code === 3221225477 ? " (0xC0000005 = ACCESS_VIOLATION Turbopack)" : ""}`);
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
