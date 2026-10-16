#!/usr/bin/env python3
"""
DataClaw MCP Server (bernardcaldas/dataclaw-mcp compatible)
Local Pandas-based CSV and telemetry analyzer.
Analyzes tabular datasets locally and emits ~10KB structured JSON summaries
without raw CSV data ever entering LLM contexts.
"""

import sys
import io
import json
import logging
from typing import Dict, Any

try:
    import pandas as pd
    import numpy as np
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False

logging.basicConfig(level=logging.INFO, format="[DataClaw-MCP] %(message)s", stream=sys.stderr)
logger = logging.getLogger("dataclaw_mcp")


def analyze_csv_data(csv_text: str) -> Dict[str, Any]:
    """
    Performs deterministic local pandas analysis on CSV text.
    Returns: csv_info, statistics, data_quality (~5-10 KB JSON).
    """
    if not csv_text or not csv_text.strip():
        return {
            "csv_info": {"rows": 0, "cols": 0, "columns": []},
            "statistics": {},
            "data_quality": {"error": "Empty input payload"}
        }

    if PANDAS_AVAILABLE:
        try:
            df = pd.read_csv(io.StringIO(csv_text.strip()))
        except Exception as e:
            return {
                "csv_info": {"rows": 0, "cols": 0, "columns": []},
                "statistics": {},
                "data_quality": {"error": f"Pandas parse error: {str(e)}"}
            }

        cols = [str(c).strip() for c in df.columns]
        rows_count = len(df)
        cols_count = len(cols)

        # Numeric statistics
        numeric_df = df.select_dtypes(include=[np.number])
        means = {col: float(val) for col, val in numeric_df.mean().dropna().to_dict().items()}
        mins  = {col: float(val) for col, val in numeric_df.min().dropna().to_dict().items()}
        maxs  = {col: float(val) for col, val in numeric_df.max().dropna().to_dict().items()}
        stds  = {col: float(val) for col, val in numeric_df.std().dropna().to_dict().items()}

        # Missing values & quality flags
        null_counts = {col: int(val) for col, val in df.isnull().sum().to_dict().items() if val > 0}
        total_missing = int(df.isnull().sum().sum())

        # Anomaly heuristic checks
        door_open_flag = False
        compressor_fault_flag = False
        high_shock_flag = False

        lower_cols = {c.lower(): c for c in df.columns}
        speed_col = next((lower_cols[k] for k in ["speed", "speed_kmh", "speedkmh"] if k in lower_cols), None)
        door_col = next((lower_cols[k] for k in ["door", "door_open", "dooropen"] if k in lower_cols), None)
        temp_col = next((lower_cols[k] for k in ["temp", "temperature", "cargo_temp"] if k in lower_cols), None)
        power_col = next((lower_cols[k] for k in ["power", "power_kw", "energy"] if k in lower_cols), None)
        shock_z_col = next((lower_cols[k] for k in ["shock_z", "shockz", "accel_z"] if k in lower_cols), None)

        if speed_col and door_col:
            try:
                moving_doors = df[(df[speed_col] > 5) & (df[door_col].isin([1, True, "true", "True", "OPEN", "open"]))]
                if len(moving_doors) > 0:
                    door_open_flag = True
            except Exception:
                pass

        if temp_col and power_col:
            try:
                # High temp with high power continuously implies possible stall or leak
                warm_and_straining = df[(df[temp_col] > -10) & (df[power_col] > 260)]
                if len(warm_and_straining) > 3:
                    compressor_fault_flag = True
            except Exception:
                pass

        if shock_z_col:
            try:
                high_shocks = df[df[shock_z_col].abs() > 2.0]
                if len(high_shocks) > 0:
                    high_shock_flag = True
            except Exception:
                pass

        return {
            "csv_info": {
                "rows": rows_count,
                "cols": cols_count,
                "columns": cols
            },
            "statistics": {
                "mean": means,
                "min": mins,
                "max": maxs,
                "std": stds
            },
            "data_quality": {
                "total_missing_cells": total_missing,
                "null_columns": null_counts,
                "door_open_in_motion": door_open_flag,
                "compressor_fault": compressor_fault_flag,
                "high_shock": high_shock_flag
            }
        }
    else:
        # Pure Python fallback when pandas is not installed
        lines = csv_text.strip().splitlines()
        if not lines:
            return {"csv_info": {"rows": 0, "cols": 0, "columns": []}, "statistics": {}, "data_quality": {}}

        header = [h.strip().replace('"', '') for h in lines[0].split(",")]
        rows = [r.split(",") for r in lines[1:] if r.strip()]

        means = {}
        for idx, col in enumerate(header):
            vals = []
            for r in rows:
                if idx < len(r):
                    try:
                        vals.append(float(r[idx].strip().replace('"', '')))
                    except ValueError:
                        pass
            if vals:
                means[col] = sum(vals) / len(vals)

        return {
            "csv_info": {
                "rows": len(rows),
                "cols": len(header),
                "columns": header
            },
            "statistics": {
                "mean": means,
            },
            "data_quality": {
                "door_open_in_motion": False,
                "compressor_fault": False,
                "high_shock": False
            }
        }


def main():
    """Main stdio loop: accepts JSON lines or raw input and writes JSON response."""
    raw_input_data = sys.stdin.read()
    if not raw_input_data:
        sys.exit(0)

    try:
        req = json.loads(raw_input_data.strip())
        csv_payload = req.get("csv", "")
    except Exception:
        # Treat raw input as CSV directly if not JSON
        csv_payload = raw_input_data

    result = analyze_csv_data(csv_payload)
    output_json = json.dumps(result, indent=2)
    sys.stdout.write(output_json + "\n")
    sys.stdout.flush()


if __name__ == "__main__":
    main()
