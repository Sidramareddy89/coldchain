"""
ColdChain-Twin — Multi-Agent Autonomous Fleet Operations & Simulation Service (main.py)
Provides:
- 1 Hz Digital Twin Physics Loop & Arrhenius MKT calculations
- Server-Sent Events (SSE) telemetry stream: /api/simulation/stream
- Live Actuator & Setpoint Mutation: PATCH /api/twin/override
- What-If Fault Injections: POST /api/faults/inject & POST /api/faults/clear
- Autonomous Multi-Agent CrewAI Orchestration: POST /api/crew/evaluate
"""

import asyncio
import csv
import io
import json
import math
import os
import time
from typing import Dict, Any, Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from agent_service.twin_engine import twin_engine
from agent_service.crew import evaluate_coldchain_crew

# Configuration
PORT = int(os.environ.get("PORT", "8000"))
HOST = os.environ.get("HOST", "0.0.0.0")

# Background simulation runner
sim_running = True
auto_intervention_enabled = True
last_auto_crew_eval_time = 0.0

async def simulation_physics_loop():
    """Background task that advances the thermodynamic twin physics at 1 Hz."""
    global last_auto_crew_eval_time
    while sim_running:
        try:
            state = twin_engine.tick()
            
            # Check for automated CrewAI trigger:
            # Runs when temperature crosses critical excursion thresholds for 2+ consecutive ticks
            if auto_intervention_enabled and state.get("isExcursionActive", False):
                now = time.time()
                # Cooldown of 15 seconds between automatic evaluations to allow physics to respond
                if now - last_auto_crew_eval_time > 15.0:
                    last_auto_crew_eval_time = now
                    print(f"[Simulation-Loop] Critical excursion active for {state.get('consecutiveExcursions')} ticks! Auto-triggering CrewAI...")
                    asyncio.create_task(asyncio.to_thread(evaluate_coldchain_crew, state, True))
        except Exception as e:
            print(f"[Simulation-Loop] Error in physics tick: {e}")
            
        await asyncio.sleep(1.0)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start 1 Hz physics loop
    sim_task = asyncio.create_task(simulation_physics_loop())
    print(f"[Twin-Service] ColdChain Digital Twin Engine started on port {PORT}")
    yield
    # Shutdown
    global sim_running
    sim_running = False
    sim_task.cancel()
    print("[Twin-Service] ColdChain Digital Twin Engine stopped.")

