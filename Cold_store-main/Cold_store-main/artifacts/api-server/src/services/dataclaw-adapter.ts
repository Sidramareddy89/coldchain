/**
 * DataClaw MCP Adapter Service
 * Spawns `python server.py` (DataClaw MCP) as a child process via stdio,
 * normalizes output fields (csv_info, statistics, data_quality) into twin telemetry shape,
 * handles 15-second timeout, and falls back to JavaScript CSV parser on failure.
 */

import { spawn } from "child_process";
import * as path from "path";

export interface NormalizedDataClawResult {
  controls: {
    reeferPower: boolean;
    coolingMode: "ECO" | "BOOST" | "DEFROST" | "STANDBY";
    doorOpen: boolean;
    fanActive: boolean;
    targetSetpoint: number;
    highThreshold: number;
    lowThreshold: number;
  };
  telemetry: {
    currentTemp: number;
    ambientTemp: number;
    speedKmh: number;
    humidity: number;
    powerKw: number;
    shockG: { x: number; y: number; z: number };
  };
  activeFaults: string[];
  csvInfo: {
    rows: number;
    cols: number;
    columns: string[];
  };
  statistics: Record<string, unknown>;
  dataQuality: Record<string, unknown>;
}

export function normalizeDataClawOutput(raw: Record<string, any>): NormalizedDataClawResult {
  const csvInfo = raw.csv_info ?? raw.csvInfo ?? {};
  const stats = raw.statistics ?? {};
  const quality = raw.data_quality ?? raw.dataQuality ?? {};
  const means = stats.mean ?? stats.means ?? {};

  const mean = (colPatterns: string[], fallback: number): number => {
    for (const col of colPatterns) {
      const val = means[col] ?? stats[col]?.mean ?? null;
      if (val !== null && val !== undefined) return Number(val);
    }
    return fallback;
  };

  const currentTemp = mean(["temp", "temperature", "cargo_temp", "cargo_temperature", "cargotemp"], -20.0);
  const targetSetpoint = mean(["setpoint", "target_setpoint", "targetsetpoint"], currentTemp);

  const telemetry = {
    currentTemp: Number(currentTemp.toFixed(2)),
    ambientTemp: Number(mean(["ambient", "ambient_temp", "ambienttemp"], 30.0).toFixed(2)),
    speedKmh: Number(mean(["speed", "speed_kmh", "speedkmh", "vehicle_speed"], 0.0).toFixed(2)),
    humidity: Number(mean(["humidity", "rh", "relative_humidity"], 70.0).toFixed(2)),
    powerKw: Number(mean(["power", "power_kw", "powerkw", "energy", "kw"], 250.0).toFixed(2)),
    shockG: {
      x: Number(mean(["shock_x", "shockx", "accel_x"], 0.08).toFixed(3)),
      y: Number(mean(["shock_y", "shocky", "accel_y"], 0.11).toFixed(3)),
      z: Number(mean(["shock_z", "shockz", "accel_z"], 0.98).toFixed(3)),
    },
  };

  const highThreshold = Number(mean(["high_threshold", "highthreshold", "high_limit"], currentTemp + 5).toFixed(2));
  const lowThreshold = Number(mean(["low_threshold", "lowthreshold", "low_limit"], currentTemp - 5).toFixed(2));

  const activeFaults: string[] = [];
  if (quality.door_open_in_motion || quality.doorOpenInMotion) activeFaults.push("door_seal_breach");
  if (quality.compressor_fault || quality.compressorFault) activeFaults.push("compressor_stall");
  if (quality.high_shock || quality.highShock) activeFaults.push("road_shock");

  return {
    controls: {
      reeferPower: true,
      coolingMode: "ECO",
      doorOpen: false,
      fanActive: true,
      targetSetpoint: Number(targetSetpoint.toFixed(2)),
      highThreshold,
      lowThreshold,
    },
    telemetry,
    activeFaults,
    csvInfo: {
      rows: Number(csvInfo.rows ?? 0),
      cols: Number(csvInfo.cols ?? csvInfo.columns?.length ?? 0),
      columns: Array.isArray(csvInfo.columns) ? csvInfo.columns : [],
    },
    statistics: stats,
    dataQuality: quality,
  };
}

export function parseCsvFallback(csv: string): NormalizedDataClawResult {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  const headers = lines[0]?.split(",").map((h) => h.trim().replace(/^"|"$/g, "")) ?? [];

  const dataRows = lines.slice(1).map((line) =>
    line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""))
  );

  const means: Record<string, number> = {};
  headers.forEach((col, i) => {
    const vals = dataRows
      .map((row) => parseFloat(row[i] ?? ""))
      .filter((n) => !isNaN(n));
    if (vals.length > 0) {
      means[col.toLowerCase()] = vals.reduce((a, b) => a + b, 0) / vals.length;
    }
  });

  const mockMcpOutput = {
    csv_info: { rows: dataRows.length, cols: headers.length, columns: headers },
    statistics: { mean: means },
    data_quality: {},
  };

  return normalizeDataClawOutput(mockMcpOutput);
}

export async function runDataClawMcp(csv: string, timeoutMs = 15000): Promise<NormalizedDataClawResult> {
  return new Promise((resolve, reject) => {
    // Check multiple candidate locations for server.py (monorepo root or dataclaw_mcp folder)
    const candidates = [
      path.resolve(process.cwd(), "../../dataclaw_mcp/server.py"),
      path.resolve(process.cwd(), "../../../dataclaw_mcp/server.py"),
      path.resolve("e:/codeclash/dataclaw_mcp/server.py"),
    ];

    const serverPath = candidates.find((p) => {
      try {
        return require("fs").existsSync(p);
      } catch {
        return false;
      }
    }) || candidates[0];

    let proc: ReturnType<typeof spawn>;
    try {
      proc = spawn("python", [serverPath], { stdio: ["pipe", "pipe", "pipe"] });
    } catch (spawnErr) {
      return reject(new Error(`Could not spawn DataClaw MCP process: ${(spawnErr as Error).message}`));
    }

    let stdoutBuffer = "";
    let stderrBuffer = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        try { proc.kill(); } catch {}
        reject(new Error("DataClaw MCP timed out after 15000ms"));
      }
    }, timeoutMs);

    proc.stdout?.on("data", (chunk: Buffer) => {
      stdoutBuffer += chunk.toString();
    });

    proc.stderr?.on("data", (chunk: Buffer) => {
      stderrBuffer += chunk.toString();
    });

    proc.on("close", (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        if (code === 0 && stdoutBuffer) {
          try {
            const parsed = JSON.parse(stdoutBuffer.trim());
            resolve(normalizeDataClawOutput(parsed));
          } catch {
            reject(new Error(`DataClaw MCP returned unparseable output. stderr: ${stderrBuffer}`));
          }
        } else {
          reject(new Error(`DataClaw MCP exited with code ${code}. stderr: ${stderrBuffer}`));
        }
      }
    });

    proc.on("error", (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(err);
      }
    });

    const envelope = JSON.stringify({ csv, format: "csv" });
    proc.stdin?.write(envelope);
    proc.stdin?.end();
  });
}
