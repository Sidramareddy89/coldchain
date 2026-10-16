"""
ColdChain-Twin — Machine-Executable CrewAI Tools (tools.py)
Provides closed-loop autonomous tools to override hardware setpoints,
calculate Arrhenius shelf-life degradation, and dispatch urgent alerts.
"""

import math
import time
from crewai.tools import tool
from agent_service.twin_engine import twin_engine

@tool("tool_override_twin_controls")
def tool_override_twin_controls(reefer_power: bool, cooling_mode: str, target_temp: float) -> str:
    """
    Directly overrides the physical Cold Chain Digital Twin hardware state.
    Parameters:
      - reefer_power: True to activate main reefer unit, False to cut power.
      - cooling_mode: 'ECO', 'BOOST', 'DEFROST', or 'STANDBY'.
      - target_temp: Numeric target setpoint in degrees Celsius (e.g. -24.0).
    """
    valid_modes = ["ECO", "BOOST", "DEFROST", "STANDBY"]
    mode = str(cooling_mode).upper()
    if mode not in valid_modes:
        mode = "BOOST"

    target = round(float(target_temp), 1)

    twin_engine.update_controls({
        "reeferPower": bool(reefer_power),
        "coolingMode": mode,
        "targetSetpoint": target,
        "source": "AI_AGENT_REMEDIATION"
    })

    result_msg = (
        f"SUCCESS: Digital Twin physical actuators mutated. "
        f"Reefer Power: {'ON' if reefer_power else 'OFF'}, "
        f"Cooling Mode: {mode}, "
        f"Target Setpoint: {target}°C. Closed-loop control active."
    )
    return result_msg

@tool("tool_calculate_shelf_life_loss")
def tool_calculate_shelf_life_loss(mkt: float, excursion_minutes: float, cargo_type: str = "Frozen Pharma") -> str:
    """
    Computes cumulative shelf-life degradation and regulatory compliance status
    using Arrhenius reaction kinetics and real-time Mean Kinetic Temperature (MKT).
    Parameters:
      - mkt: Current Mean Kinetic Temperature in °C.
      - excursion_minutes: Duration of temperature excursion above critical threshold in minutes.
      - cargo_type: Description of perishable product (e.g., 'Frozen Pharma', 'Fresh Produce', 'Meat').
    """
    # Arrhenius degradation parameter: Q10 ~ 2.5 per 10°C thermal jump
    baseline_temp = -20.0 if "pharma" in cargo_type.lower() or "frozen" in cargo_type.lower() else 4.0
    temp_excess = max(0.0, float(mkt) - baseline_temp)
    
    q10_factor = math.pow(2.5, temp_excess / 10.0) if temp_excess > 0 else 1.0
    excursion_hours = max(0.1, float(excursion_minutes) / 60.0)
    
    # Accelerated shelf life hours lost
    lost_shelf_life_hours = round(excursion_hours * q10_factor * 8.5, 1)
    
    # GDP / FDA Risk Category
    if lost_shelf_life_hours > 24.0 or temp_excess > 8.0:
        gdp_status = "CRITICAL NON-COMPLIANCE (QUARANTINE REQUIRED)"
    elif lost_shelf_life_hours > 8.0 or temp_excess > 3.0:
        gdp_status = "MODERATE DEGRADATION (AUDIT REVIEW REQUIRED)"
    else:
        gdp_status = "TOLERABLE EXCURSION (MONITOR CLOSELY)"

    return (
        f"Shelf-Life Analysis for {cargo_type}:\n"
        f"- Measured MKT: {mkt:.1f}°C (Delta vs Baseline: +{temp_excess:.1f}°C)\n"
        f"- Excursion Duration: {excursion_minutes:.0f} mins\n"
        f"- Arrhenius Acceleration Factor: {q10_factor:.2f}x\n"
        f"- Total Shelf-Life Loss: -{lost_shelf_life_hours} hours\n"
        f"- Regulatory Impact: {gdp_status}"
    )

@tool("tool_dispatch_driver_alert")
def tool_dispatch_driver_alert(message: str, urgency: str = "HIGH") -> str:
    """
    Logs an urgent audible/visual dispatch instruction to the vehicle telematics cab unit.
    Parameters:
      - message: Explicit instruction to driver (e.g., 'PULL OVER: Secure Bay 3 loading door latch immediately').
      - urgency: Urgency level ('CRITICAL', 'HIGH', 'ADVISORY').
    """
    alert = {
        "timestamp": time.strftime("%H:%M:%S"),
        "urgency": str(urgency).upper(),
        "message": message,
        "status": "DISPATCHED_TO_CAB"
    }
    
    with twin_engine.lock:
        twin_engine.driver_alerts.append(alert)
        if len(twin_engine.driver_alerts) > 20:
            twin_engine.driver_alerts.pop(0)

    return f"ALERT DISPATCHED [{urgency}]: \"{message}\" transmitted to Vehicle In-Cab Display."