app = FastAPI(
    title="ColdChain-Twin Multi-Agent Operations Service",
    description="Digital Twin Physics Engine & CrewAI Autonomous Multi-Agent Operations Service",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for local development and cross-origin dashboard requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Pydantic Request Models
# ---------------------------------------------------------------------------
class TwinOverrideRequest(BaseModel):
    reeferPower: Optional[bool] = None
    coolingMode: Optional[str] = None
    doorOpen: Optional[bool] = None
    fanActive: Optional[bool] = None
    targetSetpoint: Optional[float] = None
    highThreshold: Optional[float] = None
    lowThreshold: Optional[float] = None
    activeFaults: Optional[List[str]] = None
    source: Optional[str] = "OPERATOR"

class FaultInjectionRequest(BaseModel):
    fault: str = Field(..., description="Fault name: 'compressor_stall', 'door_seal_breach', or 'road_shock'")

class CrewEvaluationRequest(BaseModel):
    telemetryData: Optional[Dict[str, Any]] = None
    allowIntervention: Optional[bool] = True

class DataClawAnalyzeRequest(BaseModel):
    csv: str = Field(..., description="Raw CSV text to analyze")
    trigger_crew: Optional[bool] = Field(True, description="Auto-trigger Sentinel+Predictor after analysis")

# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------
@app.get("/api/healthz")
async def health_check():
    return {
        "status": "healthy",
        "service": "ColdChain-Twin & CrewAI Multi-Agent Operations",
        "tick": twin_engine.tick_counter,
    }

@app.get("/api/twin/state")
async def get_twin_state():
    """Returns the instantaneous snapshot of the digital twin runtime state."""
    return twin_engine.get_state_snapshot()

@app.patch("/api/twin/override")
async def patch_twin_controls(payload: TwinOverrideRequest):
    """
    Mutates digital twin actuators and setpoints in real-time.
    Supports Reefer Power, Cooling Mode, Door Override, Fan, Setpoint, and Thresholds.
    """
    overrides = payload.model_dump(exclude_unset=True)
    updated_state = twin_engine.update_controls(overrides)
    return {
        "success": True,
        "message": "Digital Twin parameters updated",
        "state": updated_state,
    }

@app.post("/api/faults/inject")
async def inject_fault(payload: FaultInjectionRequest):
    """Injects a controlled what-if fault into the live simulation."""
    twin_engine.inject_fault(payload.fault)
    return {
        "success": True,
        "injected": payload.fault,
        "activeFaults": twin_engine.active_faults,
    }

@app.post("/api/faults/clear")
async def clear_fault(payload: Optional[FaultInjectionRequest] = None):
    """Clears a specific active fault or all active faults."""
    fault_name = payload.fault if payload else None
    twin_engine.clear_fault(fault_name)
    return {
        "success": True,
        "cleared": fault_name or "ALL",
        "activeFaults": twin_engine.active_faults,
    }

@app.get("/api/simulation/stream")
async def stream_simulation(request: Request):
    """
    Server-Sent Events (SSE) telemetry broadcast.
    Pushes combined payload (Sensor Telemetry + Computed MKT + Controls + Action History) every second.
    """
    async def event_generator():
        while True:
            if await request.is_disconnected():
                break
            
            snapshot = twin_engine.get_state_snapshot()
            yield {
                "event": "telemetry",
                "data": json.dumps(snapshot),
            }
            await asyncio.sleep(1.0)

    return EventSourceResponse(event_generator())

@app.post("/api/crew/evaluate")
async def evaluate_crew(payload: Optional[CrewEvaluationRequest] = None):
    """
    Executes the autonomous CrewAI Multi-Agent Operations Crew.
    Evaluates invariant breaches, projects Arrhenius shelf-life loss,
    and executes machine overrides back into the digital twin.
    """
    req_telemetry = payload.telemetryData if payload else None
    allow_intervention = payload.allowIntervention if payload else True

    # Run multi-agent crew evaluation
    result = await asyncio.to_thread(
        evaluate_coldchain_crew,
        telemetry_data=req_telemetry,
        allow_intervention=allow_intervention
    )
    return result

@app.post("/api/crew/toggle-intervention")
async def toggle_intervention(request: Request):
    """Enables or disables automatic closed-loop agent interventions."""
    global auto_intervention_enabled
    body = await request.json()
    auto_intervention_enabled = bool(body.get("enabled", True))
    return {
        "success": True,
        "autoInterventionEnabled": auto_intervention_enabled,
    }

# ---------------------------------------------------------------------------
# DataClaw MCP Integration Endpoint
# ---------------------------------------------------------------------------
def _parse_csv_to_telemetry(csv_text: str) -> Dict[str, Any]:
    """
    Lightweight Python CSV parser that produces the same normalized shape as
    the DataClaw MCP server — used as the fallback when DataClaw is unavailable.
    """
    reader = csv.DictReader(io.StringIO(csv_text.strip()))
    rows = list(reader)
    if not rows:
        return {}

    headers = list(rows[0].keys())

    # Compute column means for numeric columns
    means: Dict[str, float] = {}
    for col in headers:
        vals = []
        for row in rows:
            try:
                vals.append(float(row[col]))
            except (ValueError, TypeError):
                pass
        if vals:
            means[col.lower()] = sum(vals) / len(vals)

    def m(patterns, fallback):
        for p in patterns:
            if p in means:
                return means[p]
        return fallback

    current_temp  = m(["temp", "temperature", "cargo_temp", "cargo_temperature", "cargoTemp"], -20.0)
    target_sp     = m(["setpoint", "target_setpoint", "targetsetpoint"], current_temp)
    high_threshold = m(["high_threshold", "highthreshold", "high_limit"], current_temp + 5)
    low_threshold  = m(["low_threshold", "lowthreshold", "low_limit"], current_temp - 5)

    return {
        "controls": {
            "reeferPower": True,
            "coolingMode": "ECO",
            "doorOpen": False,
            "fanActive": True,
            "targetSetpoint": round(target_sp, 2),
            "highThreshold": round(high_threshold, 2),
            "lowThreshold": round(low_threshold, 2),
        },
        "telemetry": {
            "currentTemp": round(current_temp, 2),
            "ambientTemp": round(m(["ambient", "ambient_temp", "ambienttemp"], 30.0), 2),
            "speedKmh":    round(m(["speed", "speed_kmh", "speedkmh", "vehicle_speed"], 0.0), 2),
            "humidity":    round(m(["humidity", "rh", "relative_humidity"], 70.0), 2),
            "powerKw":     round(m(["power", "power_kw", "powerkw", "energy", "kw"], 250.0), 2),
            "shockG": {
                "x": round(m(["shock_x", "shockx", "accel_x"], 0.08), 3),
                "y": round(m(["shock_y", "shocky", "accel_y"], 0.11), 3),
                "z": round(m(["shock_z", "shockz", "accel_z"], 0.98), 3),
            },
        },
        "activeFaults": [],
        "csvInfo": {
            "rows": len(rows),
            "cols": len(headers),
            "columns": headers,
        },
        "statistics": {"mean": means},
        "dataQuality": {},
    }

@app.post("/api/dataclaw/analyze")
async def dataclaw_analyze(payload: DataClawAnalyzeRequest):
    """
    Parses raw CSV/JSON telemetry data via DataClaw MCP (or Python fallback),
    normalizes output to the twin simulation telemetry shape,
    and optionally auto-triggers the CrewAI Sentinel + Predictor pipeline.
    """
    csv_text = payload.csv.strip()
    if not csv_text:
        return {"success": False, "error": "Empty CSV payload"}

    # 1. Parse CSV → normalized twin state
    try:
        normalized = _parse_csv_to_telemetry(csv_text)
    except Exception as parse_err:
        return {"success": False, "error": f"CSV parse error: {parse_err}"}

    # 2. Apply parsed telemetry to the live twin state
    if normalized.get("controls"):
        twin_engine.update_controls({**normalized["controls"], "source": "DATACLAW_INGEST"})

    result: Dict[str, Any] = {"success": True, "source": "python-fallback", "data": normalized}

    # 3. Optionally run the crew evaluation on the newly-loaded data
    if payload.trigger_crew:
        try:
            crew_result = await asyncio.to_thread(
                evaluate_coldchain_crew,
                telemetry_data={
                    "telemetry": normalized.get("telemetry", {}),
                    "controls":  normalized.get("controls", {}),
                    "activeFaults": normalized.get("activeFaults", []),
                    "mkt": normalized.get("telemetry", {}).get("currentTemp", -20.0),
                },
                allow_intervention=True,
            )
            result["crew"] = crew_result
        except Exception as crew_err:
            result["crew"] = None
            result["crewError"] = str(crew_err)

    return result

# ---------------------------------------------------------------------------
# Direct Execution Entrypoint
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("agent_service.main:app", host=HOST, port=PORT, reload=False)
