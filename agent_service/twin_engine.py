"""
ColdChain-Twin — Telemetry Physics Engine & State Machine (twin_engine.py)
Models 1 Hz closed-loop thermodynamics: heat ingress, door ajar events,
reefer compressor modes, Arrhenius Mean Kinetic Temperature (MKT),
and what-if fault injections.
"""

import math
import time
import random
from collections import deque
from typing import Dict, List, Any, Optional
import threading

DELTA_H_OVER_R = 10000.0  # Arrhenius activation energy parameter (K)

class DigitalTwinEngine:
    def __init__(self):
        self.lock = threading.Lock()
        
        # Core Actuators & Controls
        self.reefer_power: bool = True
        self.cooling_mode: str = "ECO"  # ECO, BOOST, DEFROST, STANDBY
        self.door_open: bool = False
        self.fan_active: bool = True
        
        # Setpoints & Thresholds (Celsius)
        self.target_setpoint: float = -20.0
        self.high_threshold: float = -15.0  # Excursion alarm upper limit
        self.low_threshold: float = -25.0   # Freeze protection lower limit
        
        # What-If Active Faults
        # Supported: 'compressor_stall', 'door_seal_breach', 'road_shock'
        self.active_faults: List[str] = []
        
        # Dynamic Telemetry State
        self.current_temp: float = -19.6
        self.ambient_temp: float = 32.0
        self.speed_kmh: float = 48.0
        self.shock_g: Dict[str, float] = {"x": 0.08, "y": 0.11, "z": 0.98}
        self.humidity: float = 78.0
        self.power_kw: float = 248.0
        
        # Kinetic Calculations
        self.mkt: float = -19.6
        self.baseline_shelf_life_hours: float = 720.0
        self.shelf_life_remaining_hours: float = 718.5
        self.consecutive_excursions: int = 0
        
        # Sliding buffer of cargo temperatures for dynamic MKT
        self.temp_history: deque = deque(maxlen=300)
        self.temp_history.append(self.current_temp)
        
        # Audit Logs & Dispatched Actions
        self.ai_action_history: List[Dict[str, Any]] = []
        self.driver_alerts: List[Dict[str, Any]] = []
        self.tick_counter: int = 0
        self.last_tick_time: float = time.time()

    def update_controls(self, overrides: Dict[str, Any]) -> Dict[str, Any]:
        """Applies manual operator or autonomous AI overrides to the twin."""
        with self.lock:
            if "reeferPower" in overrides:
                self.reefer_power = bool(overrides["reeferPower"])
            if "coolingMode" in overrides:
                mode = str(overrides["coolingMode"]).upper()
                if mode in ["ECO", "BOOST", "DEFROST", "STANDBY"]:
                    self.cooling_mode = mode
            if "doorOpen" in overrides:
                self.door_open = bool(overrides["doorOpen"])
            if "fanActive" in overrides:
                self.fan_active = bool(overrides["fanActive"])
            if "targetSetpoint" in overrides:
                self.target_setpoint = round(float(overrides["targetSetpoint"]), 2)
            if "highThreshold" in overrides:
                self.high_threshold = round(float(overrides["highThreshold"]), 2)
            if "lowThreshold" in overrides:
                self.low_threshold = round(float(overrides["lowThreshold"]), 2)
            if "activeFaults" in overrides:
                if isinstance(overrides["activeFaults"], list):
                    self.active_faults = overrides["activeFaults"]

            # Log override action if tagged with source
            source = overrides.get("source", "OPERATOR")
            if source != "TICK":
                self.ai_action_history.append({
                    "timestamp": time.strftime("%H:%M:%S"),
                    "source": source,
                    "applied": {k: v for k, v in overrides.items() if k != "source"}
                })
                if len(self.ai_action_history) > 50:
                    self.ai_action_history.pop(0)

            return self.get_state_snapshot()

    def inject_fault(self, fault_name: str) -> None:
        """Injects a controlled what-if fault."""
        with self.lock:
            if fault_name not in self.active_faults:
                self.active_faults.append(fault_name)

    def clear_fault(self, fault_name: Optional[str] = None) -> None:
        """Clears a specific fault or all faults."""
        with self.lock:
            if fault_name is None:
                self.active_faults.clear()
            elif fault_name in self.active_faults:
                self.active_faults.remove(fault_name)

    def tick(self) -> Dict[str, Any]:
        """
        Executes one physics cycle (1 Hz).
        Applies thermodynamic differential equations, calculates MKT,
        and computes cumulative degradation.
        """
        with self.lock:
            self.tick_counter += 1
            now = time.time()
            self.last_tick_time = now

            # 1. Base heating / cooling differentials
            temp_delta = 0.0

            # Door ajar or reefer power off heats up the cargo
            if self.door_open or not self.reefer_power:
                temp_delta += 0.35

            # Fault: Door Seal Breach adds extreme ambient heat gain
            if "door_seal_breach" in self.active_faults:
                temp_delta += 0.55

            # Fault: Compressor Stall zeroes out all cooling capability
            compressor_stalled = "compressor_stall" in self.active_faults
            if compressor_stalled:
                temp_delta += 0.40  # Motor heat buildup / uncooled chamber

            # Active cooling pull if reefer is ON and compressor is NOT stalled
            if self.reefer_power and not compressor_stalled:
                fan_factor = 1.0 if self.fan_active else 0.5  # Fan circulation multiplier
                
                if self.cooling_mode == "BOOST":
                    # Strong pull toward target setpoint (-0.6°C / tick baseline)
                    pull = -0.60 * fan_factor
                    # Slow pull down once approaching target
                    if self.current_temp <= self.target_setpoint:
                        pull = max(-0.1, (self.target_setpoint - self.current_temp) * 0.2)
                    temp_delta += pull
                elif self.cooling_mode == "ECO":
                    # Gradual pull toward target setpoint (-0.2°C / tick baseline)
                    pull = -0.20 * fan_factor
                    if self.current_temp <= self.target_setpoint:
                        pull = max(-0.05, (self.target_setpoint - self.current_temp) * 0.1)
                    temp_delta += pull
                elif self.cooling_mode == "DEFROST":
                    # Electric heater coils active to de-ice evaporator
                    temp_delta += 0.25
                elif self.cooling_mode == "STANDBY":
                    # Idle standby passive warming
                    temp_delta += 0.12

            # Realistic micro-jitter
            micro_jitter = (random.random() - 0.49) * 0.05
            self.current_temp = round(self.current_temp + temp_delta + micro_jitter, 2)
            
            # Clamp within physical reefer chamber bounds
            self.current_temp = max(-35.0, min(self.current_temp, 35.0))
            self.temp_history.append(self.current_temp)

            # 2. Road Shock Telemetry
            if "road_shock" in self.active_faults:
                # Heavy impact spike on axes X/Y/Z
                self.shock_g = {
                    "x": round(3.5 + (random.random() - 0.5) * 0.4, 2),
                    "y": round(3.2 + (random.random() - 0.5) * 0.3, 2),
                    "z": round(3.8 + (random.random() - 0.5) * 0.5, 2),
                }
                # Decay road shock after 4 ticks
                if self.tick_counter % 4 == 0:
                    self.active_faults.remove("road_shock")
            else:
                # Normal road vibration (~0.1G lateral, ~1G vertical)
                self.shock_g = {
                    "x": round(0.08 + (random.random() - 0.5) * 0.04, 2),
                    "y": round(0.11 + (random.random() - 0.5) * 0.04, 2),
                    "z": round(0.98 + (random.random() - 0.5) * 0.06, 2),
                }

            # 3. Electrical Power Draw (kW) Calculation
            base_kw = 240.0
            if self.cooling_mode == "BOOST":
                base_kw += 58.0
            elif self.cooling_mode == "ECO":
                base_kw += 12.0
            elif self.cooling_mode == "DEFROST":
                base_kw += 35.0
            elif self.cooling_mode == "STANDBY":
                base_kw -= 40.0
            if compressor_stalled:
                base_kw += 65.0  # Runaway electrical strain
            if self.door_open or "door_seal_breach" in self.active_faults:
                base_kw += 28.0
            if not self.fan_active:
                base_kw -= 14.0
            
            self.power_kw = round(base_kw + (random.random() - 0.5) * 6.0, 1)

            # 4. Dynamic Mean Kinetic Temperature (MKT) via Arrhenius
            self.mkt = self._calculate_mkt()

            # 5. Kinetic Shelf-Life Degradation
            # Normal baseline degradation is 1 hour of shelf life per elapsed hour.
            # When temperature rises above target or high threshold, Arrhenius reaction rate spikes:
            # Q10 approx 2.5 per 10 deg increase.
            temp_diff = max(0.0, self.current_temp - self.target_setpoint)
            acceleration_factor = math.pow(2.5, temp_diff / 10.0) if temp_diff > 0 else 1.0
            
            # Each 1-second tick is 1/3600th of an hour
            consumed_hours = (1.0 / 3600.0) * acceleration_factor
            self.shelf_life_remaining_hours = max(
                0.0, round(self.shelf_life_remaining_hours - consumed_hours, 3)
            )

            # 6. Consecutive Excursion Counter
            if self.current_temp > self.high_threshold or self.current_temp < self.low_threshold:
                self.consecutive_excursions += 1
            else:
                self.consecutive_excursions = 0

            return self.get_state_snapshot()

    def _calculate_mkt(self) -> float:
        """
        Computes the Mean Kinetic Temperature across the sliding window of temperatures.
        Formula:
          MKT = (ΔH / R) / ( -ln( (1/n) * sum( exp(-ΔH / (R * T_K)) ) ) ) - 273.15
        """
        if not self.temp_history:
            return self.current_temp

        n = len(self.temp_history)
        sum_exp = 0.0

        for t in self.temp_history:
            t_kelvin = t + 273.15
            if t_kelvin <= 0:
                t_kelvin = 1.0
            sum_exp += math.exp(-DELTA_H_OVER_R / t_kelvin)

        mean_exp = sum_exp / n
        if mean_exp <= 0.0:
            return self.current_temp

        mkt_kelvin = DELTA_H_OVER_R / (-math.log(mean_exp))
        mkt_celsius = mkt_kelvin - 273.15
        return round(mkt_celsius, 2)

    def get_state_snapshot(self) -> Dict[str, Any]:
        """Returns the full runtime state dictionary."""
        return {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "tick": self.tick_counter,
            "telemetry": {
                "currentTemp": self.current_temp,
                "ambientTemp": self.ambient_temp,
                "speedKmh": self.speed_kmh,
                "shockG": self.shock_g,
                "humidity": self.humidity,
                "powerKw": self.power_kw,
            },
            "controls": {
                "reeferPower": self.reefer_power,
                "coolingMode": self.cooling_mode,
                "doorOpen": self.door_open,
                "fanActive": self.fan_active,
                "targetSetpoint": self.target_setpoint,
                "highThreshold": self.high_threshold,
                "lowThreshold": self.low_threshold,
            },
            "activeFaults": list(self.active_faults),
            "mkt": self.mkt,
            "shelfLifeRemainingHours": self.shelf_life_remaining_hours,
            "consecutiveExcursions": self.consecutive_excursions,
            "isExcursionActive": self.consecutive_excursions >= 2,
            "aiActionHistory": list(self.ai_action_history[-10:]),
            "driverAlerts": list(self.driver_alerts[-10:]),
        }

# Global singleton instance of the twin physics engine
twin_engine = DigitalTwinEngine()
