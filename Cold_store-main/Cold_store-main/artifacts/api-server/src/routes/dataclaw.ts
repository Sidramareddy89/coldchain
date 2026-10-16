/**
 * DataClaw MCP Integration Route
 * POST /api/dataclaw/analyze  — Accepts CSV text, proxies to DataClaw MCP subprocess,
 *                               returns normalized twin telemetry JSON.
 * POST /api/dataclaw/preview  — Lightweight CSV parse with no subprocess (header + stats only).
 */

import { Router, type IRouter, type Request, type Response } from "express";
import {
  runDataClawMcp,
  parseCsvFallback,
  type NormalizedDataClawResult,
} from "../services/dataclaw-adapter";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// POST /api/dataclaw/analyze
// ---------------------------------------------------------------------------
router.post("/analyze", async (req: Request, res: Response) => {
  const { csv } = req.body as { csv?: string };
  if (!csv || typeof csv !== "string" || csv.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: "Missing or empty `csv` field in request body.",
    });
  }

  let result: NormalizedDataClawResult;
  let source: "dataclaw-mcp" | "fallback-js" = "dataclaw-mcp";

  try {
    result = await runDataClawMcp(csv, 15000);
  } catch (mcpErr) {
    // Graceful fallback: use JS-only CSV parser with 15s timeout tolerance
    console.warn("[DataClaw] MCP unavailable or timed out, using JS fallback:", (mcpErr as Error).message);
    source = "fallback-js";
    result = parseCsvFallback(csv);
  }

  return res.json({ success: true, source, data: result });
});

// ---------------------------------------------------------------------------
// POST /api/dataclaw/preview  — Quick header-only parse (no subprocess)
// ---------------------------------------------------------------------------
router.post("/preview", (req: Request, res: Response) => {
  const { csv } = req.body as { csv?: string };
  if (!csv || typeof csv !== "string") {
    return res.status(400).json({ success: false, error: "Missing `csv` field." });
  }

  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  const headers = lines[0]?.split(",").map((h) => h.trim().replace(/^"|"$/g, "")) ?? [];

  return res.json({
    success: true,
    source: "preview-js",
    csvInfo: { rows: Math.max(0, lines.length - 1), cols: headers.length, columns: headers },
  });
});

export default router;
