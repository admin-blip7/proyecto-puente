#!/usr/bin/env node

import { exec, execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import os from "node:os";

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);
const POLL_INTERVAL_MS = Number(process.env.DIAG_AGENT_POLL_MS || 3000);
const MAX_BUFFER = 1024 * 1024;
const CONFIG_DIR = path.join(os.homedir(), ".22electronic-diagnostics-agent");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");
const DEFAULT_AGENT_NAME = `${os.hostname()} (${os.platform()})`;
const DEFAULT_APP_URL = "https://22electronicgroup.com";

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

async function openInBrowser(url) {
  try {
    if (process.platform === "darwin") {
      await execAsync(`open "${url}"`);
      return;
    }
    if (process.platform === "win32") {
      await execAsync(`start "" "${url}"`);
      return;
    }
    await execAsync(`xdg-open "${url}"`);
  } catch {
    // noop
  }
}

async function resolveConfig() {
  const fileConfig = readConfigFile();
  let config = {
    appUrl: (process.env.DIAG_AGENT_URL || fileConfig.appUrl || DEFAULT_APP_URL).replace(/\/$/, ""),
    agentToken: process.env.DIAG_AGENT_TOKEN || fileConfig.agentToken || "",
    agentName: process.env.DIAG_AGENT_NAME || fileConfig.agentName || DEFAULT_AGENT_NAME,
    machineId: process.env.DIAG_AGENT_MACHINE_ID || fileConfig.machineId || randomUUID(),
  };

  if (!config.agentToken) {
    console.log("[bridge-agent] iniciando pairing automatico...");
    const startRes = await fetch(`${config.appUrl}/api/diagnostics/bridge/pair/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        machineId: config.machineId,
        agentName: config.agentName,
        platform: process.platform,
      }),
    });
    const startData = await startRes.json().catch(() => ({}));
    if (!startRes.ok) {
      throw new Error(startData.error || "No se pudo iniciar el pairing del agente");
    }

    if (startData.status === "paired" && startData.token) {
      config.agentToken = startData.token;
      writeConfigFile(config);
      return config;
    }

    const pairingCode = startData.pairing?.pairing_code;
    if (!pairingCode) {
      throw new Error("No se recibió código de pairing");
    }

    const pairingUrl = `${config.appUrl}/admin/diagnostico?pair=${encodeURIComponent(pairingCode)}`;
    console.log(`[bridge-agent] vincula esta computadora desde tu cuenta en: ${pairingUrl}`);
    await openInBrowser(pairingUrl);

    const startedAt = Date.now();
    while (!config.agentToken && Date.now() - startedAt < 10 * 60 * 1000) {
      await sleep(2000);
      const statusRes = await fetch(`${config.appUrl}/api/diagnostics/bridge/pair/status?machineId=${encodeURIComponent(config.machineId)}&code=${encodeURIComponent(pairingCode)}`);
      const statusData = await statusRes.json().catch(() => ({}));
      if (!statusRes.ok) {
        continue;
      }
      if (statusData.pairing?.status === "expired") {
        throw new Error("El pairing del agente expiró. Abre de nuevo la app para reintentar.");
      }
      if (statusData.token) {
        config.agentToken = statusData.token;
      }
    }
  }

  if (!config.agentToken) {
    throw new Error("No se pudo vincular el agente local con tu cuenta.");
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
