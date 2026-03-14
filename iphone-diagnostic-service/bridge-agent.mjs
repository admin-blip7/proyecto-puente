#!/usr/bin/env node

import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { promisify } from "node:util";
import os from "node:os";

const execFileAsync = promisify(execFile);
const POLL_INTERVAL_MS = Number(process.env.DIAG_AGENT_POLL_MS || 3000);
const MAX_BUFFER = 1024 * 1024;
const CONFIG_DIR = path.join(os.homedir(), ".22electronic-diagnostics-agent");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");
const DEFAULT_AGENT_NAME = `${os.hostname()} (${os.platform()})`;

const REQUIRED_TOOLS = [
  "idevice_id",
  "ideviceinfo",
  "idevicediagnostics",
  "idevicepair",
];

function readConfigFile() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    return {};
  }
}

function writeConfigFile(config) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

async function promptForConfig(existingConfig = {}) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const appUrlInput = await rl.question(`URL de la app [${existingConfig.appUrl || "https://22electronicgroup.com"}]: `);
  const tokenInput = await rl.question(`Token del agente${existingConfig.agentToken ? " [guardado]" : ""}: `);
  const nameInput = await rl.question(`Nombre del agente [${existingConfig.agentName || DEFAULT_AGENT_NAME}]: `);
  await rl.close();

  return {
    appUrl: (appUrlInput || existingConfig.appUrl || "https://22electronicgroup.com").replace(/\/$/, ""),
    agentToken: tokenInput || existingConfig.agentToken || "",
    agentName: nameInput || existingConfig.agentName || DEFAULT_AGENT_NAME,
  };
}

async function resolveConfig() {
  const fileConfig = readConfigFile();
  let config = {
    appUrl: (process.env.DIAG_AGENT_URL || fileConfig.appUrl || "").replace(/\/$/, ""),
    agentToken: process.env.DIAG_AGENT_TOKEN || fileConfig.agentToken || "",
    agentName: process.env.DIAG_AGENT_NAME || fileConfig.agentName || DEFAULT_AGENT_NAME,
  };

  if (!config.appUrl || !config.agentToken) {
    config = await promptForConfig(config);
  }

  if (!config.appUrl || !config.agentToken) {
    throw new Error("Configura DIAG_AGENT_URL y DIAG_AGENT_TOKEN antes de continuar.");
  }

  writeConfigFile(config);
  return config;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run(command, args, timeout = 15000) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      timeout,
      maxBuffer: MAX_BUFFER,
    });

    return {
      ok: true,
      stdout: String(stdout || ""),
      stderr: String(stderr || ""),
    };
  } catch (error) {
    return {
      ok: false,
      stdout: typeof error.stdout === "string" ? error.stdout : error.stdout?.toString() || "",
      stderr: typeof error.stderr === "string" ? error.stderr : error.stderr?.toString() || error.message,
    };
  }
}

async function ensureTools() {
  for (const tool of REQUIRED_TOOLS) {
    const check = await run(tool, ["--help"], 4000);
    if (!check.ok && /not found|ENOENT/i.test(check.stderr)) {
      throw new Error(`Falta herramienta requerida: ${tool}`);
    }
  }
}

async function listUdids() {
  const result = await run("idevice_id", ["-l"], 8000);
  if (!result.ok || !result.stdout.trim()) {
    return [];
  }

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function collectDeviceRaw(udid) {
  const info = await run("ideviceinfo", ["-u", udid], 12000);
  const batteryIoreg = await run("idevicediagnostics", ["-u", udid, "ioregentry", "AppleSmartBattery"], 12000);
  const batteryDomain = await run("ideviceinfo", ["-u", udid, "-q", "com.apple.mobile.battery"], 12000);
  const diskUsageXml = await run("ideviceinfo", ["-u", udid, "-q", "com.apple.disk_usage", "-x"], 12000);
  const diskUsage = await run("ideviceinfo", ["-u", udid, "-q", "com.apple.disk_usage"], 12000);

  return {
    udid,
    info_stdout: info.stdout,
    info_stderr: info.stderr,
    battery_ioreg_stdout: batteryIoreg.stdout,
    battery_domain_stdout: batteryDomain.stdout,
    disk_usage_xml_stdout: diskUsageXml.stdout,
    disk_usage_stdout: diskUsage.stdout,
  };
}

async function executeJob(job) {
  if (job.mode === "scan_device") {
    return {
      results: [await collectDeviceRaw(job.target_udid)],
      count: 1,
    };
  }

  const udids = await listUdids();
  const results = [];
  for (const udid of udids) {
    results.push(await collectDeviceRaw(udid));
  }

  return {
    results,
    count: results.length,
  };
}

async function api(config, routePath, options = {}) {
  const response = await fetch(`${config.appUrl}${routePath}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-diagnostics-agent-token": config.agentToken,
      "x-diagnostics-agent-name": config.agentName,
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `${response.status}`);
  }
  return data;
}

async function loop() {
  const config = await resolveConfig();
  await ensureTools();
  console.log(`[bridge-agent] listo: ${config.agentName}`);
  console.log(`[bridge-agent] config: ${CONFIG_PATH}`);

  for (;;) {
    try {
      const payload = await api(config, "/api/diagnostics/bridge/agent/jobs/next", { method: "GET" });
      const job = payload.job;

      if (!job) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      console.log(`[bridge-agent] ejecutando job ${job.id} (${job.mode})`);

      try {
        const result = await executeJob(job);
        await api(config, `/api/diagnostics/bridge/agent/jobs/${job.id}/complete`, {
          method: "POST",
          body: JSON.stringify({ status: "completed", result }),
        });
        console.log(`[bridge-agent] job ${job.id} completado (${result.count} dispositivo(s))`);
      } catch (error) {
        await api(config, `/api/diagnostics/bridge/agent/jobs/${job.id}/complete`, {
          method: "POST",
          body: JSON.stringify({
            status: "failed",
            error: error instanceof Error ? error.message : "job_failed",
          }),
        });
        console.error(`[bridge-agent] job ${job.id} falló`, error);
      }
    } catch (error) {
      console.error("[bridge-agent] polling error", error instanceof Error ? error.message : error);
      await sleep(POLL_INTERVAL_MS);
    }
  }
}

loop().catch((error) => {
  console.error("[bridge-agent] fatal", error instanceof Error ? error.message : error);
  process.exit(1);
});
